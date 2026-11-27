// UI-i18n: oversættelser af DB-INDHOLD (U1b links, senere U7 kategorier/regler/
// forside-besked). Rent modul - ingen Next/node-afhængigheder, så det kan bruges
// både server- og klient-side og testes isoleret (scripts/i18n-test.mjs).
//
// Format i DB (kolonnen `oversaettelser jsonb`):
//   { "sv": { "<felt>": "..." }, "en": { "<felt>": "..." } }
// Dansk står i selve kolonnerne (titel/navn/kilde ...) og er altid kilden. Et
// manglende eller tomt felt = dansk fallback. Samme regler som SQL-funktionen
// public.rens_oversaettelser (migration 20261127130000), så klient og DB er enige.

import type { UiSprog } from './sprog';

export const INDHOLD_SPROG = ['sv', 'en'] as const;
export type IndholdSprog = (typeof INDHOLD_SPROG)[number];

export type Oversaettelser<F extends string> = Partial<Record<IndholdSprog, Partial<Record<F, string>>>>;

export const OVERSAETTELSE_MAKS = 300;

// Behold kun sv/en og de navngivne felter; trim, drop tomme, cap til 300 tegn.
// Tåler hvad som helst som input (null, streng, array ...) -> altid et objekt.
export function rensOversaettelser<F extends string>(raw: unknown, felter: readonly F[]): Oversaettelser<F> {
  const ud: Oversaettelser<F> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ud;
  for (const s of INDHOLD_SPROG) {
    const obj = (raw as Record<string, unknown>)[s];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
    const felt: Partial<Record<F, string>> = {};
    for (const f of felter) {
      const v = (obj as Record<string, unknown>)[f];
      if (typeof v !== 'string') continue;
      const t = v.trim().slice(0, OVERSAETTELSE_MAKS);
      if (t) felt[f] = t;
    }
    if (Object.keys(felt).length > 0) ud[s] = felt;
  }
  return ud;
}

// Feltets tekst på læserens sprog; dansk (eller ukendt sprog / tomt felt) ->
// den danske kildetekst. `dansk` må være null (fx et link uden kilde): så er
// der intet at vise på noget sprog, og null returneres.
export function oversatFelt<F extends string>(
  dansk: string | null,
  ov: Oversaettelser<F> | null | undefined,
  sprog: UiSprog,
  felt: F,
): string | null {
  if (dansk == null) return null;
  if (sprog === 'da' || !ov) return dansk;
  const v = ov[sprog as IndholdSprog]?.[felt];
  return v && v.trim() ? v : dansk;
}
