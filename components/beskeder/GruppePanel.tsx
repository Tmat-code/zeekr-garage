'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Deltager } from '@/lib/types';
import GarageBadge from '@/components/forum/GarageBadge';
import {
  soegModtagere,
  tilfoejDeltager,
  fjernDeltager,
  omdoebGruppe,
} from '@/app/beskeder/actions';

type Props = {
  convId: string;
  megId: string;
  erOpretter: boolean;
  eksplicitTitel: string | null;
  deltagere: Deltager[];
};

// Medlems-panel for en gruppe: liste over deltagere, og for opretteren også
// omdøb + tilføj/fjern. Alle mutationer går via server-actions (sec-def RPC'er),
// hvorefter vi router.refresh()'er så listen opdateres fra DB.
export default function GruppePanel({
  convId,
  megId,
  erOpretter,
  eksplicitTitel,
  deltagere,
}: Props) {
  const router = useRouter();
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Omdøb
  const [titel, setTitel] = useState(eksplicitTitel ?? '');

  // Tilføj-søgning
  const [q, setQ] = useState('');
  const [resultater, setResultater] = useState<Deltager[]>([]);
  const [soeger, setSoeger] = useState(false);
  const seqRef = useRef(0);
  const medlemsIds = new Set(deltagere.map((d) => d.id));

  useEffect(() => {
    if (!erOpretter) return;
    const term = q.trim();
    if (term.length < 2) {
      setResultater([]);
      setSoeger(false);
      return;
    }
    setSoeger(true);
    const minSeq = ++seqRef.current;
    const t = setTimeout(async () => {
      try {
        const r = await soegModtagere(term);
        if (seqRef.current !== minSeq) return;
        // Udelad dem der allerede er med.
        setResultater(r.filter((p) => !medlemsIds.has(p.id)));
      } catch (e: any) {
        if (seqRef.current !== minSeq) return;
        setFejl(e?.message ?? 'Søgningen fejlede.');
      } finally {
        if (seqRef.current === minSeq) setSoeger(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // medlemsIds afledes af deltagere; q driver søgningen
  }, [q, erOpretter, deltagere]);

  function gem(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-grafit-200 bg-grafit-50 p-4">
      {/* Omdøb (kun opretter) */}
      {erOpretter && (
        <div className="mb-4">
          <label htmlFor="omdoeb" className="text-xs font-medium text-grafit-600">
            Gruppenavn
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="omdoeb"
              className="input !py-2 text-sm"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Uden navn: opkaldt efter deltagerne"
              maxLength={80}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-secondary shrink-0 !py-2 text-sm"
              disabled={pending || titel.trim() === (eksplicitTitel ?? '').trim()}
              onClick={() => gem(() => omdoebGruppe(convId, titel))}
            >
              Gem
            </button>
          </div>
        </div>
      )}

      {/* Medlemsliste */}
      <p className="text-xs font-medium text-grafit-600">Deltagere ({deltagere.length})</p>
      <ul className="mt-2 space-y-1.5">
        {deltagere.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-grafit-800">
              {d.navn || 'Ejer'}
              {d.id === megId && <span className="ml-1 text-grafit-400">(dig)</span>}
            </span>
            <GarageBadge bil={d.bil} />
            {erOpretter && d.id !== megId && (
              <button
                type="button"
                className="shrink-0 text-xs text-grafit-400 hover:text-kobber-700"
                disabled={pending}
                onClick={() => gem(() => fjernDeltager(convId, d.id))}
              >
                Fjern
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Tilføj (kun opretter) */}
      {erOpretter && (
        <div className="mt-4">
          <label htmlFor="tilfoej" className="text-xs font-medium text-grafit-600">
            Tilføj en ejer
          </label>
          <input
            id="tilfoej"
            className="input mt-1 !py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg på visningsnavn…"
            autoComplete="off"
          />
          <div className="mt-2 space-y-1.5">
            {q.trim().length >= 2 && soeger && resultater.length === 0 && (
              <p className="px-1 text-xs text-grafit-400">Søger…</p>
            )}
            {resultater.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                onClick={() =>
                  gem(async () => {
                    await tilfoejDeltager(convId, p.id);
                    setQ('');
                    setResultater([]);
                  })
                }
                className="flex w-full items-center gap-2 rounded-lg border border-grafit-200 bg-white px-3 py-2 text-left text-sm hover:border-kobber-300 disabled:opacity-60"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-grafit-800">
                  {p.navn || 'Ejer'}
                </span>
                <GarageBadge bil={p.bil} />
                <span className="shrink-0 text-xs text-kobber-700">Tilføj →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {fejl && <p className="mt-3 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
