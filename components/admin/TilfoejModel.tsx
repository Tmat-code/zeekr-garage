'use client';

import { useState, useTransition } from 'react';
import { opretModel } from '@/app/admin/forum-actions';

// De kendte platforme (jf. lineup). "Anden" åbner et fritekstfelt, så en
// fremtidig platform ikke er spærret - men de almindelige vælges uden tastefejl
// (platform-feltet driver "fejl rammer hele PMA2+-platformen"-grupperingen).
const KENDTE_PLATFORME = ['SEA-R', 'PMA2+', 'SEA1/SEA2'] as const;
const ANDEN = '__anden__';

export default function TilfoejModel() {
  const [aaben, setAaben] = useState(false);
  const [navn, setNavn] = useState('');
  const [platformValg, setPlatformValg] = useState<string>(KENDTE_PLATFORME[0]);
  const [platformFri, setPlatformFri] = useState('');
  const [varianter, setVarianter] = useState<string[]>(['']);
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [ok, setOk] = useState<{ slug: string } | null>(null);

  const platform = platformValg === ANDEN ? platformFri : platformValg;

  function nulstil() {
    setNavn('');
    setPlatformValg(KENDTE_PLATFORME[0]);
    setPlatformFri('');
    setVarianter(['']);
    setFejl(null);
  }

  function saetVariant(i: number, v: string) {
    setVarianter((xs) => xs.map((x, j) => (j === i ? v : x)));
  }
  function tilfoejVariant() {
    setVarianter((xs) => [...xs, '']);
  }
  function fjernVariant(i: number) {
    setVarianter((xs) => (xs.length === 1 ? [''] : xs.filter((_, j) => j !== i)));
  }

  function opret() {
    setFejl(null);
    setOk(null);
    start(async () => {
      try {
        const res = await opretModel({ name: navn, platform, varianter });
        setOk(res);
        nulstil();
        setAaben(false);
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  if (!aaben) {
    return (
      <div className="space-y-3">
        {ok && (
          <p className="rounded-xl border border-kobber-200 bg-kobber-50 p-3 text-sm text-kobber-800">
            Modellen er oprettet. Dens forum ligger nu under Modellerne -{' '}
            <a href={`/forum/${ok.slug}`} target="_blank" className="font-medium underline">
              se forummet →
            </a>
          </p>
        )}
        <button className="btn-primary !py-2 text-sm" onClick={() => setAaben(true)}>
          + Tilføj model
        </button>
      </div>
    );
  }

  const klar = navn.trim() !== '' && platform.trim() !== '';

  return (
    <div className="rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-4 sm:p-5">
      <div className="space-y-4">
        {/* Navn */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-grafit-400">
            Modelnavn
          </label>
          <input
            className="input"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            placeholder="fx Zeekr 9X"
            autoFocus
          />
          <p className="mt-1 text-xs text-grafit-400">
            Opretter modellen, et model-forum under Modellerne og de varianter du taster.
          </p>
        </div>

        {/* Platform */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-grafit-400">
            Platform
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input !w-auto"
              value={platformValg}
              onChange={(e) => setPlatformValg(e.target.value)}
            >
              {KENDTE_PLATFORME.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={ANDEN}>Anden (skriv selv) …</option>
            </select>
            {platformValg === ANDEN && (
              <input
                className="input !w-auto flex-1"
                value={platformFri}
                onChange={(e) => setPlatformFri(e.target.value)}
                placeholder="Platform-betegnelse"
              />
            )}
          </div>
          <p className="mt-1 text-xs text-grafit-400">
            Bruges til at knytte modeller på samme platform sammen i rapporter.
          </p>
        </div>

        {/* Varianter */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-grafit-400">
            Varianter <span className="font-normal normal-case text-grafit-400">(valgfrit)</span>
          </label>
          <div className="space-y-2">
            {varianter.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  value={v}
                  onChange={(e) => saetVariant(i, e.target.value)}
                  placeholder="fx Long Range RWD"
                />
                <button
                  type="button"
                  className="rounded px-2 py-1 text-grafit-400 hover:bg-grafit-100 hover:text-kobber-700"
                  title="Fjern variant"
                  onClick={() => fjernVariant(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-kobber-700 hover:underline"
            onClick={tilfoejVariant}
          >
            + Tilføj variant
          </button>
          <p className="mt-1 text-xs text-grafit-400">
            Kan være tomt - en model uden varianter fungerer fint (variant-valget springes bare
            over). Du kan altid tilføje flere senere.
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-grafit-200 pt-3">
          <button
            className="btn-primary !py-1.5 text-sm"
            disabled={pending || !klar}
            onClick={opret}
          >
            {pending ? 'Opretter …' : 'Opret model'}
          </button>
          <button
            className="btn-ghost !py-1.5 text-sm"
            disabled={pending}
            onClick={() => {
              nulstil();
              setAaben(false);
            }}
          >
            Annullér
          </button>
          {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
        </div>
      </div>
    </div>
  );
}
