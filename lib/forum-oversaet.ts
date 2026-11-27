// On-demand GIST-oversaettelse af forum-indlaeg (nordisk i18n, trin 3).
// MAA ALDRIG importeres i klient-kode (bruger service-role + node:crypto).
//
// EGEN LT-sti, bevidst adskilt fra rapportens motor (lib/oversaet.ts): forummet
// tvinger ALTID LibreTranslate og router ALDRIG gennem rapportens NLLB-vej. Saadan
// kan rapporten skifte motor uden at forummet foelger med - to-niveau-princippet
// (gist paa forum, praecision paa rapport, laast 25-11) holdt i KODEN.
//
// RAA GIST: INTET ordliste-/term-lag. Ordlisten er rapport-tunet; paa casual,
// fler-sproget forum-tekst vilde den give selvsikkert-forkerte oversaettelser
// (fx "lader bilen" -> charger / "lad os" -> let). Gist-baren er lav (FB-niveau),
// og originalen staar altid - saa raa LibreTranslate er den robuste, lav-vedlige-
// holdelses-vej. Viser rigtig trafik en term der konsekvent masses, tilfoejes et
// forum-vaern DENGANG, tunet mod rigtige eksempler (samme logik som P5).

import crypto from 'node:crypto';
import { supabaseService } from '@/lib/supabase/service';
import { erForumSprog, type ForumSprog } from '@/lib/forum-sprog';

const LT_URL = process.env.LIBRETRANSLATE_URL || '';
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || '';

export type ForumOversaettelse = {
  oversat: string;
  kildesprog: string | null; // LT's auto-detekterede kilde (til "Oversat fra X")
  uaendret: boolean; // kilde == maal (eller tomt resultat) -> original vist
};

function hashKilde(body: string): string {
  return crypto.createHash('sha1').update(body).digest('hex');
}

// Ét LibreTranslate-kald med source=auto: giver BAADE oversaettelsen OG det
// detekterede kildesprog i ét svar, saa vi slipper et separat /detect-kald.
async function ltForum(
  tekst: string,
  maal: ForumSprog,
): Promise<{ oversat: string; kilde: string | null }> {
  const body: Record<string, unknown> = { q: tekst, source: 'auto', target: maal, format: 'text' };
  if (LT_KEY) body.api_key = LT_KEY;
  const res = await fetch(`${LT_URL.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`LibreTranslate svarede ${res.status} (auto->${maal})`);
  const data = (await res.json()) as {
    translatedText: string | string[];
    detectedLanguage?: { language?: string } | { language?: string }[];
  };
  const oversat = Array.isArray(data.translatedText) ? data.translatedText[0] : data.translatedText;
  let kilde: string | null = null;
  const dl = data.detectedLanguage;
  if (Array.isArray(dl)) kilde = dl[0]?.language ?? null;
  else if (dl) kilde = dl.language ?? null;
  return { oversat: oversat ?? tekst, kilde };
}

// Oversaet ÉT forum-indlaeg til laeserens sprog (on-demand, ved klik).
//  - Henter body SERVER-SIDE fra DB (stoler ALDRIG paa klient-leveret tekst ->
//    ingen cache-poisoning). Fjernede indlaeg oversaettes ikke.
//  - DB-cache (forum_post_translations), keyet paa kilde-hash saa en redigering
//    giver cache-miss -> gen-oversaettes. Privat tabel: KUN service-role (denne
//    sti) laeser/skriver, saa en anonym laeser kan udloese en skrivning uden en
//    klient-skrivbar policy, og fjernet indhold kan ikke hentes offentligt.
//  - Best-effort: fejler LT, returneres originalen (ingen crash, knappen viser
//    bare uaendret tekst).
export async function oversaetIndlaeg(postId: string, maal: string): Promise<ForumOversaettelse> {
  if (!erForumSprog(maal) || !LT_URL) {
    return { oversat: '', kildesprog: null, uaendret: true };
  }
  const svc = supabaseService();

  // 1) Hent den AUTORITATIVE body server-side.
  const { data: post } = await svc
    .from('forum_posts')
    .select('body, is_removed')
    .eq('id', postId)
    .maybeSingle();
  if (!post || post.is_removed || !post.body || !String(post.body).trim()) {
    return { oversat: '', kildesprog: null, uaendret: true };
  }
  const body = post.body as string;
  const kildeHash = hashKilde(body);

  // 2) Cache-opslag; en hash-match serverer det cachede snapshot.
  const { data: rad } = await svc
    .from('forum_post_translations')
    .select('kilde_hash, kildesprog, oversat')
    .eq('post_id', postId)
    .eq('maalsprog', maal)
    .maybeSingle();
  if (rad && rad.kilde_hash === kildeHash) {
    const o = rad.oversat as string;
    return {
      oversat: o,
      kildesprog: (rad.kildesprog as string | null) ?? null,
      uaendret: o.trim() === body.trim(),
    };
  }

  // 3) Oversaet (raa gist, LT auto-detekt).
  let oversat: string;
  let kilde: string | null;
  try {
    const r = await ltForum(body, maal);
    oversat = r.oversat;
    kilde = r.kilde;
  } catch (e) {
    console.error('[forum-oversaet] LT fejlede:', e);
    return { oversat: body, kildesprog: null, uaendret: true };
  }

  // Kilde == maal (eller LT gav teksten uaendret tilbage): intet reelt oversat.
  const uaendret = (kilde ?? '').toLowerCase() === maal || oversat.trim() === body.trim();

  // 4) Cache (service-role upsert paa (post_id, maalsprog)). Vi cacher OGSAA et
  //    "uaendret"-resultat, saa vi sparer detekt naeste gang.
  try {
    await svc.from('forum_post_translations').upsert(
      {
        post_id: postId,
        maalsprog: maal,
        kilde_hash: kildeHash,
        kildesprog: kilde,
        oversat,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'post_id,maalsprog' },
    );
  } catch (e) {
    console.error('[forum-oversaet] kunne ikke cache:', e);
  }

  return { oversat, kildesprog: kilde, uaendret };
}

// Slet-ved-fjern: ryd et indlaegs cachede oversaettelser naar det fjernes
// (best-effort). Tabellen er privat (ingen offentlig laesning), saa en lingrende
// raekke er ikke et leak - oversaetIndlaeg naegter alligevel at servere et fjernet
// indlaeg - men vi rydder for hygiejne. Hard-delete af selve indlaegget tager dem
// via ON DELETE CASCADE.
export async function sletIndlaegOversaettelser(postId: string): Promise<void> {
  try {
    await supabaseService().from('forum_post_translations').delete().eq('post_id', postId);
  } catch (e) {
    console.error('[forum-oversaet] kunne ikke slette oversaettelser:', e);
  }
}
