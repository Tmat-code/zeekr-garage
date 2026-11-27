// Rene sprog-hjaelpere til forum-oversaettelsen (nordisk i18n, trin 3). INGEN
// node-moduler, saa baade klienten (knap-synlighed i ForumTraad) og serveren kan
// bruge dem. Den AUTORITATIVE kilde-detektion sker server-side via LibreTranslate
// ved klik (lib/forum-oversaet.ts); `gaetSprog` her er KUN en billig heuristik til
// at afgoere OM "Oversaet"-knappen skal vises - saa vi ikke LT-kalder paa hver
// render. Gaetter den forkert, er skaden lille: knappen vises/skjules en anelse
// upraecist, og ved klik afgoer LT det rigtigt (og "Vis original" staar altid).

export const FORUM_MAALSPROG = ['da', 'en', 'sv'] as const;
export type ForumSprog = (typeof FORUM_MAALSPROG)[number];

export function erForumSprog(s: string | null | undefined): s is ForumSprog {
  return !!s && (FORUM_MAALSPROG as readonly string[]).includes(s);
}

// Paent sprog-navn (til "Oversat fra svensk"-labelen). Faldback: koden selv.
const SPROG_NAVN: Record<string, string> = { da: 'dansk', en: 'engelsk', sv: 'svensk', no: 'norsk', nb: 'norsk', nn: 'norsk' };
export function sprogNavn(kode: string | null | undefined): string {
  const k = (kode ?? '').toLowerCase();
  return SPROG_NAVN[k] ?? k ?? '';
}

// Laeserens maalsprog ud fra browserens Accept-Language. Tager det foerste
// (hoejest prioriterede) sprog-tag; da/sv/en mappes direkte, alt andet - inkl.
// norsk (nb/nn/no) - falder til ENGELSK som internationalt default. Vi oversaetter
// bevidst ikke TIL norsk: DA<->NO er saa taet at en nordmand laeser dansk, og
// originalen staar altid. En rigtig "mit sprog"-bruger-indstilling hoerer til den
// senere login/UI-i18n-bunke; til gaeste-oversaettelsen er browseren signalet.
export function laeserSprog(acceptLanguage: string | null | undefined): ForumSprog {
  const foerste = (acceptLanguage ?? '')
    .split(',')[0] // "da,en;q=0.8" -> "da"
    .split(';')[0] // defensivt mod "da;q=1"
    .split('-')[0] // "en-US" -> "en"
    .trim() // trimmes TIL SIDST, saa " da ; q=1 " ogsaa rammer "da"
    .toLowerCase();
  if (foerste === 'da') return 'da';
  if (foerste === 'sv') return 'sv';
  if (foerste === 'en') return 'en';
  return 'en';
}

// ASCII-stopord til at skille da/sv/en NAAR teksten ingen skandinaviske
// specialtegn har (de faelder afgoeres foer, nedenfor). Formerne er bevidst uden
// diakritiske tegn - naar vi naar hertil er der ingen ae/oe/aa/ä/ö tilbage.
const EN_STOP = new Set(['the', 'and', 'is', 'are', 'was', 'were', 'to', 'for', 'you', 'it', 'with', 'this', 'that', 'have', 'not', 'of', 'in', 'my', 'your', 'we', 'but', 'so', 'if', 'or', 'at', 'be', 'will', 'would', 'can', 'car', 'charging', 'update']);
const DA_STOP = new Set(['og', 'ikke', 'jeg', 'det', 'er', 'en', 'et', 'til', 'for', 'med', 'men', 'som', 'har', 'kan', 'vil', 'der', 'den', 'de', 'hvad', 'hvor', 'tak', 'hej', 'bil', 'lige', 'min', 'din', 'jo']);
const SV_STOP = new Set(['och', 'inte', 'jag', 'det', 'en', 'ett', 'till', 'med', 'men', 'som', 'har', 'kan', 'vill', 'den', 'de', 'vad', 'var', 'tack', 'hej', 'bil', 'mycket', 'min', 'din', 'jo', 'ett']);

function tael(ord: string[], stop: Set<string>): number {
  let n = 0;
  for (const o of ord) if (stop.has(o)) n++;
  return n;
}

// Billigt gaet (da/sv/en) til KNAP-SYNLIGHED. Rfaekkefoelge:
//  1) ä eller ö -> svensk (de findes i svensk, IKKE i dansk/norsk).
//  2) æ eller ø -> dansk (findes i dansk/norsk, IKKE svensk; norsk gaettes 'da',
//     men vi oversaetter ikke til norsk, og en dansker laeser norsk, saa 'da' er
//     den rigtige "ingen knap for en dansk laeser"-opfoersel).
//  3) ingen skandinaviske specialtegn -> stopord-score (en vs da vs sv), faldback
//     dansk (forummet er primaert dansk).
export function gaetSprog(text: string | null | undefined): ForumSprog {
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) return 'da';
  if (/[äö]/.test(t)) return 'sv';
  if (/[æø]/.test(t)) return 'da';
  const ord = t.split(/[^a-z0-9]+/).filter(Boolean);
  if (ord.length === 0) return 'da';
  const en = tael(ord, EN_STOP);
  const da = tael(ord, DA_STOP);
  const sv = tael(ord, SV_STOP);
  if (en > da && en > sv) return 'en';
  if (sv > da && sv > en) return 'sv';
  return 'da';
}
