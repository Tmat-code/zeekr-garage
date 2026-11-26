// Oversætter RAPPORTENS meldings-tekster (titel + beskrivelse) via en selvhostet
// motor - NLLB-600M når NLLB_URL er sat (trin 2), ellers LibreTranslate (trin 1) -
// med term-beskyttelse + kilde-rensning uden om og cache i databasen. Graceful:
// ingen motor-URL eller dansk → original; NLLB-fejl → fallback til LibreTranslate.

import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';
import { MAALSPROG, type RapportSprog } from '@/lib/rapport-i18n';
import type { RapportFejl } from '@/lib/rapport';
import { forberedSaetninger, samlOversatteSaetninger, erIndholdstab, erDegeneration } from '@/lib/rapport-ordliste';

const LT_URL = process.env.LIBRETRANSLATE_URL || '';
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const NLLB_URL = process.env.NLLB_URL || '';

// Aktiv RAPPORT-motor: NLLB-600M når NLLB_URL er sat (trin 2 - bedre kvalitet på
// rapportens fagsprog), ellers LibreTranslate (trin 1). Motor-id'et foldes ind i
// cache-hash'et (nedenfor) så en NLLB- og en LibreTranslate-oversættelse af samme
// kilde aldrig forveksles i `oversaettelser` - ingen migration nødvendig.
// BEMÆRK: dette er RAPPORTENS motor. Forum-oversættelsen (senere trin 3) skal blive
// på LibreTranslate/gist og må IKKE route gennem denne NLLB-vej.
// v2-nllb-d (trin 2.4, titel-rutning): den fulde "alle"-rapport viste at
// degenerations-værnet (v2-nllb-c) kun fangede den GENTAGENDE #1 - tre flere korte
// titler degenererede til flydende, ikke-gentagende boilerplate som heuristik ikke
// kan fange. Løsningen er rutning, ikke mere detektion: titler oversættes nu med
// LibreTranslate (se oversaetFejl), beskrivelser + kommentarer bliver på NLLB.
// Bumpet buster cachen så titlerne re-oversættes via LibreTranslate. Hash dækker
// fortsat HELE meldingen (titel+beskrivelse), ingen migration.
const MOTOR_ID = NLLB_URL ? 'v2-nllb-d' : 'v1';

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
  const raa = await motorKald(flade, 'da', 'en', tvingLT);
  return forb.map((f, i) => {
    const { start, antal } = spaend[i];
    return samlOversatteSaetninger(raa.slice(start, start + antal), f);
  });
}

// da->en direkte; da->andet pivoterer via den RENSEDE/BESKYTTEDE engelske (hverken
// Argos eller vores NLLB-brug laver direkte da->sv her - pivoten holder term-laget
// om da->en-trinnet uændret og lader de engelske termer følge med til sv).
async function motorOversaet(tekster: string[], maal: string, tvingLT = false): Promise<string[]> {
  const engelsk = await daTilEngelsk(tekster, tvingLT);
  if (maal === 'en') return engelsk;
  return motorKald(engelsk, 'en', maal, tvingLT);
}

export async function oversaetFejl(fejl: RapportFejl[], sprog: RapportSprog): Promise<RapportFejl[]> {
  const maal = MAALSPROG[sprog];
  if (!maal || (!LT_URL && !NLLB_URL) || fejl.length === 0) return fejl;

  const sb = supabaseServer();
  const resultat: RapportFejl[] = [...fejl];
  const mangler: number[] = [];

  // 1) Cache-opslag i ét kald.
  const { data: cacheRows } = await sb
    .from('oversaettelser')
    .select('issue_id, kilde_hash, titel, beskrivelse')
    .in('issue_id', fejl.map((f) => f.id))
    .eq('sprog', sprog);
  const cache = new Map<string, { kilde_hash: string; titel: string; beskrivelse: string }>();
  for (const r of (cacheRows ?? []) as any[]) cache.set(r.issue_id, r);

  fejl.forEach((f, i) => {
    const kildeHash = hash(`${f.title}\n${f.description}`);
    const c = cache.get(f.id);
    if (c && c.kilde_hash === kildeHash) {
      resultat[i] = { ...f, title: c.titel, description: c.beskrivelse };
    } else {
      mangler.push(i);
    }
  });

  if (mangler.length === 0) return resultat;

  // 2) Oversæt manglende i små klumper (5 meldinger = 10 strenge).
  const KLUMP = 5;
  for (let start = 0; start < mangler.length; start += KLUMP) {
    const gruppe = mangler.slice(start, start + KLUMP);
    // TITEL-RUTNING (trin 2.4): titler -> ALTID LibreTranslate; beskrivelser -> NLLB.
    // NLLB (grådig, distilleret) hallucinerer korte TITLER til flydende, IKKE-
    // gentagende boilerplate ("The vehicle shall be equipped with a 'R' system",
    // "The following information is provided for the purpose of this Annex") der
    // hverken er et drop eller gentagende - altså uopdageligt for det heuristiske
    // værn - og OVENI er det ikke-deterministisk: samme titel kan være fin i én
    // kørsel og degenereret i næste (batch-afhængigt, da alle sætninger sendes i ét
    // kald). Heuristik-jagt er derfor whack-a-mole. I stedet fjernes ÅRSAGEN: NLLB
    // free-runner kun på korte input, så korte titler oversættes med LibreTranslate
    // (mere ordret, laver ikke den fejl). Beskrivelser (længere tekst) bliver på
    // NLLB hvor den er stærk og ikke degenererer, med content-loss-/degenerations-
    // værnet som backup. Budskabet skal nå frem - en lidt mindre flydende titel er
    // langt bedre end hallucineret boilerplate der vildleder Zeekr.
    let oversatTitler: string[];
    let oversatBeskr: string[];
    try {
      [oversatTitler, oversatBeskr] = await Promise.all([
        motorOversaet(gruppe.map((i) => fejl[i].title), maal, true), // tving LibreTranslate
        motorOversaet(gruppe.map((i) => fejl[i].description), maal),  // NLLB
      ]);
    } catch (e) {
      console.error('[oversaet] klump fejlede, beholder dansk:', e);
      continue;
    }

    // Content-loss-/degenerations-værn på BESKRIVELSERNE (NLLB-stien): kan NLLB
    // droppe en sætning (`erIndholdstab`) eller - sjældent på længere tekst -
    // degenerere (`erDegeneration`), genoversæt NETOP den beskrivelse med
    // LibreTranslate. Titlerne er allerede LibreTranslate, så de behøver ikke værnet.
    if (NLLB_URL && LT_URL) {
      const tabt: number[] = []; // indeks ind i gruppe
      gruppe.forEach((i, j) => {
        const ud = oversatBeskr[j] ?? '';
        if (erIndholdstab(fejl[i].description, ud) || erDegeneration(fejl[i].description, ud)) tabt.push(j);
      });
      if (tabt.length > 0) {
        try {
          const ltUd = await motorOversaet(tabt.map((j) => fejl[gruppe[j]].description), maal, true);
          tabt.forEach((j, k) => {
            if (ltUd[k] != null) oversatBeskr[j] = ltUd[k];
          });
        } catch (e) {
          console.error('[oversaet] beskrivelses-vagt: LibreTranslate-fallback fejlede, beholder NLLB-forsøg:', e);
        }
      }
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
        kilde_hash: hash(`${f.title}\n${f.description}`),
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

// In-memory cache for kommentar-oversættelser. Kommentarerne har ingen DB-cache
// (modsat meldingernes `oversaettelser`-tabel), så UDEN dette genoversatte en hård
// rapport ALLE kommentarer forfra ved hvert forsøg - ét kæmpe NLLB-kald der sprang
// Cloudflare-timeouten (524) og aldrig konvergerede. Cachen lever i server-processen:
// en generering der timer ud kører videre server-side og fylder cachen pr. klump, så
// NÆSTE forsøg springer det gjorte over og konvergerer - samme konvergens som
// meldingernes DB-cache giver. Tabes ved redeploy/genstart (acceptabelt: rapporten
// regenereres sjældent og varmer selv op igen). INGEN migration.
const kommentarCache = new Map<string, string>();
const KOMMENTAR_CACHE_MAKS = 50000;

// Cache-nøgle: hash() prefixer MOTOR_ID (v1/v2-nllb), så motor-skift aldrig
// forveksles; sprog foldes ind så en/sv ikke kolliderer.
function kommentarNoegle(sprog: string, tekst: string): string {
  return hash(`kommentar\n${sprog}\n${tekst}`);
}

// Oversætter en simpel liste af tekster (fx kommentarer). In-memory cache (ovenfor)
// + småklumper, PRÆCIS som oversaetFejl for meldingerne, så en hård rapport
// konvergerer på genforsøg i stedet for at time ud forfra hver gang. Får samme trin
// 2.1-værn: sætnings-split (lag 1, inde i motorOversaet) + længde-vagt (lag 2) - en
// kommentar hvis NLLB-output ser ud til at have tabt indhold genoversættes med
// LibreTranslate. Graceful: en fejlet klump beholder dansk (og caches IKKE, så et
// genforsøg prøver igen).
export async function oversaetTekster(tekster: string[], sprog: RapportSprog): Promise<string[]> {
  const maal = MAALSPROG[sprog];
  if (!maal || (!LT_URL && !NLLB_URL) || tekster.length === 0) return tekster;

  // 1) Cache-opslag; saml de manglende.
  const ud: string[] = new Array(tekster.length);
  const mangler: number[] = [];
  tekster.forEach((t, i) => {
    const c = kommentarCache.get(kommentarNoegle(sprog, t));
    if (c != null) ud[i] = c;
    else mangler.push(i);
  });
  if (mangler.length === 0) return ud;

  // 2) Oversæt kun de manglende, i småklumper. Hvert klump-kald når at blive færdigt
  //    under NLLB-abort/Cloudflare-timeouten, og hvert gennemført klump caches, så et
  //    genforsøg springer det over.
  const KLUMP = 5;
  for (let start = 0; start < mangler.length; start += KLUMP) {
    const gruppe = mangler.slice(start, start + KLUMP);
    const kilder = gruppe.map((i) => tekster[i]);

    let oversat: string[];
    try {
      oversat = await motorOversaet(kilder, maal);
    } catch (e) {
      console.error('[oversaet] kommentar-klump fejlede, beholder dansk:', e);
      gruppe.forEach((i) => { ud[i] = tekster[i]; }); // graceful dansk, IKKE cachet
      continue;
    }

    // Trin 2.1 længde-vagt + trin 2.2 degenerations-værn pr. kommentar (samme
    // mønster som oversaetFejl; kommentaren er ét felt, så begge tjek kører på den).
    if (NLLB_URL && LT_URL) {
      const tabt: number[] = []; // index ind i gruppe
      gruppe.forEach((i, j) => {
        const ud = oversat[j] ?? '';
        if (erIndholdstab(tekster[i], ud) || erDegeneration(tekster[i], ud)) tabt.push(j);
      });
      if (tabt.length > 0) {
        try {
          const ltUd = await motorOversaet(tabt.map((j) => tekster[gruppe[j]]), maal, true);
          tabt.forEach((j, k) => { if (ltUd[k] != null) oversat[j] = ltUd[k]; });
        } catch (e) {
          console.error('[oversaet] længde-vagt (kommentarer): LibreTranslate-fallback fejlede, beholder NLLB-forsøg:', e);
        }
      }
    }

    // Skriv resultat + cache de gennemførte.
    if (kommentarCache.size > KOMMENTAR_CACHE_MAKS) kommentarCache.clear();
    gruppe.forEach((i, j) => {
      const t = oversat[j] ?? tekster[i];
      ud[i] = t;
      kommentarCache.set(kommentarNoegle(sprog, tekster[i]), t);
    });
  }

  return ud;
}

export type OversaetStatus = {
  konfigureret: boolean;
  motor: 'nllb' | 'libretranslate' | null;
  vaert: string | null;
  ok: boolean;
  prove?: { kilde: string; resultat: string };
  fejl?: string;
};

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
    return { konfigureret: true, motor, vaert, ok: true, prove: { kilde, resultat } };
  } catch (e) {
    return { konfigureret: true, motor, vaert, ok: false, fejl: e instanceof Error ? e.message : String(e) };
  }
}
