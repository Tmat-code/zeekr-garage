'use client';

import { useState, useTransition } from 'react';
import { danRapport, fortrydMarkering, testOversaettelse } from '@/app/admin/rapport/actions';
import type { OversaetStatus } from '@/lib/oversaet';

export default function RapportPanel({ erAdmin }: { erAdmin: boolean }) {
  const [top, setTop] = useState('20');
  const [type, setType] = useState('fejl');
  const [sprog, setSprog] = useState('da');
  const [kommentarer, setKommentarer] = useState(false);
  const [kunAendrede, setKunAendrede] = useState(false);
  const [besked, setBesked] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [oversat, setOversat] = useState<OversaetStatus | null>(null);
  const [pending, start] = useTransition();

  function eksportUrl(format: 'pdf' | 'csv'): string {
    const p = new URLSearchParams({
      top,
      type,
      sprog,
      kunAendrede: kunAendrede ? '1' : '0',
      kommentarer: kommentarer ? '1' : '0',
    });
    return `/api/admin/rapport/${format}?${p.toString()}`;
  }

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    setBesked(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>📮</span>
        <h2 className="text-lg font-semibold text-grafit-900">Eksport til Zeekr</h2>
      </div>
      <p className="mb-4 text-sm text-grafit-500">
        Forhåndsvisning henter en rapport uden at ændre noget. Den officielle rapport (nederst, kun
        admin) markerer samtidig udvalget som sendt til Zeekr.
      </p>

      {/* Kontroller */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Antal</label>
          <select className="input !w-auto" value={top} onChange={(e) => setTop(e.target.value)}>
            <option value="20">Top 20</option>
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
            <option value="alle">Alle</option>
          </select>
        </div>
        <div>
          <label className="label">Indhold</label>
          <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="fejl">Fejl</option>
            <option value="oenske">Ønsker</option>
            <option value="begge">Begge</option>
          </select>
        </div>
        <div>
          <label className="label">Sprog</label>
          <select className="input !w-auto" value={sprog} onChange={(e) => setSprog(e.target.value)}>
            <option value="da">Dansk</option>
            <option value="en">English</option>
            <option value="sv">Svenska</option>
          </select>
        </div>
        <a href={eksportUrl('pdf')} target="_blank" rel="noreferrer" className="btn-secondary !py-2.5 text-sm">
          Forhåndsvis PDF
        </a>
        <a href={eksportUrl('csv')} target="_blank" rel="noreferrer" className="btn-secondary !py-2.5 text-sm">
          Forhåndsvis CSV
        </a>
      </div>

      <div className="mt-4 space-y-2">
        <label className="flex items-start gap-2 text-sm text-grafit-700">
          <input type="checkbox" className="mt-0.5" checked={kommentarer} onChange={(e) => setKommentarer(e.target.checked)} />
          <span>
            Inkludér kommentarer
            <span className="block text-xs text-grafit-400">
              Tager ejernes kommentarer med (den markerede løsning udelades - Zeekr skal have fejlen, ikke workaround&apos;en).
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-grafit-700">
          <input type="checkbox" className="mt-0.5" checked={kunAendrede} onChange={(e) => setKunAendrede(e.target.checked)} />
          <span>
            Kun nye + eskalerende
            <span className="block text-xs text-grafit-400">
              Tager kun med, der aldrig er sendt før, eller har fået flere stemmer siden sidst. Viser NY eller +N siden sidst.
            </span>
          </span>
        </label>
      </div>

      {/* Officiel rapport (kun admin) */}
      {erAdmin && (
        <div className="mt-5 rounded-xl border border-kobber-300 bg-kobber-50 p-4">
          <p className="font-semibold text-grafit-900">📮 Dan Zeekr-rapport (officiel - markerer som sendt)</p>
          <p className="mt-0.5 text-sm text-grafit-600">
            Markerer hele udvalget ovenfor som sendt til Zeekr i ét hug. Gør det kun, når du faktisk sender rapporten nu.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn-primary !py-2 text-sm"
              disabled={pending}
              onClick={() =>
                koer(async () => {
                  if (!confirm('Markér hele det valgte udvalg som sendt til Zeekr nu?')) return;
                  const n = await danRapport(type, kunAendrede, top);
                  setBesked(`Markerede ${n} ${n === 1 ? 'melding' : 'meldinger'} som sendt.`);
                })
              }
            >
              📮 Dan Zeekr-rapport…
            </button>
            <button
              className="btn-ghost !py-2 text-sm"
              disabled={pending}
              onClick={() =>
                koer(async () => {
                  const n = await fortrydMarkering();
                  setBesked(n > 0 ? `Fortrød markering (${n} meldinger rullet tilbage).` : 'Der var intet at fortryde.');
                })
              }
            >
              ↩︎ Fortryd sidste
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="btn-ghost !py-2 text-sm"
          disabled={pending}
          onClick={() =>
            koer(async () => {
              setOversat(await testOversaettelse());
            })
          }
        >
          🔍 Test oversættelse
        </button>
        {oversat && (
          <span className="text-sm">
            {!oversat.konfigureret ? (
              <span className="text-grafit-500">LibreTranslate er ikke konfigureret (LIBRETRANSLATE_URL mangler) - rapporter er kun på dansk.</span>
            ) : oversat.ok ? (
              <span className="text-loest">OK ({oversat.vaert}): &quot;{oversat.prove?.kilde}&quot; → &quot;{oversat.prove?.resultat}&quot;</span>
            ) : (
              <span className="text-kobber-700">Kunne ikke nå LibreTranslate ({oversat.vaert}): {oversat.fejl}</span>
            )}
          </span>
        )}
      </div>

      {besked && <p className="mt-2 text-sm text-loest">{besked}</p>}
      {fejl && <p className="mt-2 text-sm text-kobber-700">{fejl}</p>}
    </section>
  );
}
