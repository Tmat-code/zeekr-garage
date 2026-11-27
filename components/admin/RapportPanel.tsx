'use client';

import { useState, useTransition } from 'react';
import {
  danRapport,
  fortrydMarkering,
  testOversaettelse,
  forberedOversaettelse,
} from '@/app/admin/rapport/actions';
import type { OversaetStatus } from '@/lib/oversaet';

function motorNavn(motor: OversaetStatus['motor']): string {
  return motor === 'nllb' ? 'NLLB-600M' : motor === 'libretranslate' ? 'LibreTranslate' : 'oversætter';
}

export default function RapportPanel({ erAdmin }: { erAdmin: boolean }) {
  const [top, setTop] = useState('20');
  const [type, setType] = useState('fejl');
  const [sprog, setSprog] = useState('da');
  const [kommentarer, setKommentarer] = useState(false);
  const [billeder, setBilleder] = useState(false);
  const [kunAendrede, setKunAendrede] = useState(false);
  const [besked, setBesked] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [oversat, setOversat] = useState<OversaetStatus | null>(null);
  const [forb, setForb] = useState<{ gjort: number; total: number } | null>(null);
  const [pending, start] = useTransition();

  function eksportUrl(format: 'pdf' | 'csv'): string {
    const p = new URLSearchParams({
      top,
      type,
      sprog,
      kunAendrede: kunAendrede ? '1' : '0',
      kommentarer: kommentarer ? '1' : '0',
      billeder: billeder ? '1' : '0',
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

  // Opvarmning (trin 2.7): kald server-action'en i en løkke, ét bundet vindue ad
  // gangen, og vis den globale fremgang undervejs. Hvert kald afsluttes under
  // Cloudflares 100s; løkken stopper når gjort >= total (eller defensivt hvis et kald
  // ikke rykker). Et afbrud (luk fanen) mister kun det igangværende vindue - cachen
  // bærer resten, så en ny kørsel samler op hvor den slap.
  function forberedOpvarmning() {
    koer(async () => {
      setForb({ gjort: 0, total: 0 });
      let offset = 0;
      for (let vagt = 0; vagt < 100000; vagt++) {
        const r = await forberedOversaettelse(type, kunAendrede, top, sprog, offset, kommentarer);
        setForb({ gjort: r.gjort, total: r.total });
        if (r.gjort >= r.total || r.gjort <= offset) break;
        offset = r.gjort;
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
          <input type="checkbox" className="mt-0.5" checked={billeder} onChange={(e) => setBilleder(e.target.checked)} />
          <span>
            Inkludér billeder
            <span className="block text-xs text-grafit-400">
              Tager ejernes foto-bevis med (maks 2 pr. melding). PDF&apos;en indlejrer billederne, CSV&apos;en får en kolonne med klikbare URL&apos;er. Gør PDF&apos;en større - især ved Alle.
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

      {/* Forbered oversættelse (opvarmning, trin 2.7) - moderator + admin */}
      <div className="mt-5 rounded-xl border border-grafit-200 bg-grafit-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-secondary !py-2 text-sm"
            disabled={pending || sprog === 'da'}
            onClick={forberedOpvarmning}
          >
            🔥 Forbered oversættelse
          </button>
          <p className="min-w-[14rem] flex-1 text-xs text-grafit-500">
            Varmer oversættelses-cachen for det valgte udvalg i baggrunden, så en stor rapport (fx
            første gang efter et deploy) ikke rammer eksport-timeouten. Kør den før du henter
            rapporten.
          </p>
        </div>

        {sprog === 'da' ? (
          <p className="mt-2 text-xs text-grafit-400">
            Dansk rapport bruger originalteksten - ingen opvarmning nødvendig.
          </p>
        ) : forb ? (
          forb.total === 0 ? (
            <p className="mt-2 text-sm text-grafit-500">Intet at forberede i det valgte udvalg.</p>
          ) : forb.gjort >= forb.total ? (
            <p className="mt-2 text-sm text-loest">
              Oversættelse forberedt - {forb.total}/{forb.total} klar. Rapporten henter nu fra cache.
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-grafit-700">
                Forbereder oversættelse... {forb.gjort}/{forb.total}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-grafit-100">
                <div
                  className="h-full bg-kobber-500 transition-all"
                  style={{ width: `${Math.round((forb.gjort / forb.total) * 100)}%` }}
                />
              </div>
            </div>
          )
        ) : null}
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
              <span className="text-grafit-500">Ingen oversætter-motor konfigureret (hverken NLLB_URL eller LIBRETRANSLATE_URL) - rapporter er kun på dansk.</span>
            ) : oversat.ok ? (
              <span className="text-loest">OK · {motorNavn(oversat.motor)} ({oversat.vaert}): &quot;{oversat.prove?.kilde}&quot; → &quot;{oversat.prove?.resultat}&quot;</span>
            ) : (
              <span className="text-kobber-700">Kunne ikke nå {motorNavn(oversat.motor)} ({oversat.vaert}): {oversat.fejl}</span>
            )}
          </span>
        )}
      </div>

      {oversat?.svensk && oversat.svensk.length > 0 && (
        <div className="mt-3 rounded-xl border border-grafit-200 bg-grafit-50 p-3 text-xs text-grafit-700" data-testid="svensk-maaling">
          <p className="font-semibold text-grafit-900">Svensk kilde (U3b-måling)</p>
          <ul className="mt-2 space-y-2">
            {oversat.svensk.map((m, i) => (
              <li key={i} className="rounded-lg border border-grafit-200 bg-white p-2">
                <p className="font-medium">&quot;{m.kilde}&quot;</p>
                <p>Heuristik: {m.heuristik} · LibreTranslate detect: {m.ltDetekt ?? '-'}</p>
                {m.fejl ? (
                  <p className="text-kobber-700">Fejl: {m.fejl}</p>
                ) : (
                  <>
                    <p><span className="text-grafit-500">Gammel vej (da-sti):</span> {m.gammelEn}</p>
                    <p><span className="text-grafit-500">Ny vej sv-&gt;en:</span> {m.nyEn}</p>
                    <p><span className="text-grafit-500">Ny vej sv-&gt;da:</span> {m.nyDa}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {besked && <p className="mt-2 text-sm text-loest">{besked}</p>}
      {fejl && <p className="mt-2 text-sm text-kobber-700">{fejl}</p>}
    </section>
  );
}
