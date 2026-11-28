'use client';

import { useState, useTransition } from 'react';
import { datoTid, relativTid } from '@/lib/i18n/format';
import type { AuditAktoer, AuditHaendelse, AuditSide } from '@/lib/queries-admin';
import { hentAuditSpor, hentAuditSeneste, fortrydHaendelse } from '@/app/admin/audit-actions';

const SIDE = 50;

// Felter der ikke er en menneskelig aendring (vises ikke i diff'en).
const STOEJ = new Set([
  'updated_at', 'updated_by', 'created_at', 'last_post_at',
  'reply_count', 'view_count', 'tsv',
]);

// Laesbare tabel-navne.
const TABEL_LABEL: Record<string, string> = {
  issues: 'Feedback',
  forum_threads: 'Forum-tråd',
  forum_posts: 'Forum-indlæg',
  forum_categories: 'Forum-kategori',
  software_updates: 'OTA-opslag',
  software_update_models: 'OTA-modeller',
  links: 'Link',
  link_groups: 'Link-gruppe',
  profiles: 'Profil / rolle',
  forum_reports: 'Rapport',
  site_announcement: 'Forside-besked',
  messages: 'Besked',
  issue_sammenlaegninger: 'Feedback-sammenlægning',
};

const OP_LABEL: Record<string, { tekst: string; klasse: string }> = {
  INSERT: { tekst: 'Oprettet', klasse: 'bg-grafit-100 text-grafit-600' },
  UPDATE: { tekst: 'Ændret', klasse: 'bg-kobber-100 text-kobber-800' },
  DELETE: { tekst: 'Slettet', klasse: 'bg-grafit-800 text-white' },
};

function kort(v: any): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'boolean') return v ? 'ja' : 'nej';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
}

// Aendrede felter (old -> new), stoej fjernet.
function diffFelter(h: AuditHaendelse): { felt: string; fra: any; til: any }[] {
  const o = h.oldData ?? {};
  const n = h.newData ?? {};
  const keys = new Set([...Object.keys(o), ...Object.keys(n)]);
  const ud: { felt: string; fra: any; til: any }[] = [];
  for (const k of keys) {
    if (STOEJ.has(k)) continue;
    const fra = (o as any)[k];
    const til = (n as any)[k];
    if (JSON.stringify(fra) === JSON.stringify(til)) continue;
    ud.push({ felt: k, fra, til });
  }
  return ud;
}

function HaendelseRaekke({
  h,
  visAktoer,
  onFortrudt,
}: {
  h: AuditHaendelse;
  visAktoer?: boolean;
  onFortrudt: () => void;
}) {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [kvit, setKvit] = useState<string | null>(null);
  const op = OP_LABEL[h.op] ?? { tekst: h.op, klasse: 'bg-grafit-100 text-grafit-600' };
  const felter = diffFelter(h);

  function fortryd() {
    if (!confirm('Fortryd denne ændring? OLD-værdierne skrives tilbage.')) return;
    setFejl(null);
    setKvit(null);
    start(async () => {
      try {
        const r = await fortrydHaendelse(h.id);
        setKvit(r);
        onFortrudt();
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke fortryde.');
      }
    });
  }

  return (
    <div className={`rounded-xl border border-grafit-100 px-3 py-2.5 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${op.klasse}`}>{op.tekst}</span>
        <span className="font-medium text-grafit-900">
          {TABEL_LABEL[h.tabel] ?? h.tabel}
        </span>
        {visAktoer && h.aktoerNavn && (
          <span className="text-xs text-grafit-500">· {h.aktoerNavn}</span>
        )}
        <span className="text-xs text-grafit-400" title={datoTid(h.createdAt)}>
          · {relativTid(h.createdAt)}
        </span>
        {h.raekkeId && (
          <span className="text-[11px] text-grafit-300">#{h.raekkeId.slice(0, 8)}</span>
        )}
      </div>

      {/* Diff */}
      {h.op === 'UPDATE' && felter.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {felter.map((f) => (
            <li key={f.felt} className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-mono text-xs text-grafit-500">{f.felt}:</span>
              <span className="text-grafit-400 line-through">{kort(f.fra)}</span>
              <span aria-hidden className="text-grafit-400">→</span>
              <span className="text-grafit-900">{kort(f.til)}</span>
            </li>
          ))}
        </ul>
      )}
      {h.op === 'INSERT' && (
        <p className="mt-1 text-xs text-grafit-500">
          Ny række oprettet{felter[0] ? ` (${felter.find((f) => f.felt !== 'id')?.felt ?? 'id'}: ${kort(
            (h.newData ?? {})[felter.find((f) => f.felt !== 'id')?.felt ?? 'id'],
          )})` : ''}.
        </p>
      )}
      {h.op === 'DELETE' && (
        <p className="mt-1 text-xs text-grafit-500">Rækken blev slettet.</p>
      )}

      {/* Handling */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {h.kanFortrydes ? (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-600 hover:border-kobber-500 hover:text-kobber-700"
            disabled={pending}
            onClick={fortryd}
          >
            ↩ Fortryd
          </button>
        ) : (
          <span className="text-xs text-grafit-400">
            {h.op === 'UPDATE' ? 'Kan ikke fortrydes automatisk' : 'Fortrydes ikke her'}
          </span>
        )}
        {kvit && <span className="text-xs text-loest">{kvit}</span>}
        {fejl && <span className="text-xs text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}

export default function AuditFlade({
  aktoerer,
  seneste,
}: {
  aktoerer: AuditAktoer[];
  seneste: AuditSide;
}) {
  const [visning, setVisning] = useState<'personer' | 'seneste'>('personer');

  // Aktoer-linse
  const [valgt, setValgt] = useState<AuditAktoer | null>(null);
  const [spor, setSpor] = useState<AuditHaendelse[]>([]);
  const [sporTotal, setSporTotal] = useState(0);
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);

  // Seneste-linse (global)
  const [stroem, setStroem] = useState<AuditHaendelse[]>(seneste.haendelser);
  const [stroemTotal, setStroemTotal] = useState(seneste.total);

  function vaelg(a: AuditAktoer) {
    setValgt(a);
    setFejl(null);
    start(async () => {
      try {
        const r = await hentAuditSpor(a.aktoer, SIDE, 0);
        setSpor(r.haendelser);
        setSporTotal(r.total);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente spor.');
      }
    });
  }

  function genindlaesSpor() {
    if (!valgt) return;
    start(async () => {
      const r = await hentAuditSpor(valgt.aktoer, Math.max(SIDE, spor.length), 0);
      setSpor(r.haendelser);
      setSporTotal(r.total);
    });
  }

  function mereSpor() {
    if (!valgt) return;
    start(async () => {
      const r = await hentAuditSpor(valgt.aktoer, SIDE, spor.length);
      setSpor((cur) => [...cur, ...r.haendelser]);
      setSporTotal(r.total);
    });
  }

  function genindlaesStroem() {
    start(async () => {
      const r = await hentAuditSeneste(Math.max(SIDE, stroem.length), 0);
      setStroem(r.haendelser);
      setStroemTotal(r.total);
    });
  }

  function mereStroem() {
    start(async () => {
      const r = await hentAuditSeneste(SIDE, stroem.length);
      setStroem((cur) => [...cur, ...r.haendelser]);
      setStroemTotal(r.total);
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-grafit-500">
        Fuldt spor over hvad stab (moderatorer/admins) har ændret - med mulighed for at
        fortryde en sikker delmængde. Kun du som superadmin kan se denne side.
      </p>

      {/* Linse-skift */}
      <div className="flex gap-1.5">
        {(['personer', 'seneste'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVisning(v)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              visning === v
                ? 'border-kobber-500 bg-kobber-50 text-kobber-800'
                : 'border-grafit-200 bg-white text-grafit-700 hover:border-kobber-500'
            }`}
          >
            {v === 'personer' ? '👤 Pr. person' : '🕒 Seneste'}
          </button>
        ))}
      </div>

      {visning === 'personer' && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,15rem)_1fr] md:items-start">
          {/* Aktoer-vaelger */}
          <div className="space-y-1.5">
            {aktoerer.length === 0 ? (
              <p className="text-sm text-grafit-500">Ingen stab-handlinger logget endnu.</p>
            ) : (
              aktoerer.map((a) => (
                <button
                  key={a.aktoer ?? 'ukendt'}
                  onClick={() => vaelg(a)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
                    valgt?.aktoer === a.aktoer
                      ? 'border-kobber-500 bg-kobber-50'
                      : 'border-grafit-100 bg-white hover:border-kobber-300'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-grafit-900">{a.navn}</span>
                    <span className="block text-xs text-grafit-400">
                      {a.rolle ?? 'ingen rolle'}
                      {a.seneste ? ` · ${relativTid(a.seneste)}` : ''}
                    </span>
                  </span>
                  <span className="chip bg-grafit-100 text-grafit-600">{a.antal}</span>
                </button>
              ))
            )}
          </div>

          {/* Spor */}
          <div className="space-y-2">
            {!valgt ? (
              <p className="text-sm text-grafit-400">Vælg en person for at se deres spor.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grafit-900">
                    {valgt.navn}
                    <span className="ml-2 font-normal text-grafit-400">
                      viser {spor.length} af {sporTotal}
                    </span>
                  </h3>
                </div>
                {fejl && <p className="text-sm text-kobber-700">{fejl}</p>}
                {spor.map((h) => (
                  <HaendelseRaekke key={h.id} h={h} onFortrudt={genindlaesSpor} />
                ))}
                {spor.length < sporTotal && (
                  <button
                    className="btn-ghost !py-1.5 text-sm"
                    disabled={pending}
                    onClick={mereSpor}
                  >
                    Vis flere
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {visning === 'seneste' && (
        <div className="space-y-2">
          <p className="text-sm text-grafit-400">Viser {stroem.length} af {stroemTotal}</p>
          {stroem.map((h) => (
            <HaendelseRaekke key={h.id} h={h} visAktoer onFortrudt={genindlaesStroem} />
          ))}
          {stroem.length < stroemTotal && (
            <button className="btn-ghost !py-1.5 text-sm" disabled={pending} onClick={mereStroem}>
              Vis flere
            </button>
          )}
          {stroem.length === 0 && (
            <p className="text-sm text-grafit-500">Ingen stab-handlinger logget endnu.</p>
          )}
        </div>
      )}
    </div>
  );
}
