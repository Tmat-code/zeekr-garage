// Oversætter meldings-tekster (titel + beskrivelse) via selvhostet LibreTranslate,
// med cache i databasen. Graceful: ingen LIBRETRANSLATE_URL eller dansk → original.

import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';
import { MAALSPROG, type RapportSprog } from '@/lib/rapport-i18n';
import type { RapportFejl } from '@/lib/rapport';

const LT_URL = process.env.LIBRETRANSLATE_URL || '';
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || '';

function hash(s: string): string {
  return crypto.createHash('sha1').update('v1\n' + s).digest('hex');
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

// da->en direkte; da->andet pivoterer via engelsk (Argos har ingen direkte da->sv).
async function libreOversaet(tekster: string[], maal: string): Promise<string[]> {
  if (maal === 'en') return ltKald(tekster, 'da', 'en');
  const engelsk = await ltKald(tekster, 'da', 'en');
  return ltKald(engelsk, 'en', maal);
}

export async function oversaetFejl(fejl: RapportFejl[], sprog: RapportSprog): Promise<RapportFejl[]> {
  const maal = MAALSPROG[sprog];
  if (!maal || !LT_URL || fejl.length === 0) return fejl;

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
      oversat = await libreOversaet(tekster, maal);
    } catch (e) {
      console.error('[oversaet] klump fejlede, beholder dansk:', e);
      continue;
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
  if (!maal || !LT_URL || tekster.length === 0) return tekster;
  try {
    return await libreOversaet(tekster, maal);
  } catch (e) {
    console.error('[oversaet] kunne ikke oversætte kommentarer:', e);
    return tekster;
  }
}

export type OversaetStatus = {
  konfigureret: boolean;
  vaert: string | null;
  ok: boolean;
  prove?: { kilde: string; resultat: string };
  fejl?: string;
};

// "Test oversættelse" i admin — live-diagnose.
export async function oversaetDiagnose(): Promise<OversaetStatus> {
  if (!LT_URL) return { konfigureret: false, vaert: null, ok: false };
  let vaert = LT_URL;
  try {
    vaert = new URL(LT_URL).host;
  } catch {
    /* behold rå værdi */
  }
  const kilde = 'Bilen bremser pludseligt i bakgear.';
  try {
    const [resultat] = await libreOversaet([kilde], 'en');
    return { konfigureret: true, vaert, ok: true, prove: { kilde, resultat } };
  } catch (e) {
    return { konfigureret: true, vaert, ok: false, fejl: e instanceof Error ? e.message : String(e) };
  }
}
