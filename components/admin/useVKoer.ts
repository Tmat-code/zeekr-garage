'use client';

// U6: fælles "kør en handling"-hook til Værkstedets moderator-flader. Gemmer
// fejlen som en NØGLE (ikke tekst), så den slås op ved render og skifter med,
// når moderatoren skifter sprog midt i det hele.
//
// - Værksted-actions returnerer { ok:false, fejl:<nøgle> } -> den nøgle vises.
// - Kaster handlingen (forum-actions fra U2 kaster, netværksfejl o.l.) vises
//   den generiske 'nogetGikGalt' på moderatorens sprog: i en produktions-build
//   når en kastet fejltekst ikke nødvendigvis over server->klient-grænsen, og
//   en rå/engelsk Next-fejl skal aldrig stå i UI'et.

import { useState, useTransition } from 'react';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import type { VFejl, VSvar } from '@/lib/vaerksted-fejl';

export function useVKoer() {
  const v = useVOrdbog();
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<VFejl | null>(null);

  function koer(fn: () => Promise<VSvar<unknown> | void>, efter?: () => void) {
    setFejl(null);
    start(async () => {
      try {
        const r = await fn();
        if (r && r.ok === false) {
          setFejl(r.fejl);
          return;
        }
        efter?.();
      } catch (e) {
        console.error('[vaerksted] handling fejlede:', e);
        setFejl('nogetGikGalt');
      }
    });
  }

  return {
    pending,
    koer,
    fejl: fejl ? v.fejl[fejl] : null,
    nulstilFejl: () => setFejl(null),
  };
}

// Til "hent/vis flere": en hentning der fejler, gemmer enten serverens nøgle
// eller 'kontekst' (komponenten viser så sin egen tekst, fx "Kunne ikke hente
// tråde."). Begge slås op ved render.
export type HentFejl = VFejl | 'kontekst' | null;
