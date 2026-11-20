'use client';

import { useState, useTransition } from 'react';
import { taelBekraeftelserFoer, fjernBekraeftelserFoer } from '@/app/admin/actions';

function iDag(): string {
  return new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd, lokal tid
}

export default function OprydningPanel() {
  const [dato, setDato] = useState(iDag());
  const [antal, setAntal] = useState<number | null>(null);
  const [resultat, setResultat] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function visAntal() {
    setFejl(null);
    setResultat(null);
    setAntal(null);
    start(async () => {
      try {
        setAntal(await taelBekraeftelserFoer(dato));
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke tælle.');
      }
    });
  }

  function fjern() {
    setFejl(null);
    start(async () => {
      try {
        const n = await fjernBekraeftelserFoer(dato);
        setResultat(`Fjernede ${n} ${n === 1 ? 'stemme' : 'stemmer'}.`);
        setAntal(null);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke slette.');
      }
    });
  }

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>🧹</span>
        <h2 className="text-lg font-semibold text-grafit-900">Oprydning</h2>
      </div>
      <p className="mb-3 text-sm text-grafit-500">
        Fjern &quot;mig med&quot;-stemmer fra før en dato — fx test-klik fra før lanceringen. Viser
        antal først; sletning retter stemmetallene og <strong>kan ikke fortrydes</strong>.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Fjern stemmer før</label>
          <input
            type="date"
            className="input !w-auto"
            value={dato}
            onChange={(e) => {
              setDato(e.target.value);
              setAntal(null);
              setResultat(null);
            }}
          />
        </div>
        <button className="btn-ghost !py-2 text-sm" disabled={pending} onClick={visAntal}>
          Vis antal
        </button>

        {antal !== null && (
          <>
            <span className="text-sm text-grafit-600">
              {antal} {antal === 1 ? 'stemme' : 'stemmer'} før {dato}.
            </span>
            {antal > 0 && (
              <button
                className="rounded-lg bg-kobber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-kobber-700"
                disabled={pending}
                onClick={fjern}
              >
                Fjern {antal} {antal === 1 ? 'stemme' : 'stemmer'}
              </button>
            )}
          </>
        )}
      </div>

      {resultat && <p className="mt-2 text-sm text-loest">{resultat}</p>}
      {fejl && <p className="mt-2 text-sm text-kobber-700">{fejl}</p>}
    </section>
  );
}
