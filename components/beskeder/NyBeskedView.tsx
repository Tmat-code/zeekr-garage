'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AndenPart } from '@/lib/types';
import GarageBadge from '@/components/forum/GarageBadge';
import { soegModtagere, startSamtaleMedBruger } from '@/app/beskeder/actions';

// Compose: find en bruger på navn og start (eller genåbn) en privat samtale -
// direkte mellem brugerne, uden at gå via et forum-indlæg.
export default function NyBeskedView() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [resultater, setResultater] = useState<AndenPart[]>([]);
  const [soegt, setSoegt] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [soeger, setSoeger] = useState(false);
  const [aabner, start] = useTransition();
  const seqRef = useRef(0);

  // Debounced søgning: vent til brugeren holder pause, og ignorér forældede svar.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResultater([]);
      setSoegt(false);
      setSoeger(false);
      return;
    }
    setSoeger(true);
    const minSeq = ++seqRef.current;
    const t = setTimeout(async () => {
      try {
        const r = await soegModtagere(term);
        if (seqRef.current !== minSeq) return; // nyere søgning vandt
        setResultater(r);
        setSoegt(true);
      } catch (e: any) {
        if (seqRef.current !== minSeq) return;
        setFejl(e?.message ?? 'Søgningen fejlede.');
      } finally {
        if (seqRef.current === minSeq) setSoeger(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function skrivTil(id: string) {
    setFejl(null);
    start(async () => {
      try {
        const convId = await startSamtaleMedBruger(id);
        router.push(`/beskeder/${convId}`);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke starte samtalen.');
      }
    });
  }

  const term = q.trim();

  return (
    <div className="mt-5">
      <label htmlFor="modtager" className="text-sm font-medium text-grafit-700">
        Til hvem?
      </label>
      <input
        id="modtager"
        className="input mt-1.5"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Søg på visningsnavn…"
        autoComplete="off"
        autoFocus
      />
      <p className="mt-1.5 text-xs text-grafit-400">
        Skriv mindst 2 tegn. Vælg en ejer for at åbne en privat samtale.
      </p>

      <div className="mt-4 space-y-2">
        {term.length >= 2 && soeger && resultater.length === 0 && (
          <p className="px-1 py-2 text-sm text-grafit-400">Søger…</p>
        )}

        {resultater.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={aabner}
            onClick={() => skrivTil(p.id)}
            className="flex w-full items-center gap-2 rounded-xl border border-grafit-200 bg-white px-4 py-3 text-left hover:border-kobber-300 disabled:opacity-60"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-grafit-800">
              {p.navn || 'Ejer'}
            </span>
            <GarageBadge bil={p.bil} />
            <span className="shrink-0 text-sm text-kobber-700">Skriv →</span>
          </button>
        ))}

        {soegt && !soeger && resultater.length === 0 && (
          <p className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-6 text-center text-sm text-grafit-500">
            Ingen ejere matcher "{term}". Prøv et andet navn.
          </p>
        )}
      </div>

      {fejl && <p className="mt-3 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
