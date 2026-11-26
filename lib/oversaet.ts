// Oversætter RAPPORTENS meldings-tekster (titel + beskrivelse) via en selvhostet
// motor - NLLB-600M når NLLB_URL er sat (trin 2), ellers LibreTranslate (trin 1) -
// med term-beskyttelse + kilde-rensning uden om og cache i databasen. Graceful:
// ingen motor-URL eller dansk → original; NLLB-fejl → fallback til LibreTranslate.

import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';
import { MAALSPROG, type RapportSprog } from '@/lib/rapport-i18n';
import type { RapportFejl } from '@/lib/rapport';
import { forberedSaetninger, samlOversatteSaetninger, erIndholdstab } from '@/lib/rapport-ordliste';

const LT_URL = process.env.LIBRETRANSLATE_URL || '';
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const NLLB_URL = process.env.NLLB_URL || '';

// Aktiv RAPPORT-motor: NLLB-600M når NLLB_URL er sat (trin 2 - bedre kvalitet på
// rapportens fagsprog), ellers LibreTranslate (trin 1). Motor-id'et foldes ind i
// cache-hash'et (nedenfor) så en NLLB- og en LibreTranslate-oversættelse af samme
// kilde aldrig forveksles i `oversaettelser` - ingen migration nødvendig.
// BEMÆRK: dette er RAPPORTENS motor. Forum-oversættelsen (senere trin 3) skal blive
// på LibreTranslate/gist og må IKKE route gennem denne NLLB-vej.
const MOTOR_ID = NLLB_URL ? 'v2-nllb' : 'v1';

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
    const tekster: string[] = [];
    gruppe.forEach((i) => tekster.push(fejl[i].title, fejl[i].description));

    let oversat: string[];
    try {
      oversat = await motorOversaet(tekster, maal);
    } catch (e) {
      console.error('[oversaet] klump fejlede, beholder dansk:', e);
      continue;
    }

    // Trin 2.1 længde-vagt: NLLB (grådig) kan droppe en hel sætning i lange
    // meldinger. Sammenlign per MELDING (titel+beskrivelse) mod den danske
    // kilde; ligner output indholdstab, så genoversæt NETOP den melding med
    // LibreTranslate (samme graceful mønster). Kun når NLLB er aktiv OG der er
    // en LibreTranslate at falde tilbage til. Sætnings-splittet ovenfor er
    // første værn; dette fanger de drastiske tab som splittet ikke dækker.
    if (NLLB_URL && LT_URL) {
      const tabt: number[] = []; // indeks ind i gruppe
      gruppe.forEach((i, j) => {
        const kilde = `${fejl[i].title}\n${fejl[i].description}`;
        const ud = `${oversat[j * 2] ?? ''}\n${oversat[j * 2 + 1] ?? ''}`;
        if (erIndholdstab(kilde, ud)) tabt.push(j);
      });
      if (tabt.length > 0) {
        const ltTekster: string[] = [];
        tabt.forEach((j) => ltTekster.push(fejl[gruppe[j]].title, fejl[gruppe[j]].description));
        try {
          const ltUd = await motorOversaet(ltTekster, maal, true); // tving LibreTranslate
          tabt.forEach((j, k) => {
            if (ltUd[k * 2] != null) oversat[j * 2] = ltUd[k * 2];
            if (ltUd[k * 2 + 1] != null) oversat[j * 2 + 1] = ltUd[k * 2 + 1];
          });
        } catch (e) {
          console.error('[oversaet] længde-vagt: LibreTranslate-fallback fejlede, beholder NLLB-forsøg:', e);
        }
      }
    }

    const upserts: any[] = [];
    gruppe.forEach((i, j) => {
      const f = fejl[i];
      const nyTitel = oversat[j * 2] ?? f.title;
      const nyBesk = oversat[j * 2 + 1] ?? f.description;
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

// Oversætter en simpel liste af tekster (fx kommentarer). Ingen cache. Graceful.
export async function oversaetTekster(tekster: string[], sprog: RapportSprog): Promise<string[]> {
  const maal = MAALSPROG[sprog];
  if (!maal || (!LT_URL && !NLLB_URL) || tekster.length === 0) return tekster;
  try {
    return await motorOversaet(tekster, maal);
  } catch (e) {
    console.error('[oversaet] kunne ikke oversætte kommentarer:', e);
    return tekster;
  }
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
