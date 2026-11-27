// Oversætter RAPPORTENS meldings-tekster (titel + beskrivelse) via en selvhostet
// motor - NLLB-600M når NLLB_URL er sat (trin 2), ellers LibreTranslate (trin 1) -
// med term-beskyttelse + kilde-rensning uden om og cache i databasen. Graceful:
// ingen motor-URL eller dansk → original; NLLB-fejl → fallback til LibreTranslate.

import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';
import { MAALSPROG, type RapportSprog } from '@/lib/rapport-i18n';
import type { RapportFejl } from '@/lib/rapport';
import { forberedSaetninger, samlOversatteSaetninger, erIndholdstab, erDegeneration, oversaetKunSprog, beskytTilSvensk, beskytBevar, genindsaetTermer, erTokenSkadet, splitSaetninger, samlSaetninger, rensKilde, type BeskyttetKilde } from '@/lib/rapport-ordliste';
import { gaetKildesprog, fraLtDetekt, kildesprogAf, type Kildesprog } from '@/lib/kildesprog';
import { oversaetKommentarerKerne, type KommentarInput } from '@/lib/rapport-kommentar-cache';

export type { KommentarInput };

const LT_URL = process.env.LIBRETRANSLATE_URL || '';
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const NLLB_URL = process.env.NLLB_URL || '';

// Aktiv RAPPORT-motor: NLLB-600M når NLLB_URL er sat (trin 2 - bedre kvalitet på
// rapportens fagsprog), ellers LibreTranslate (trin 1). Motor-id'et foldes ind i
// cache-hash'et (nedenfor) så en NLLB- og en LibreTranslate-oversættelse af samme
// kilde aldrig forveksles i `oversaettelser` - ingen migration nødvendig.
// BEMÆRK: dette er RAPPORTENS motor. Forum-oversættelsen (senere trin 3) skal blive
// på LibreTranslate/gist og må IKKE route gennem denne NLLB-vej.
// v3-lt (trin 2.5): rapporten kører nu på LibreTranslate, IKKE NLLB. Begrundelse:
// NLLB-600M (distilleret, grådig, batchet) degenererede ikke-deterministisk til
// flydende boilerplate ("The vehicle shall be equipped with a 'R' system", "The
// speed of the motorway ... speed limit of the motorway") - og det viste sig
// BATCH-AFHÆNGIGT: samme beskrivelse var fin i én batch og degenereret i en anden
// (bevist da titel-rutningen ændrede batch-sammensætningen og #4's beskrivelse så
// degenererede). Derfor kan det hverken opdages (heuristik-værnet missede det tre
// gange) eller rutes væk felt-for-felt (både titler OG beskrivelser rammes).
// LibreTranslate er deterministisk (laver aldrig den fejl) og lettere/hurtigere på
// boksen. Rettesnor (Torben): Zeekr skal FORSTÅ budskabet - LibreTranslates lidt
// mindre flydende sprog >> NLLB-boilerplate der vildleder. NLLB-koden (nllbKald +
// titel-rutning + erDegeneration-værn) beholdes dvalende til evt. genoplivning med
// bedre hardware / fikset batching. Frisk id, så ingen gammel v1/v2-cache serveres
// (den gamle v1 havde fx det rettede `lader`-ordliste-bug). Ingen migration.
// v3-lt-b (trin 2.8): bumpet så HELE rapporten gen-oversættes gennem ordliste-runde 3
// (hakket/overhaling/striber/indre baner) + løse-småord-fixet ("i"-levnet). Buster
// både DB-cachen `oversaettelser` og `kommentar_oversaettelser`. Ingen migration.
// v3-lt-c (trin 2.9): bumpet så cachede "PACKAGE LEAFLET"-hallucinationer (sprog-løse
// stumper som "1."/"-."/"[[0]]." sendt alene til motoren) bustes - de stumper sendes
// nu aldrig til motoren (oversaetKunSprog). Ingen migration.
// v3-lt-d (P39): bumpet fordi BEVAR-versions-regexen nu også beskytter en version
// sidst på en linje/sætning/titel ("3.0.3." -> "[[0]]."); cachede oversættelser hvor
// versionen gik rå gennem motoren bustes. Ingen migration.
// v3-lt-e (U1b): ordliste-runde 4 (fagtermer fra OTA-noterne + engelske Zeekr-
// funktionsnavne i BEVAR) og BEVAR-beskyttelse på en->sv-pivoten (versioner,
// akronymer og funktionsnavne overlever nu også vejen til svensk). Buster rapportens
// caches (`oversaettelser`, `kommentar_oversaettelser`) og OTA-cachen. Ingen migration
// for selve bumpet.
// v3-lt-f (U1b live-runde): token-fletning (parentes/anførselstegn/"/"), bestemte
// former -> "the X", flere OTA-termer, token-skade-værn på pivoten.
// v3-lt-g (U1b): svensk ordliste (EN_SV) på en->sv-pivoten.
// v3-lt-h (U1b): pivoten sætning-for-sætning med trinvis fallback (A/B/C).
// v3-lt-i (U3b): rapporten oversætter fra meldingens RIGTIGE kildesprog
// (issues.sprog): sv->en direkte UDEN den danske ordliste, svensk original
// uoversat i sv-rapporten, en->sv via pivoten. Kildesproget indgår i hash'et.
// Buster `oversaettelser`, `kommentar_oversaettelser` og OTA-cachen én gang.
const MOTOR_ID = 'v3-lt-i';

function hash(s: string): string {
  return crypto.createHash('sha1').update(MOTOR_ID + '\n' + s).digest('hex');
}

async function ltKald(tekster: string[], kilde: string, maal: string): Promise<string[]> {
  const body: Record<string, unknown> = { q: tekster, source: kilde, target: maal, format: 'text' };
  if (LT_KEY) body.api_key = LT_KEY;
  const res = await fetch(`${LT_URL.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`LibreTranslate svarede ${res.status} (${kilde}->${maal})`);
  const data = (await res.json()) as { translatedText: string | string[] };
  return Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
}

// FLORES-200-sprogkoder til NLLB (dansk/engelsk/svensk, latinsk skrift).
const FLORES: Record<string, string> = { da: 'dan_Latn', en: 'eng_Latn', sv: 'swe_Latn' };

// NLLB-600M on-demand inference-service på Pixa. SAMME {q,source,target} ->
// {translatedText}-kontrakt som ltKald, så motorerne er ombyttelige. Modellen
// loades on-demand i servicen; første kald efter idle kan være langsomt -> lang timeout.
async function nllbKald(tekster: string[], kilde: string, maal: string): Promise<string[]> {
  const src = FLORES[kilde];
  const tgt = FLORES[maal];
  if (!src || !tgt) throw new Error(`NLLB: ukendt sprogkode ${kilde}->${maal}`);
  const res = await fetch(`${NLLB_URL.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: tekster, source: src, target: tgt }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`NLLB svarede ${res.status} (${src}->${tgt})`);
  const data = (await res.json()) as { translatedText: string | string[] };
  return Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
}

// Motor-agnostisk rå-kald. NLLB når NLLB_URL er sat, med GRACEFUL FALLBACK til
// LibreTranslate hvis NLLB-kaldet fejler (samme try/catch-ånd som resten af filen);
// ellers LibreTranslate direkte. `tvingLT` springer NLLB helt over og bruger
// LibreTranslate direkte - bruges af trin 2.1-længde-vagten til at genoversætte en
// melding hvor NLLB ser ud til at have tabt indhold. Term-laget (forberedSaetninger/
// samlOversatteSaetninger i daTilEngelsk) ligger UÆNDRET uden om dette kald - det
// var hele pointen med at bygge laget motor-agnostisk i trin 1.
async function motorKald(tekster: string[], kilde: string, maal: string, tvingLT = false): Promise<string[]> {
  if (tvingLT || !NLLB_URL) return ltKald(tekster, kilde, maal);
  try {
    return await nllbKald(tekster, kilde, maal);
  } catch (e) {
    if (!LT_URL) throw e; // ingen fallback-motor -> lad det ydre try/catch beholde dansk
    console.error('[oversaet] NLLB fejlede, falder tilbage til LibreTranslate:', e);
    return ltKald(tekster, kilde, maal);
  }
}

// da->en med term-beskyttelse + kilde-rensning (trin 1) + sætnings-for-sætnings-
// oversættelse (trin 2.1, content-loss-værn): rens + split den danske kilde på
// sætningsgrænser, beskyt termerne om HVER sætning, oversæt hver sætning som sin
// egen enhed, genindsæt termerne og saml igen. ALLE sætninger på tværs af
// meldingerne sendes i ÉT motorKald (ingen ekstra HTTP-kald - presser ikke
// Cloudflare-timeouten), så et NLLB-sætnings-drop højst rammer én sætning og
// korte input stort set aldrig droppes. Laget er motor-agnostisk: kun selve
// da->en-kaldet (motorKald) skifter mellem NLLB og LT.
async function daTilEngelsk(tekster: string[], tvingLT = false): Promise<string[]> {
  const forb = tekster.map(forberedSaetninger);
  // Flad liste af ALLE sætninger på tværs af meldingerne -> ét motorKald.
  const flade: string[] = [];
  const spaend: Array<{ start: number; antal: number }> = [];
  for (const f of forb) {
    spaend.push({ start: flade.length, antal: f.dele.length });
    for (const d of f.dele) flade.push(d.tekst);
  }
  // Trin 2.9: sprog-løse stumper ("1.", "-.", "[[0]].", "") sendes ALDRIG til
  // motoren (de hallucinerede fx "PACKAGE LEAFLET") - de går ordret videre.
  const raa = await oversaetKunSprog(flade, (u) => motorKald(u, 'da', 'en', tvingLT));
  return forb.map((f, i) => {
    const { start, antal } = spaend[i];
    return samlOversatteSaetninger(raa.slice(start, start + antal), f);
  });
}

// da->en direkte; da->andet pivoterer via den RENSEDE/BESKYTTEDE engelske (hverken
// Argos eller vores NLLB-brug laver direkte da->sv her - pivoten holder term-laget
// om da->en-trinnet uændret og lader de engelske termer følge med til sv).
async function motorOversaet(tekster: string[], maal: string, _tvingLT = false): Promise<string[]> {
  // Trin 2.5: rapporten kører på LibreTranslate - tving det her i ÉT choke-point
  // (både oversaetFejl og oversaetKommentarer går gennem motorOversaet), så NLLB aldrig
  // kaldes uanset NLLB_URL. Se MOTOR_ID-noten for hvorfor. nllbKald m.m. beholdes
  // dvalende; sæt daTilEngelsk/motorKald tilbage til `_tvingLT` for at genoplive NLLB.
  const BRUG_LT = true;
  const engelsk = await daTilEngelsk(tekster, BRUG_LT);
  if (maal === 'en') return engelsk;
  return pivotTilSvensk(engelsk, maal, BRUG_LT);
}

// Trinvis, sætning-for-sætning oversættelse kilde->maal (U1b-pivoten, generaliseret
// i U3b). Hver sætning prøves med det første beskyttelses-trin; har motoren
// forvansket et token (erTokenSkadet), prøves netop dén sætning igen med næste
// (mindre) trin - så en sætning aldrig ender dårligere end uden tokens. Hvert
// trin er ÉT motorkald for de sætninger, der er tilbage. Sprog-løse enheder
// sendes aldrig (oversaetKunSprog). Fejler et kald, kastes der videre, så
// kalderen beholder originalen.
type BeskytTrin = (s: string) => BeskyttetKilde;
const UDEN_TOKENS: BeskytTrin = (s) => ({ tekst: s, erstatninger: [] });

async function trinvisOversaet(
  tekster: string[],
  kilde: string,
  maal: string,
  trin: BeskytTrin[],
  forbered: (t: string) => string = (t) => t,
): Promise<string[]> {
  const delt = tekster.map((e) => splitSaetninger(forbered(e)));
  const flade: string[] = delt.flatMap((d) => d.dele);
  const ud: string[] = new Array(flade.length).fill('');
  const kald = (u: string[]) => motorKald(u, kilde, maal, true);

  let tilbage = flade.map((_, i) => i);
  for (const beskyt of trin) {
    if (tilbage.length === 0) break;
    const b = tilbage.map((i) => beskyt(flade[i]));
    const raa = await oversaetKunSprog(b.map((x) => x.tekst), kald);
    const naeste: number[] = [];
    tilbage.forEach((i, k) => {
      const r = genindsaetTermer(raa[k] ?? '', b[k].erstatninger);
      ud[i] = r;
      if (b[k].erstatninger.length > 0 && erTokenSkadet(r, b[k].erstatninger)) naeste.push(i);
    });
    tilbage = naeste;
  }

  let pos = 0;
  return delt.map((d) => {
    const dele = ud.slice(pos, pos + d.dele.length);
    pos += d.dele.length;
    return samlSaetninger(dele, d.skilletegn);
  });
}

// en->sv-pivoten (U1b, live 27-11), trin:
//   A) faste svenske fagtermer (EN_SV) + bevar-ord som tokens  (bedst)
//   B) kun bevar-ord som tokens                                   (som v3-lt-f)
//   C) uden tokens                                                (som før U1b)
async function pivotTilSvensk(engelsk: string[], maal: string, _brugLT: boolean): Promise<string[]> {
  return trinvisOversaet(engelsk, 'en', maal, [beskytTilSvensk, beskytBevar, UDEN_TOKENS]);
}

// U3b: ikke-dansk kilde (sv/en) -> andet sprog UDEN den dansk-tunede ordliste.
// Rensning (struktur, sprog-neutral), sætning-for-sætning, BEVAR-tokens
// (versioner, akronymer, modelnavne - sprog-neutrale) med fallback uden tokens,
// sprog-løs-værn. LibreTranslate pivoterer selv via engelsk hvor der ikke er en
// direkte model (sv->da).
async function udenOrdliste(tekster: string[], kilde: Kildesprog, maal: Kildesprog): Promise<string[]> {
  return trinvisOversaet(tekster, kilde, maal, [beskytBevar, UDEN_TOKENS], rensKilde);
}

// U3b: én indgang for ALLE retninger mellem da/sv/en. Kilde == mål -> originalen.
//   da->en: rapportens da-pipeline (ordliste + BEVAR + sætning-for-sætning)
//   da->sv: da->en + pivoten (EN_SV)
//   en->sv: pivoten direkte
//   sv->en, sv->da, en->da: udenOrdliste
// Kaster hvis motoren fejler (kalderen beholder originalen).
export async function oversaetFraKilde(
  tekster: string[],
  kilde: Kildesprog,
  maal: Kildesprog,
): Promise<string[]> {
  if (tekster.length === 0) return [];
  if (kilde === maal) return [...tekster];
  if (kilde === 'da') return motorOversaet(tekster, maal);
  if (kilde === 'en' && maal === 'sv') return pivotTilSvensk(tekster, 'sv', true);
  return udenOrdliste(tekster, kilde, maal);
}

// Grupperer tekster efter kildesprog og oversætter hver gruppe med ét kald-forløb.
// Rækkefølgen bevares. Bruges af rapportens meldinger og kommentarer.
async function oversaetBlandet(
  tekster: string[],
  kilder: Kildesprog[],
  maal: Kildesprog,
): Promise<string[]> {
  const ud = [...tekster];
  const grupper = new Map<Kildesprog, number[]>();
  kilder.forEach((k, i) => {
    if (k === maal) return; // originalen er record - vises uoversat
    (grupper.get(k) ?? grupper.set(k, []).get(k)!).push(i);
  });
  for (const [kilde, idx] of grupper) {
    const r = await oversaetFraKilde(idx.map((i) => tekster[i]), kilde, maal);
    idx.forEach((i, k) => {
      ud[i] = r[k] ?? tekster[i];
    });
  }
  return ud;
}

// U3b: LibreTranslate /detect (bruges kun når heuristikken er usikker). null ved
// fejl/ukendt/lav konfidens.
export async function ltDetekt(tekst: string): Promise<{ sprog: Kildesprog | null; raa: string | null }> {
  if (!LT_URL || !tekst.trim()) return { sprog: null, raa: null };
  try {
    const body: Record<string, unknown> = { q: tekst.slice(0, 2000) };
    if (LT_KEY) body.api_key = LT_KEY;
    const res = await fetch(`${LT_URL.replace(/\/$/, '')}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { sprog: null, raa: null };
    const data = (await res.json()) as { language?: string; confidence?: number }[];
    const top = Array.isArray(data) ? data[0] : null;
    return {
      sprog: fraLtDetekt(data),
      raa: top?.language ? `${top.language} (${Math.round(top.confidence ?? 0)})` : null,
    };
  } catch {
    return { sprog: null, raa: null };
  }
}

// U1b: rapportens da->en/sv-pipeline (rensning, term-beskyttelse, ordliste/BEVAR,
// sætning-for-sætning, sprog-løs-værn, BEVAR på pivoten) til ANDET dansk fagindhold
// - OTA-noterne på /software. Kaster hvis motoren fejler (kalderen beholder dansk).
export async function oversaetFraDansk(tekster: string[], maal: 'en' | 'sv'): Promise<string[]> {
  if (tekster.length === 0) return [];
  return motorOversaet(tekster, maal);
}

// Cache-nøgle for oversat indhold: sha1 af MOTOR_ID + kilde, så både en redigering
// og et motor-/ordliste-skift giver cache-miss.
export function oversaetKildeHash(kilde: string): string {
  return hash(kilde);
}

// Cache-nøgle for en meldings oversættelse: kildesprog + titel + beskrivelse
// (MOTOR_ID foldes ind af hash()). Et rettet kildesprog giver dermed cache-miss.
function fejlKildeHash(f: Pick<RapportFejl, 'sprog' | 'title' | 'description'>): string {
  return hash(`${f.sprog}\n${f.title}\n${f.description}`);
}

// U3b: meldingerne oversættes fra deres RIGTIGE kildesprog (issues.sprog). En
// melding hvis kildesprog ER rapportens sprog vises uoversat (originalen er
// record) - fx en svensk melding i den svenske rapport. Den danske rapport
// (MAALSPROG da = null) viser som altid originalerne.
export async function oversaetFejl(fejl: RapportFejl[], sprog: RapportSprog): Promise<RapportFejl[]> {
  const maal = MAALSPROG[sprog] as Kildesprog | null;
  if (!maal || (!LT_URL && !NLLB_URL) || fejl.length === 0) return fejl;

  const sb = supabaseServer();
  const resultat: RapportFejl[] = [...fejl];
  const mangler: number[] = [];

  // Kun meldinger på et ANDET sprog end rapportens skal oversættes.
  const skalOversaettes = fejl.filter((f) => f.sprog !== maal);
  if (skalOversaettes.length === 0) return resultat;

  // 1) Cache-opslag i ét kald.
  const { data: cacheRows } = await sb
    .from('oversaettelser')
    .select('issue_id, kilde_hash, titel, beskrivelse')
    .in('issue_id', skalOversaettes.map((f) => f.id))
    .eq('sprog', sprog);
  const cache = new Map<string, { kilde_hash: string; titel: string; beskrivelse: string }>();
  for (const r of (cacheRows ?? []) as any[]) cache.set(r.issue_id, r);

  fejl.forEach((f, i) => {
    if (f.sprog === maal) return;
    const c = cache.get(f.id);
    if (c && c.kilde_hash === fejlKildeHash(f)) {
      resultat[i] = { ...f, title: c.titel, description: c.beskrivelse };
    } else {
      mangler.push(i);
    }
  });

  if (mangler.length === 0) return resultat;

  // 2) Oversæt manglende i små klumper (5 meldinger = 10 strenge). Titler og
  //    beskrivelser går hver for sig gennem oversaetBlandet, som grupperer på
  //    kildesprog (da-stien med ordliste, sv/en-stien uden). Trin 2.4's titel-
  //    rutning og NLLB-længdevagten er overflødige siden trin 2.5 (alt er LT).
  const KLUMP = 5;
  for (let start = 0; start < mangler.length; start += KLUMP) {
    const gruppe = mangler.slice(start, start + KLUMP);
    const kilder = gruppe.map((i) => fejl[i].sprog);
    let oversatTitler: string[];
    let oversatBeskr: string[];
    try {
      [oversatTitler, oversatBeskr] = await Promise.all([
        oversaetBlandet(gruppe.map((i) => fejl[i].title), kilder, maal),
        oversaetBlandet(gruppe.map((i) => fejl[i].description), kilder, maal),
      ]);
    } catch (e) {
      console.error('[oversaet] klump fejlede, beholder originalen:', e);
      continue;
    }

    const upserts: any[] = [];
    gruppe.forEach((i, j) => {
      const f = fejl[i];
      const nyTitel = oversatTitler[j] ?? f.title;
      const nyBesk = oversatBeskr[j] ?? f.description;
      resultat[i] = { ...f, title: nyTitel, description: nyBesk };
      upserts.push({
        issue_id: f.id,
        sprog,
        kilde_hash: fejlKildeHash(f),
        titel: nyTitel,
        beskrivelse: nyBesk,
        updated_at: new Date().toISOString(),
      });
    });
    try {
      await sb.from('oversaettelser').upsert(upserts, { onConflict: 'issue_id,sprog' });
    } catch (e) {
      console.error('[oversaet] kunne ikke cache:', e);
    }
  }

  return resultat;
}

// kilde_hash af en kommentar-body. hash() prefixer MOTOR_ID (v3-lt), så et
// motor-skift giver hash-mismatch -> cache-miss -> gen-oversættelse (præcis som
// meldingernes `oversaettelser`). Sprog ligger i PK'en (comment_id, sprog), ikke i
// hash'et - samme opdeling som meldingerne.
function kommentarKildeHash(tekst: string): string {
  return hash(tekst);
}

// Motor + trin 2.1-længde-vagt + trin 2.2-degenerations-værn for en liste tekster
// (kun aktivt på NLLB-stien; på v3-lt tvinger motorOversaet LT, så værnet er en
// no-op-backup). Samme mønster som oversaetFejl - hver kommentar er ét felt, så
// begge tjek kører på den. Kaster videre hvis motoren fejler helt, så kernens
// klump-try/catch beholder dansk (ikke cachet) og et genforsøg prøver igen.
async function oversaetMedVaern(tekster: string[], maal: string): Promise<string[]> {
  // U3b: hver kommentar oversættes fra sit eget kildesprog (heuristikken - en
  // kommentar har ingen sprog-kolonne; reglen er deterministisk på teksten, så
  // cache-nøglen hash(tekst) forbliver gyldig). En kommentar på rapportens sprog
  // vises uoversat.
  const m = maal as Kildesprog;
  const oversat = await oversaetBlandet(tekster, tekster.map(kildesprogAf), m);
  if (NLLB_URL && LT_URL) {
    const tabt: number[] = [];
    tekster.forEach((t, j) => {
      const u = oversat[j] ?? '';
      if (kildesprogAf(t) === 'da' && (erIndholdstab(t, u) || erDegeneration(t, u))) tabt.push(j);
    });
    if (tabt.length > 0) {
      try {
        const ltUd = await motorOversaet(tabt.map((j) => tekster[j]), maal, true);
        tabt.forEach((j, k) => { if (ltUd[k] != null) oversat[j] = ltUd[k]; });
      } catch (e) {
        console.error('[oversaet] kommentar-værn: LibreTranslate-fallback fejlede, beholder forsøg:', e);
      }
    }
  }
  return oversat;
}

// Oversætter rapportens kommentarer med HOLDBAR DB-cache `kommentar_oversaettelser`
// (trin 2.6) - præcis som meldingernes `oversaettelser`. Erstatter den tidligere
// in-memory cache, der tømtes ved hvert deploy og tvang den hårde rapport kold
// forfra. Kernen (lib/rapport-kommentar-cache.ts) håndterer hit/miss/hash-mismatch +
// dedupe af identiske bodies + klump-konvergens; her wires den mod Supabase + motor.
// En redigeret kommentar ændrer body -> kilde_hash-mismatch -> gen-oversættes. Et
// deploy nulstiller ikke længere fremgangen; et timeout midt i en generering gemmer
// de færdige klumper i DB'en, så næste forsøg læser cache og konvergerer.
export async function oversaetKommentarer(komm: KommentarInput[], sprog: RapportSprog): Promise<string[]> {
  const maal = MAALSPROG[sprog];
  if (!maal || (!LT_URL && !NLLB_URL) || komm.length === 0) return komm.map((k) => k.tekst);

  const sb = supabaseServer();
  return oversaetKommentarerKerne(komm, {
    noegle: kommentarKildeHash,
    hentCache: async (ids) => {
      const { data } = await sb
        .from('kommentar_oversaettelser')
        .select('comment_id, kilde_hash, oversat')
        .in('comment_id', ids)
        .eq('sprog', sprog);
      return (data ?? []) as { comment_id: string; kilde_hash: string; oversat: string }[];
    },
    skrivCache: async (raekker) => {
      if (raekker.length === 0) return;
      await sb.from('kommentar_oversaettelser').upsert(
        raekker.map((r) => ({
          comment_id: r.comment_id,
          sprog,
          kilde_hash: r.kilde_hash,
          oversat: r.oversat,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'comment_id,sprog' },
      );
    },
    oversaet: (unikke) => oversaetMedVaern(unikke, maal),
  });
}

// Er der overhovedet en oversætter-motor konfigureret (NLLB eller LibreTranslate)?
// Bruges af opvarmningen (trin 2.7) til straks at svare "intet at forberede" uden at
// hente udvalget, når rapporten alligevel kun kan være dansk.
export function oversaetterKonfigureret(): boolean {
  return Boolean(LT_URL || NLLB_URL);
}

export type OversaetStatus = {
  konfigureret: boolean;
  motor: 'nllb' | 'libretranslate' | null;
  vaert: string | null;
  ok: boolean;
  prove?: { kilde: string; resultat: string };
  fejl?: string;
  // U3b: måling af svensk KILDE - LT /detect, heuristikken, den gamle vej (svensk
  // tekst sendt gennem da-stien med dansk ordliste, som før U3b) og de nye veje.
  svensk?: SvenskMaaling[];
};

export type SvenskMaaling = {
  kilde: string;
  heuristik: string; // fx "sv (sikker)"
  ltDetekt: string | null; // fx "sv (92)"
  gammelEn: string; // da-stien (før U3b)
  nyEn: string; // sv->en uden ordliste
  nyDa: string; // sv->da (board-titler for danske læsere)
  fejl?: string;
};

const SVENSKE_PROEVER = [
  'Nödbromsning vid backning',
  'Bilen nödbromsar ibland när jag backar ut från garaget, trots att det inte finns något hinder. Det började efter uppdateringen till 3.0.3 och ACC stängs av.',
  'Bilen startar inte alltid och skärmen blir svart i kylan.',
];

async function maalSvensk(): Promise<SvenskMaaling[]> {
  const ud: SvenskMaaling[] = [];
  for (const kilde of SVENSKE_PROEVER) {
    const g = gaetKildesprog(kilde);
    const heuristik = `${g.sprog} (${g.sikker ? 'sikker' : 'usikker'})`;
    try {
      const [detekt, [gammelEn], [nyEn], [nyDa]] = await Promise.all([
        ltDetekt(kilde),
        motorOversaet([kilde], 'en'),
        oversaetFraKilde([kilde], 'sv', 'en'),
        oversaetFraKilde([kilde], 'sv', 'da'),
      ]);
      ud.push({ kilde, heuristik, ltDetekt: detekt.raa, gammelEn, nyEn, nyDa });
    } catch (e) {
      ud.push({ kilde, heuristik, ltDetekt: null, gammelEn: '', nyEn: '', nyDa: '', fejl: e instanceof Error ? e.message : String(e) });
    }
  }
  return ud;
}

// "Test oversættelse" i admin - live-diagnose af den AKTIVE rapport-motor (NLLB når
// NLLB_URL er sat, ellers LibreTranslate). Kører den rigtige pipeline (motorOversaet),
// så term-/rensnings-laget og en evt. NLLB->LibreTranslate-fallback testes med.
export async function oversaetDiagnose(): Promise<OversaetStatus> {
  const motor: OversaetStatus['motor'] = NLLB_URL ? 'nllb' : LT_URL ? 'libretranslate' : null;
  const aktivUrl = NLLB_URL || LT_URL;
  if (!aktivUrl) return { konfigureret: false, motor: null, vaert: null, ok: false };
  let vaert = aktivUrl;
  try {
    vaert = new URL(aktivUrl).host;
  } catch {
    /* behold rå værdi */
  }
  const kilde = 'Bilen bremser pludseligt i bakgear.';
  try {
    const [resultat] = await motorOversaet([kilde], 'en');
    const svensk = LT_URL ? await maalSvensk() : undefined;
    return { konfigureret: true, motor, vaert, ok: true, prove: { kilde, resultat }, svensk };
  } catch (e) {
    return { konfigureret: true, motor, vaert, ok: false, fejl: e instanceof Error ? e.message : String(e) };
  }
}
