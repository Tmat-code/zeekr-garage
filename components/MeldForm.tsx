'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { SEVERITIES, SEVERITY_STYLE, ISSUE_CATEGORIES, type Severity, type IssueType } from '@/lib/config';
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
  const erOenske = type === 'oenske';
  const [titel, setTitel] = useState(initialTitle);
  const [beskrivelse, setBeskrivelse] = useState(initialBody);
  const [kategori, setKategori] = useState('');
  const [softwareVersion, setSoftwareVersion] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [phoneOs, setPhoneOs] = useState('');
  const [severity, setSeverity] = useState<Severity>('middel');
  const [valgte, setValgte] = useState<string[]>([]);
  const [fejl, setFejl] = useState('');
  const [busy, setBusy] = useState(false);

  function toggleModel(id: string) {
    setValgte((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    const ting = erOenske ? 'ønsket' : 'fejlen';
    if (titel.trim().length < 5) return setFejl(`Giv ${ting} en kort, tydelig titel.`);
    if (beskrivelse.trim().length < 10) return setFejl(`Beskriv ${ting} lidt mere.`);
    if (valgte.length === 0) return setFejl(`Vælg mindst én model ${erOenske ? 'ønsket gælder' : 'fejlen rammer'}.`);
    if (!kategori) return setFejl('Vælg en kategori - tag "Andet", hvis ingen passer.');
    if (!erOenske && softwareVersion.trim().length < 2)
      return setFejl('Skriv hvilken softwareversion (OTA) du er på - det er vigtigt for bevis på tværs.');

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
      if (e1 || !issue) throw e1 ?? new Error('kunne ikke oprette');

      const { error: e2 } = await sb
        .from('issue_models')
        .insert(valgte.map((model_id) => ({ issue_id: issue.id, model_id })));
      if (e2) throw e2;

      router.push('/');
      router.refresh();
    } catch {
      setFejl('Noget gik galt. Prøv igen.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="kort mt-6 flex flex-col gap-5 p-6">
      {fraForum && (
        <div className="rounded-xl border border-kobber-200 bg-kobber-50 px-4 py-3 text-sm text-grafit-700">
          📌 Oprettet ud fra en forum-tråd - titel og tekst er forudfyldt. Tjek og tilføj model(ler){' '}
          {erOenske ? '' : '+ softwareversion'}, så fejlen bliver struktureret feedback.{' '}
          <a href={fraForum} className="font-medium text-kobber-700 hover:underline">
            Åbn tråden
          </a>
        </div>
      )}
      <div>
        <label htmlFor="titel" className="label">Titel</label>
        <input
          id="titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={erOenske ? 'Trådløst CarPlay' : 'Kortmodul fryser ved opstart i koldt vejr'}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="besk" className="label">Beskrivelse</label>
        <textarea
          id="besk"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          rows={4}
          placeholder={erOenske ? 'Hvad ønsker du, og hvorfor ville det gøre bilen bedre?' : 'Hvad sker der, hvornår, og hvordan genskaber man det?'}
          className="input"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="sw" className="label">
            Softwareversion (OTA){' '}
            {erOenske && <span className="font-normal text-grafit-400">(valgfri)</span>}
          </label>
          <input
            id="sw"
            value={softwareVersion}
            onChange={(e) => setSoftwareVersion(e.target.value)}
            placeholder="fx OS 1.3.0"
            className="input font-mono"
          />
        </div>
        <div>
          <label htmlFor="kat" className="label">Kategori</label>
          <select
            id="kat"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="input"
          >
            <option value="">– vælg kategori –</option>
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!erOenske && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sev" className="label">Alvorlighed</label>
            <select
              id="sev"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="input"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{SEVERITY_STYLE[s].label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Telefon - kun relevant for fejl (CarPlay / Android Auto / app) */}
      {!erOenske && (
        <div className="rounded-xl border border-dashed border-grafit-300 p-4">
          <p className="text-sm font-semibold text-grafit-700">
            Telefon <span className="font-normal text-grafit-400">- valgfrit</span>
          </p>
          <p className="mt-0.5 text-xs text-grafit-500">
            Udfyld kun hvis fejlen handler om telefonen (CarPlay, Android Auto, Bluetooth, appen).
            Det hjælper med at finde mønstre på tværs af telefoner.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pm" className="label">Telefonmodel</label>
              <input
                id="pm"
                value={phoneModel}
                onChange={(e) => setPhoneModel(e.target.value)}
                placeholder="fx iPhone 15 Pro / Samsung S24"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="pos" className="label">Telefonens OS</label>
              <input
                id="pos"
                value={phoneOs}
                onChange={(e) => setPhoneOs(e.target.value)}
                placeholder="fx iOS 18.1 / Android 15"
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <span className="label">{erOenske ? 'Hvilke modeller gælder ønsket?' : 'Hvilke modeller rammer fejlen?'}</span>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => {
            const valgt = valgte.includes(m.id);
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  valgt
                    ? 'border-kobber-500 bg-kobber-50 text-kobber-700'
                    : 'border-grafit-300 bg-white text-grafit-700 hover:border-kobber-400'
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-grafit-400">
          Tag gerne flere - rammer den hele platformen, vægter det tungere.
        </p>
      </div>

      {fejl && <p className="text-sm font-medium text-kobber-700">{fejl}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Sender…' : erOenske ? 'Foreslå ønsket' : 'Meld fejlen'}
        </button>
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-ghost">
            ← Tilbage til søgning
          </button>
        ) : (
          <button type="button" onClick={() => router.push('/')} className="btn-ghost">
            Annullér
          </button>
        )}
      </div>
    </form>
  );
}
