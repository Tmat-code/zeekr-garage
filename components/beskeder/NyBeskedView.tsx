'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AndenPart } from '@/lib/types';
import GarageBadge from '@/components/forum/GarageBadge';
import {
  soegModtagere,
  startSamtale,
  startGruppe,
  hentSenesteKontakter,
} from '@/app/beskeder/actions';
import { useOrdbog } from '@/lib/i18n/klient';
import type { BeskedFejl } from '@/lib/beskeder-fejl';

// Compose: find en eller flere ejere på navn og start en samtale. Vælg 1 =>
// 1:1 (uændret), 2+ => gruppe (P12) med valgfrit navn. Direkte mellem brugerne,
// uden at gå via et forum-indlæg.
export default function NyBeskedView() {
  const router = useRouter();
  const o = useOrdbog();
  const t = o.beskeder;
  const fv = o.faellesFejl;
  const [q, setQ] = useState('');
  const [resultater, setResultater] = useState<AndenPart[]>([]);
  const [seneste, setSeneste] = useState<AndenPart[]>([]);
  const [valgte, setValgte] = useState<AndenPart[]>([]);
  const [titel, setTitel] = useState('');
  const [soegt, setSoegt] = useState(false);
  const [fejl, setFejl] = useState<BeskedFejl | null>(null); // nøgle (U5)
  const [soeger, setSoeger] = useState(false);
  const [starter, start] = useTransition();
  const seqRef = useRef(0);

  // Hent "ejere du har skrevet med" ved åbning - trykbare forslag så man kan
  // samle en samtale/gruppe uden at taste navne.
  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const r = await hentSenesteKontakter();
        if (aktiv) setSeneste(r);
      } catch {
        /* forslag er valgfrie - ignorér fejl */
      }
    })();
    return () => {
      aktiv = false;
    };
  }, []);

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
      } catch (e) {
        if (seqRef.current !== minSeq) return;
        console.error(e);
        setFejl('soegning');
      } finally {
        if (seqRef.current === minSeq) setSoeger(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const erValgt = (id: string) => valgte.some((v) => v.id === id);

  function skiftValg(p: AndenPart) {
    setFejl(null);
    setValgte((prev) =>
      prev.some((v) => v.id === p.id) ? prev.filter((v) => v.id !== p.id) : [...prev, p],
    );
  }

  function start_() {
    if (valgte.length === 0) return;
    setFejl(null);
    start(async () => {
      try {
        const r =
          valgte.length === 1
            ? await startSamtale(valgte[0].id)
            : await startGruppe(valgte.map((v) => v.id), titel);
        if (!r.ok) return setFejl(r.fejl);
        router.push(`/beskeder/${r.data}`);
      } catch (e) {
        console.error(e);
        setFejl(valgte.length === 1 ? 'kunneIkkeStarte' : 'kunneIkkeOpretteGruppe');
      }
    });
  }

  const term = q.trim();
  const erGruppe = valgte.length >= 2;

  return (
    <div className="mt-5">
      <label htmlFor="modtager" className="text-sm font-medium text-grafit-700">
        {t.tilHvem} <span className="font-normal text-grafit-400">{t.vaelgEnEllerFlere}</span>
      </label>
      <input
        id="modtager"
        className="input mt-1.5"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.soegPladsholder}
        autoComplete="off"
        autoFocus
      />
      <p className="mt-1.5 text-xs text-grafit-400">
        {t.soegHjaelp}
      </p>

      {/* Valgte deltagere (chips med fjern) */}
      {valgte.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {valgte.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => skiftValg(v)}
              className="chip bg-kobber-50 text-kobber-800 hover:bg-kobber-100"
              aria-label={t.fjernValgtAria(v.navn || t.ejer)}
            >
              <span className="truncate">{v.navn || t.ejer}</span>
              <span aria-hidden="true" className="text-kobber-500">
                ✕
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Seneste kontakter: trykbare forslag når man ikke søger */}
      {term.length < 2 && seneste.length > 0 && (
        <div className="mt-4">
          <p className="px-1 text-xs font-medium text-grafit-500">{t.seneste}</p>
          <div className="mt-2 space-y-2">
            {seneste.map((p) => {
              const valgt = erValgt(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={starter}
                  onClick={() => skiftValg(p)}
                  aria-pressed={valgt}
                  className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left disabled:opacity-60 ${
                    valgt
                      ? 'border-kobber-300 bg-kobber-50'
                      : 'border-grafit-200 bg-white hover:border-kobber-300'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-grafit-800">
                    {p.navn || t.ejer}
                  </span>
                  <GarageBadge bil={p.bil} />
                  <span className="shrink-0 text-sm text-kobber-700">
                    {valgt ? t.valgt : t.vaelg}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Søgeresultater (toggler valg) */}
      <div className="mt-4 space-y-2">
        {term.length >= 2 && soeger && resultater.length === 0 && (
          <p className="px-1 py-2 text-sm text-grafit-400">{t.soeger}</p>
        )}

        {resultater.map((p) => {
          const valgt = erValgt(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={starter}
              onClick={() => skiftValg(p)}
              aria-pressed={valgt}
              className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left disabled:opacity-60 ${
                valgt
                  ? 'border-kobber-300 bg-kobber-50'
                  : 'border-grafit-200 bg-white hover:border-kobber-300'
              }`}
            >
              <span className="min-w-0 flex-1 truncate font-medium text-grafit-800">
                {p.navn || t.ejer}
              </span>
              <GarageBadge bil={p.bil} />
              <span className="shrink-0 text-sm text-kobber-700">{valgt ? t.valgt : t.vaelg}</span>
            </button>
          );
        })}

        {soegt && !soeger && resultater.length === 0 && (
          <p className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-6 text-center text-sm text-grafit-500">
            {t.ingenMatch(term)}
          </p>
        )}
      </div>

      {/* Gruppe-navn (valgfrit, kun ved 2+ valgte) */}
      {erGruppe && (
        <div className="mt-4">
          <label htmlFor="gruppenavn" className="text-sm font-medium text-grafit-700">
            {t.gruppenavn} <span className="font-normal text-grafit-400">{fv.valgfrit}</span>
          </label>
          <input
            id="gruppenavn"
            className="input mt-1.5"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder={t.gruppenavnEks}
            maxLength={80}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-grafit-400">
            {t.udenNavnHjaelp}
          </p>
        </div>
      )}

      {/* Handling */}
      {valgte.length > 0 && (
        <button
          type="button"
          disabled={starter}
          onClick={start_}
          className="btn-primary mt-4 !py-2 text-sm disabled:opacity-60"
        >
          {starter
            ? t.starter
            : erGruppe
              ? t.opretGruppe(valgte.length)
              : t.skrivTil(valgte[0].navn || t.ejer)}
        </button>
      )}

      {fejl && <p className="mt-3 text-sm text-kobber-700">{t.fejl[fejl]}</p>}
    </div>
  );
}
