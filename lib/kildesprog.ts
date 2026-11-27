// U3b: kildesprog pr. feedback-melding (da / sv / en). REN modul - ingen node-/
// Next-imports - så klient, server, tests og SQL-spejlet kan dele reglerne.
//
// SAMME regler som SQL-funktionen public.gaet_tekst_sprog (migration
// 20261127140000_u3b_feedback_sprog.sql), som udfylder issues.sprog ved INSERT
// (også den natlige bugherrer-sync) og backfiller eksisterende rækker. Ændres
// reglerne her, skal SQL-funktionen ændres med (scripts/u3b-test.mjs tjekker at
// stopord-listerne er ens i de to filer).
//
// Rækkefølge:
//  1) ä eller ö -> svensk (findes i svensk, ALDRIG i dansk) - sikker.
//  2) æ eller ø -> dansk (findes i dansk/norsk, ALDRIG i svensk) - sikker.
//     Norsk bokmål lander dermed på 'da': den danske rapport-sti (ordliste +
//     da->en) er langt tættere på norsk end den svenske.
//  3) ellers stopord-score (kun ord der er SÆRKENDE for ét sprog - fælles ord
//     som "det", "men", "kan", "efter" tæller ikke). Højeste score vinder; uafgjort
//     eller ingen -> dansk (sitets hjemsprog). Sikker når vinderen har >= 2 og
//     fører med >= 2 - ellers må serveren spørge LibreTranslate (/detect).

export const KILDESPROG = ['da', 'sv', 'en'] as const;
export type Kildesprog = (typeof KILDESPROG)[number];

export function erKildesprog(s: unknown): s is Kildesprog {
  return typeof s === 'string' && (KILDESPROG as readonly string[]).includes(s);
}

// Listerne er DISJUNKTE (u3b-test tjekker det) og kun med ord der er særkende
// for ét sprog. Ord med ä/ö/æ/ø er unødvendige (de afgøres i trin 1-2).
export const STOP_SV: readonly string[] = [
  'och', 'inte', 'jag', 'att', 'ett', 'vid', 'hur', 'utan', 'mycket', 'bara', 'sedan',
  'också', 'från', 'vara', 'fungerar', 'uppdatering', 'uppdateringen', 'dock', 'ibland', // i18n-ok (stopord-data)
  'alltid', 'ska', 'inga', 'någon', 'något', 'eftersom', 'endast', // i18n-ok (stopord-data)
];
export const STOP_DA: readonly string[] = [
  'og', 'ikke', 'jeg', 'et', 'hvordan', 'uden', 'meget', 'bare', 'siden', 'også', 'fra', // i18n-ok (stopord-data)
  'bliver', 'virker', 'opdatering', 'opdateringen', 'af', 'hvis', 'når', 'altid', 'skal', // i18n-ok (stopord-data)
  'nogle', 'noget', 'lige', 'kun',
];
export const STOP_EN: readonly string[] = [
  'the', 'and', 'is', 'are', 'was', 'were', 'not', 'with', 'this', 'that', 'have', 'of',
  'when', 'after', 'it', 'my', 'your', 'doesn', 'works', 'update', 'car', 'screen', 'does',
  'always', 'never', 'should', 'some',
];

const SV = new Set(STOP_SV);
const DA = new Set(STOP_DA);
const EN = new Set(STOP_EN);

export type SprogGaet = { sprog: Kildesprog; sikker: boolean };

export function gaetKildesprog(tekst: string | null | undefined): SprogGaet {
  const t = (tekst ?? '').toLowerCase();
  if (/[äö]/.test(t)) return { sprog: 'sv', sikker: true };
  if (/[æø]/.test(t)) return { sprog: 'da', sikker: true };
  const ord = t.split(/[^a-z0-9å]+/).filter(Boolean);
  let sv = 0;
  let da = 0;
  let en = 0;
  for (const o of ord) {
    if (SV.has(o)) sv++;
    else if (DA.has(o)) da++;
    else if (EN.has(o)) en++;
  }
  const scores: [Kildesprog, number][] = [
    ['da', da],
    ['sv', sv],
    ['en', en],
  ];
  const sorteret = [...scores].sort((a, b) => b[1] - a[1]);
  const [foerste, anden] = sorteret;
  if (foerste[1] === 0 || foerste[1] === anden[1]) return { sprog: 'da', sikker: false };
  return { sprog: foerste[0], sikker: foerste[1] >= 2 && foerste[1] - anden[1] >= 2 };
}

// Kortform til trigger-spejlet + rapport-kommentarer (kun sproget).
export function kildesprogAf(tekst: string | null | undefined): Kildesprog {
  return gaetKildesprog(tekst).sprog;
}

// LibreTranslate /detect -> vores kildesprog. Norsk (nb/nn/no) -> dansk (se
// regel 2). Andet/ukendt eller lav konfidens -> null (behold heuristikken).
export function fraLtDetekt(
  svar: { language?: string; confidence?: number }[] | null | undefined,
  minKonfidens = 50,
): Kildesprog | null {
  const top = Array.isArray(svar) ? svar[0] : null;
  if (!top?.language) return null;
  if (typeof top.confidence === 'number' && top.confidence < minKonfidens) return null;
  const l = top.language.toLowerCase().split('-')[0];
  if (l === 'da' || l === 'nb' || l === 'nn' || l === 'no') return 'da';
  if (l === 'sv') return 'sv';
  if (l === 'en') return 'en';
  return null;
}

// Endelig afgørelse ved oprettelse: sikker heuristik vinder altid (ä/ö kan LT
// ikke slå); ellers LT's bud hvis det findes, ellers heuristikkens bud.
export function bestemKildesprog(gaet: SprogGaet, lt: Kildesprog | null): Kildesprog {
  if (gaet.sikker) return gaet.sprog;
  return lt ?? gaet.sprog;
}
