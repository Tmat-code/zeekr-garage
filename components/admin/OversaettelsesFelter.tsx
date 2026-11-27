'use client';

import { useState } from 'react';
import { INDHOLD_SPROG, type IndholdSprog, type Oversaettelser } from '@/lib/i18n/indhold';

// U1b: genbrugelige felter pr. sprog til DB-indhold (links nu, U7 kategorier/
// regler/forside-besked senere). Dansk står i editorens egne felter og er altid
// kilden; her skrives svensk + engelsk. Tomt felt = dansk fallback på siden.
// Admin-flade => editor-teksterne er bevidst danske (design 27-11, valg 2).

const SPROG_LABEL: Record<IndholdSprog, string> = { sv: 'Svensk', en: 'Engelsk' };

export type OversaetFelt<F extends string> = {
  felt: F;
  label: string;
  dansk: string; // vises som placeholder = det læseren ser hvis feltet er tomt
};

export default function OversaettelsesFelter<F extends string>({
  felter,
  vaerdi,
  onChange,
  startAaben = false,
}: {
  felter: OversaetFelt<F>[];
  vaerdi: Oversaettelser<F>;
  onChange: (v: Oversaettelser<F>) => void;
  startAaben?: boolean;
}) {
  const [aaben, setAaben] = useState(startAaben);
  // Kun felter med en dansk tekst kan oversættes (fx et link uden kilde).
  const aktive = felter.filter((f) => f.dansk.trim());
  const total = aktive.length * INDHOLD_SPROG.length;
  const udfyldt = INDHOLD_SPROG.reduce(
    (n, s) => n + aktive.filter((f) => (vaerdi[s]?.[f.felt] ?? '').trim()).length,
    0,
  );

  const saet = (s: IndholdSprog, f: F, v: string) => {
    const sprogObj = { ...(vaerdi[s] ?? {}) } as Partial<Record<F, string>>;
    if (v) sprogObj[f] = v;
    else delete sprogObj[f];
    const ny: Oversaettelser<F> = { ...vaerdi, [s]: sprogObj };
    onChange(ny);
  };

  if (aktive.length === 0) return null;

  return (
    <div className="rounded-lg border border-grafit-200 bg-grafit-50">
      <button
        type="button"
        onClick={() => setAaben(!aaben)}
        aria-expanded={aaben}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-grafit-600 hover:text-grafit-900"
      >
        <span>
          🌐 Svensk + engelsk{' '}
          <span className={udfyldt === total ? 'text-grafit-400' : 'font-medium text-kobber-700'}>
            ({udfyldt}/{total} udfyldt)
          </span>
        </span>
        <span aria-hidden="true">{aaben ? '▾' : '▸'}</span>
      </button>
      {aaben && (
        <div className="space-y-3 border-t border-grafit-200 px-3 pb-3 pt-2">
          {INDHOLD_SPROG.map((s) => (
            <div key={s}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-grafit-400">
                {SPROG_LABEL[s]}
              </div>
              <div className="space-y-1.5">
                {aktive.map((f) => (
                  <label key={f.felt} className="block">
                    <span className="sr-only">
                      {f.label} ({SPROG_LABEL[s].toLowerCase()})
                    </span>
                    <input
                      className="input !py-1.5 text-sm"
                      value={vaerdi[s]?.[f.felt] ?? ''}
                      maxLength={300}
                      onChange={(e) => saet(s, f.felt, e.target.value)}
                      placeholder={`${f.label}: ${f.dansk}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-grafit-400">Tomt felt = den danske tekst vises.</p>
        </div>
      )}
    </div>
  );
}
