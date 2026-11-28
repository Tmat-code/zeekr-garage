// U5: fejl-NØGLER for beskeder. Server-actions returnerer en nøgle (aldrig en
// færdig tekst og aldrig en rå DB-fejl); klienten slår teksten op i ordbogen
// ved render, så en synlig fejl skifter med når man skifter sprog. Ren fil
// (ingen Next/Supabase), så i18n-testen kan køre den.

export const BESKED_FEJL = [
  'logInd',
  'soegning',
  'kunneIkkeStarte',
  'kunneIkkeOpretteGruppe',
  'kunneIkkeSende',
  'kunneIkkeSlette',
  'kunneIkkeForlade',
  'kunneIkkeAnmelde',
  'kunneIkkeGemme',
  'tomBesked',
  'forLang',
  'blokeret',
  'forMange',
  'mindstTo',
  'brugerFindesIkke',
  'kunOpretter',
  'digSelv',
  'brugForlad',
  'nogetGikGalt',
] as const;

export type BeskedFejl = (typeof BESKED_FEJL)[number];

export function erBeskedFejl(x: unknown): x is BeskedFejl {
  return typeof x === 'string' && (BESKED_FEJL as readonly string[]).includes(x);
}

// De kendte (danske) raise exception-tekster fra beskeder-/gruppe-RPC'erne
// (20261122120000_beskeder.sql + 20261123180000_gruppe_samtaler.sql) + RLS-
// afvisninger -> nøgle. Ukendt -> null (kalderen vælger en kontekst-fallback og
// logger originalen).
export function beskedFejlFraDb(besked: string | null | undefined): BeskedFejl | null {
  const m = (besked ?? '').toLowerCase();
  if (!m) return null;
  if (m.includes('blokeret')) return 'blokeret';
  if (/row-level security|violates|permission/.test(m)) return 'blokeret';
  if (m.includes('for mange deltagere')) return 'forMange';
  if (m.includes('mindst to')) return 'mindstTo';
  if (m.includes('findes ikke')) return 'brugerFindesIkke';
  if (m.includes('kun gruppens opretter')) return 'kunOpretter';
  if (m.includes('kan forlades')) return 'kunneIkkeForlade';
  if (m.includes('dig selv')) return m.includes('forlad') ? 'brugForlad' : 'digSelv';
  if (m.includes('forlad gruppe')) return 'brugForlad';
  if (m.startsWith('log ind')) return 'logInd';
  return null;
}
