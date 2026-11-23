'use client';

import { useState, useTransition } from 'react';
import { taelForaeldreloeseFiler, rydForaeldreloeseFiler } from '@/app/admin/actions';

function ord(n: number): string {
  return n === 1 ? 'fil' : 'filer';
}

type OprydTal = { forum: number; meld: number; besked: number };

export default function StorageOprydningPanel() {
  const [antal, setAntal] = useState<OprydTal | null>(null);
  const [resultat, setResultat] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function visAntal() {
    setFejl(null);
    setResultat(null);
    setAntal(null);
    start(async () => {
      try {
        setAntal(await taelForaeldreloeseFiler());
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke tælle.');
      }
    });
  }

  function ryd() {
    setFejl(null);
    start(async () => {
      try {
        const r = await rydForaeldreloeseFiler();
        const i = r.forum + r.meld + r.besked;
        setResultat(
          `Fjernede ${i} ${ord(i)} (forum: ${r.forum}, meld: ${r.meld}, besked: ${r.besked}).`,
        );
        setAntal(null);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke rydde.');
      }
    });
  }

  const ialt = antal ? antal.forum + antal.meld + antal.besked : 0;

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden>🗂️</span>
        <h2 className="text-lg font-semibold text-grafit-900">Forældreløse billed-filer</h2>
      </div>
      <p className="mb-3 text-sm text-grafit-500">
        Billed-filer uden reference - typisk uploads der blev fortrudt i skrive-/redigér-boksen,
        eller rester fra slettede meldinger. Dækker forum-, meld- og besked-billeder. Filer yngre end
        et døgn spares (en upload kan stadig være på vej). Viser antal først; sletning{' '}
        <strong>kan ikke fortrydes</strong>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-ghost !py-2 text-sm" disabled={pending} onClick={visAntal}>
          Vis antal
        </button>

        {antal !== null && (
          <>
            <span className="text-sm text-grafit-600">
              {ialt} {ord(ialt)} (forum: {antal.forum}, meld: {antal.meld}, besked: {antal.besked}).
            </span>
            {ialt > 0 && (
              <button
                className="rounded-lg bg-kobber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-kobber-700"
                disabled={pending}
                onClick={ryd}
              >
                Ryd {ialt} {ord(ialt)}
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
