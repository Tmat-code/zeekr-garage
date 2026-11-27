'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { SEVERITIES, ISSUE_CATEGORY_SLUGS, type Severity, type IssueType } from '@/lib/config';
import { useOrdbog } from '@/lib/i18n/klient';
import { efterMeldingOprettet } from '@/app/meld/actions';
import { MELD_BUCKET, MELD_MAKS_BILLEDER, meldBilledeUrl } from '@/lib/billeder';
import BilledeUpload from '@/components/forum/BilledeUpload';
import type { Model } from '@/lib/types';

export default function MeldForm({
  models,
  type = 'fejl',
  initialTitle = '',
  initialBody = '',
  fraForum,
  onBack,
}: {
  models: Model[];
  type?: IssueType;
  initialTitle?: string;
  initialBody?: string;
  fraForum?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const t = useOrdbog();
  const m = t.meld;
  const erOenske = type === 'oenske';
  const [titel, setTitel] = useState(initialTitle);
  const [beskrivelse, setBeskrivelse] = useState(initialBody);
  const [kategori, setKategori] = useState('');
  const [softwareVersion, setSoftwareVersion] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [phoneOs, setPhoneOs] = useState('');
  const [severity, setSeverity] = useState<Severity>('middel');
  const [valgte, setValgte] = useState<string[]>([]);
  const [billeder, setBilleder] = useState<string[]>([]);
  const [fejl, setFejl] = useState('');
  const [busy, setBusy] = useState(false);

  function toggleModel(id: string) {
    setValgte((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    if (titel.trim().length < 5) return setFejl(m.fejlTitel(erOenske));
    if (beskrivelse.trim().length < 10) return setFejl(m.fejlBeskriv(erOenske));
    if (valgte.length === 0) return setFejl(m.fejlModel(erOenske));
    if (!kategori) return setFejl(m.fejlKategori);
    if (!erOenske && softwareVersion.trim().length < 2) return setFejl(m.fejlSoftware);

    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        router.push('/login?naeste=/meld');
        return;
      }
      const { data: issue, error: e1 } = await sb
        .from('issues')
        .insert({
          type,
          title: titel.trim(),
          description: beskrivelse.trim(),
          category: kategori.trim() || null,
          software_version: softwareVersion.trim() || null,
          phone_model: phoneModel.trim() || null,
          phone_os: phoneOs.trim() || null,
          severity,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (e1 || !issue) throw e1 ?? new Error('insert');

      const { error: e2 } = await sb
        .from('issue_models')
        .insert(valgte.map((model_id) => ({ issue_id: issue.id, model_id })));
      if (e2) throw e2;

      // Kobl vedhæftede billeder (foto-bevis) til meldingen. Kun paths i egen
      // mappe (<user_id>/...) - RLS tjekker også ejerskab. Best-effort: en fejl
      // her må ikke tabe selve meldingen (billederne ryddes evt. senere, P9).
      const rene = billeder
        .filter((p) => typeof p === 'string' && p.startsWith(`${user.id}/`))
        .slice(0, MELD_MAKS_BILLEDER);
      if (rene.length > 0) {
        await sb
          .from('issue_images')
          .insert(rene.map((path, i) => ({ issue_id: issue.id, path, display_order: i })));
      }

      // U3b: forfin kildesproget (LibreTranslate ved usikker heuristik) og læg
      // titlen i baggrunds-oversættelsen. Best-effort - må aldrig tabe meldingen.
      try {
        await efterMeldingOprettet(issue.id);
      } catch {
        /* ignoreres */
      }

      router.push('/');
      router.refresh();
    } catch {
      setFejl(t.faellesFejl.nogetGikGalt);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="kort mt-6 flex flex-col gap-5 p-6">
      {fraForum && (
        <div className="rounded-xl border border-kobber-200 bg-kobber-50 px-4 py-3 text-sm text-grafit-700">
          {m.fraForum(erOenske)}{' '}
          <a href={fraForum} className="font-medium text-kobber-700 hover:underline">
            {m.aabnTraaden}
          </a>
        </div>
      )}
      <div>
        <label htmlFor="titel" className="label">{m.titelLabel}</label>
        <input
          id="titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={erOenske ? m.titelPhOenske : m.titelPhFejl}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="besk" className="label">{m.beskrivelse}</label>
        <textarea
          id="besk"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          rows={4}
          placeholder={erOenske ? m.beskrPhOenske : m.beskrPhFejl}
          className="input"
        />
        <p className="mt-1.5 text-xs text-grafit-400">{m.sprogNote}</p>
      </div>

      <div>
        <label className="label">
          {m.billeder}{' '}
          <span className="font-normal text-grafit-400">{t.faellesFejl.valgfrit}</span>
        </label>
        <p className="mb-2 text-xs text-grafit-500">
          {erOenske ? m.billedHjaelpOenske : m.billedHjaelpFejl}
        </p>
        <BilledeUpload bucket={MELD_BUCKET} urlFor={meldBilledeUrl} maksAntal={MELD_MAKS_BILLEDER} onChange={setBilleder} disabled={busy} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="sw" className="label">
            {m.software}{' '}
            {erOenske && <span className="font-normal text-grafit-400">{t.faellesFejl.valgfri}</span>}
          </label>
          <input
            id="sw"
            value={softwareVersion}
            onChange={(e) => setSoftwareVersion(e.target.value)}
            placeholder={m.softwarePh}
            className="input font-mono"
          />
        </div>
        <div>
          <label htmlFor="kat" className="label">{m.kategori}</label>
          <select
            id="kat"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="input"
          >
            <option value="">{m.vaelgKategori}</option>
            {ISSUE_CATEGORY_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {t.config.kategori[slug]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!erOenske && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sev" className="label">{m.alvor}</label>
            <select
              id="sev"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="input"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{t.config.alvor[s]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Telefon - kun relevant for fejl (CarPlay / Android Auto / app) */}
      {!erOenske && (
        <div className="rounded-xl border border-dashed border-grafit-300 p-4">
          <p className="text-sm font-semibold text-grafit-700">
            {m.telefon} <span className="font-normal text-grafit-400">{m.telefonValgfrit}</span>
          </p>
          <p className="mt-0.5 text-xs text-grafit-500">{m.telefonHjaelp}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pm" className="label">{m.telefonModel}</label>
              <input
                id="pm"
                value={phoneModel}
                onChange={(e) => setPhoneModel(e.target.value)}
                placeholder={m.telefonModelPh}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="pos" className="label">{m.telefonOs}</label>
              <input
                id="pos"
                value={phoneOs}
                onChange={(e) => setPhoneOs(e.target.value)}
                placeholder={m.telefonOsPh}
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <span className="label">{m.modeller(erOenske)}</span>
        <div className="flex flex-wrap gap-2">
          {models.map((mo) => {
            const valgt = valgte.includes(mo.id);
            return (
              <button
                type="button"
                key={mo.id}
                onClick={() => toggleModel(mo.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  valgt
                    ? 'border-kobber-500 bg-kobber-50 text-kobber-700'
                    : 'border-grafit-300 bg-white text-grafit-700 hover:border-kobber-400'
                }`}
              >
                {mo.name}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-grafit-400">
          {m.modellerHjaelp}
        </p>
      </div>

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? m.sender : m.submit(erOenske)}
        </button>
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-ghost">
            {m.tilbageSoeg}
          </button>
        ) : (
          <button type="button" onClick={() => router.push('/')} className="btn-ghost">
            {t.faellesFejl.annuller}
          </button>
        )}
      </div>
    </form>
  );
}
