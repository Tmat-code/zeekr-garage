'use client';

// UI-i18n: klient-siden. Root-layoutet lægger det opløste sprog i provideren;
// klient-komponenter henter ordbogen med `useOrdbog()`.
//
// Provideren bærer KUN sprog-koden, ikke selve ordbogen: ordbøgerne indeholder
// funktioner (parametre/flertal), og funktioner kan ikke serialiseres over
// server->klient-grænsen. Klienten slår derfor ordbogen op lokalt.

import { createContext, useContext, type ReactNode } from 'react';
import { ordbog, type Ordbog } from './index';
import { STANDARD_SPROG, type UiSprog } from './sprog';

const SprogKontekst = createContext<UiSprog>(STANDARD_SPROG);

export function SprogProvider({ sprog, children }: { sprog: UiSprog; children: ReactNode }) {
  return <SprogKontekst.Provider value={sprog}>{children}</SprogKontekst.Provider>;
}

export function useSprog(): UiSprog {
  return useContext(SprogKontekst);
}

export function useOrdbog(): Ordbog {
  return ordbog(useSprog());
}
