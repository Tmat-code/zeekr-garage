// Sprog-løs-værn for FORUM-oversættelsen (P42, 27-11-2026). REN: ingen HTTP,
// ingen node-moduler - LT-kaldet injiceres, så kernen kan testes isoleret.
//
// Fundet (U1-live-tjek 27-11): velkomst-tråden i Præsentér dig slutter med
// "... ombord. 🚗" og kom ud på engelsk som "... Welcome aboard. PACKAGE LEAFLET".
// Samme hallucination som trin 2.9 løste i RAPPORTEN: LibreTranslate/Argos
// sætnings-splitter selv inputtet, og en sætning UDEN sprog (emoji, tal, tegn)
// får modellen til at gengive sit træningskorpus (EU-indlægssedler). Forummet
// sendte hele indlægget som én streng og havde derfor ingen beskyttelse.
//
// Fix: split indlægget i enheder (linjer + sætningsgrænser), lad enheder uden
// ét bogstav stå ORDRET (genbruger `harSprogIndhold` fra trin 2.9), og send kun
// sprog-stykkerne til LT. Sammenhængende sprog-enheder flettes tilbage til ÉT
// stykke med deres originale skilletegn, så LT beholder konteksten; et indlæg
// uden sprog-løse enheder giver præcis ét stykke = hele body = samme LT-input som
// før. Forummet er fortsat RÅ GIST: ingen ordliste, ingen term-beskyttelse,
// `source=auto` - kun opdelingen er ny.

import { harSprogIndhold } from '@/lib/rapport-ordliste';

// Cache-version for `forum_post_translations.kilde_hash`. Foldes ind i hashen, så
// et bump giver cache-miss på ALLE rækker (bl.a. de cachede LEAFLET-svar) uden
// migration. Bump ved enhver ændring af forum-pipelinens output.
export const FORUM_OVERSAET_VERSION = 'f2';

export type ForumStykke = { tekst: string; sprog: boolean };

// Enhedsgrænse = whitespace efter sætnings-tegnsætning, ELLER et whitespace-løb
// med mindst ét linjeskift. Kræver whitespace efter tegnet, så 3.0.4 / 15:30 /
// 2.5 kW ikke knækkes.
const GRAENSE_RE = /(?<=[.!?…:;])[^\S\n]+|[^\S\n]*\n\s*/g;

// Del body i stykker: sprog-stykker (sammenhængende enheder med bogstaver, inkl.
// deres indre skilletegn) og ordrette stykker (sprog-løse enheder + skilletegnene
// omkring dem). Invariant: stykkerne.map(s => s.tekst).join('') === body.
export function delForumIndlaeg(body: string): ForumStykke[] {
  if (!body) return [];
  // 1) Enheder + skilletegn: body = e0 + s0 + e1 + s1 + ... + en
  const enheder: string[] = [];
  const skille: string[] = [];
  let sidst = 0;
  for (const m of body.matchAll(GRAENSE_RE)) {
    const i = m.index ?? 0;
    enheder.push(body.slice(sidst, i));
    skille.push(m[0]);
    sidst = i + m[0].length;
  }
  enheder.push(body.slice(sidst));

  // 2) Flet: sprog-enheder + skilletegn MELLEM to sprog-enheder bliver ét stykke;
  //    alt andet (sprog-løse enheder og skilletegn der grænser op til dem) ordret.
  const ud: ForumStykke[] = [];
  const tilfoej = (tekst: string, sprog: boolean) => {
    if (!tekst) return;
    const forrige = ud[ud.length - 1];
    if (forrige && forrige.sprog === sprog) forrige.tekst += tekst;
    else ud.push({ tekst, sprog });
  };
  enheder.forEach((e, i) => {
    const sprog = harSprogIndhold(e);
    tilfoej(e, sprog);
    if (i < skille.length) {
      const naesteSprog = harSprogIndhold(enheder[i + 1] ?? '');
      tilfoej(skille[i], sprog && naesteSprog);
    }
  });
  return ud;
}

// Motor-kald: får KUN sprog-stykkerne (mindst ét), returnerer dem oversat i samme
// rækkefølge + LT's detekterede kildesprog.
export type ForumKald = (tekster: string[]) => Promise<{ oversat: string[]; kilde: string | null }>;

// Oversæt et forum-indlæg med værnet. Ingen sprog-stykker -> intet kald, body
// returneres uændret. En motor der taber et element -> originalen på den plads
// (gist: hellere uoversat end tomt).
export async function oversaetForumTekst(
  body: string,
  kald: ForumKald,
): Promise<{ oversat: string; kilde: string | null; kaldt: boolean }> {
  const stykker = delForumIndlaeg(body);
  const sprogIdx = stykker.flatMap((s, i) => (s.sprog ? [i] : []));
  if (sprogIdx.length === 0) return { oversat: body, kilde: null, kaldt: false };
  const r = await kald(sprogIdx.map((i) => stykker[i].tekst));
  const ud = stykker.map((s) => s.tekst);
  sprogIdx.forEach((i, k) => {
    const o = r.oversat[k];
    if (typeof o === 'string' && o.trim()) {
      // LT trimmer; bevar stykkets egne kant-mellemrum (sprog-stykker har ingen,
      // men defensivt).
      const foran = stykker[i].tekst.match(/^\s*/)?.[0] ?? '';
      const bag = stykker[i].tekst.match(/\s*$/)?.[0] ?? '';
      ud[i] = foran + o.trim() + bag;
    }
  });
  return { oversat: ud.join(''), kilde: r.kilde, kaldt: true };
}
