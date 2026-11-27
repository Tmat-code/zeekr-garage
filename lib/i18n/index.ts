// UI-i18n: de tre ordbøger samlet. Rene moduler (ingen Next/node), så både
// server og klient kan slå op. Server: brug `hentOrdbog()` fra ./server.
// Klient: brug `useOrdbog()` fra ./klient.

import { da, type Ordbog } from './da';
import { sv } from './sv';
import { en } from './en';
import type { UiSprog } from './sprog';

export type { Ordbog } from './da';
export * from './sprog';

export const ORDBOGER: Record<UiSprog, Ordbog> = { da, sv, en };

export function ordbog(sprog: UiSprog): Ordbog {
  return ORDBOGER[sprog] ?? da;
}
