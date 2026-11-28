'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { soegBrugere, senesteKontakter } from '@/lib/beskeder';
import { MAKS_ANTAL } from '@/lib/billeder';
import type { AndenPart } from '@/lib/types';
import { hentOrdbog } from '@/lib/i18n/server';
import { beskedFejlFraDb, type BeskedFejl } from '@/lib/beskeder-fejl';

const BESKED_MAKS_TEGN = 5000;

// U5: fejl gives tilbage som NØGLER (lib/beskeder-fejl.ts), ikke som tekst og
// aldrig som rå DB-fejl - klienten slår teksten op på læserens sprog, så den
// skifter med ved sprogskift. Ukendte DB-fejl logges og bliver til `fallback`.
export type BeskedSvar<T = undefined> = { ok: true; data: T } | { ok: false; fejl: BeskedFejl };

function fejlSvar(fejl: BeskedFejl): { ok: false; fejl: BeskedFejl } {
  return { ok: false, fejl };
}

function dbFejl(
  hvor: string,
  error: { message?: string } | null | undefined,
  fallback: BeskedFejl,
): { ok: false; fejl: BeskedFejl } {
  const kendt = beskedFejlFraDb(error?.message);
  if (!kendt) console.error(`[beskeder] ${hvor}:`, error?.message);
  return fejlSvar(kendt ?? fallback);
}

async function hentBruger() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

async function kraevBruger() {
  const { sb, user } = await hentBruger();
  if (!user) throw new Error((await hentOrdbog()).beskeder.fejl.logInd);
  return { sb, user };
}

// Søg modtagere til "Ny besked"-compose. Kræver login; selve filtreringen
// (mig selv + blokerede) ligger i soegBrugere.
export async function soegModtagere(q: string): Promise<AndenPart[]> {
  await kraevBruger();
  return soegBrugere(q);
}

// Seneste ejere jeg har skrevet med (trykbare forslag i "Ny besked").
export async function hentSenesteKontakter(): Promise<AndenPart[]> {
  await kraevBruger();
  return senesteKontakter();
}

// Find-eller-opret en 1:1-samtale med en anden bruger.
export async function startSamtale(otherId: string): Promise<BeskedSvar<string>> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const { data, error } = await sb.rpc('start_samtale', { p_other: otherId });
  if (error) return dbFejl('start_samtale', error, 'kunneIkkeStarte');
  if (!data) return fejlSvar('kunneIkkeStarte');
  revalidatePath('/beskeder');
  return { ok: true, data: data as string };
}

// Bagudkompatibel variant til forum-tråden + kommentarerne (U2/U3), som
// forventer et samtale-id eller en undtagelse med en læsbar tekst.
export async function startSamtaleMedBruger(otherId: string): Promise<string> {
  const r = await startSamtale(otherId);
  if (r.ok) return r.data;
  throw new Error((await hentOrdbog()).beskeder.fejl[r.fejl]);
}

// Opret en gruppe-samtale (P12). others = de øvrige deltagere (mindst 2);
// jeg selv tilføjes af RPC'en. titel er valgfri (afledes ellers af navne).
export async function startGruppe(others: string[], titel: string): Promise<BeskedSvar<string>> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  if ((others ?? []).length < 2) return fejlSvar('mindstTo');
  const { data, error } = await sb.rpc('start_gruppe', {
    p_others: others,
    p_title: titel.trim() || null,
  });
  if (error) return dbFejl('start_gruppe', error, 'kunneIkkeOpretteGruppe');
  if (!data) return fejlSvar('kunneIkkeOpretteGruppe');
  revalidatePath('/beskeder');
  return { ok: true, data: data as string };
}

// Fælles indpakning til gruppe-RPC'erne (alle gated i SQL).
async function gruppeRpc(
  fn: string,
  args: Record<string, unknown>,
  sti: string,
): Promise<BeskedSvar> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const { error } = await sb.rpc(fn, args);
  if (error) return dbFejl(fn, error, fn === 'gruppe_forlad' ? 'kunneIkkeForlade' : 'kunneIkkeGemme');
  revalidatePath(sti);
  return { ok: true, data: undefined };
}

// Tilføj en deltager til en gruppe (kun opretteren; RPC'en gater).
export async function tilfoejDeltager(convId: string, userId: string): Promise<BeskedSvar> {
  return gruppeRpc('gruppe_tilfoej_deltager', { p_conv: convId, p_user: userId }, `/beskeder/${convId}`);
}

// Fjern en deltager fra en gruppe (kun opretteren; ikke sig selv).
export async function fjernDeltager(convId: string, userId: string): Promise<BeskedSvar> {
  return gruppeRpc('gruppe_fjern_deltager', { p_conv: convId, p_user: userId }, `/beskeder/${convId}`);
}

// Forlad en gruppe (enhver deltager fjerner sig selv).
export async function forladGruppe(convId: string): Promise<BeskedSvar> {
  return gruppeRpc('gruppe_forlad', { p_conv: convId }, '/beskeder');
}

// Omdøb en gruppe (kun opretteren; tom titel => afledes af navne i UI).
export async function omdoebGruppe(convId: string, titel: string): Promise<BeskedSvar> {
  return gruppeRpc('gruppe_omdoeb', { p_conv: convId, p_title: titel.trim() || null }, `/beskeder/${convId}`);
}

// Send en besked i en samtale. RLS håndhæver deltager + ikke-blokeret.
// billeder = storage-paths uploadet til 'besked'-bucketen (P10). En besked må
// være kun-billede (tom tekst) så længe der er mindst ét billede - passer til
// mobil-kamera-flowet (snap og send). Returnerer den nye beskeds id (klienten
// bruger det til optimistisk visning + dedup mod realtime-ekkoet).
export async function sendBesked(
  convId: string,
  body: string,
  billeder: string[] = [],
): Promise<BeskedSvar<string>> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const b = body.trim();
  // Kun egne uploads (<user_id>/...), maks MAKS_ANTAL. RLS tjekker også ejerskab.
  const rene = (billeder ?? [])
    .filter((p) => typeof p === 'string' && p.startsWith(`${user.id}/`))
    .slice(0, MAKS_ANTAL);
  if (!b && rene.length === 0) return fejlSvar('tomBesked');
  if (b.length > BESKED_MAKS_TEGN) return fejlSvar('forLang');

  const { data: msg, error } = await sb
    .from('messages')
    .insert({ conversation_id: convId, sender_id: user.id, body: b })
    .select('id')
    .single();
  // RLS-afvisning (fx blokeret) -> 'blokeret' via beskedFejlFraDb.
  if (error || !msg) return dbFejl('send', error, 'kunneIkkeSende');

  // Vedhæft billed-rækker (RLS message_images_insert: kun egen besked).
  if (rene.length > 0) {
    const rows = rene.map((path, i) => ({ message_id: msg.id, path, display_order: i }));
    const { error: ie } = await sb.from('message_images').insert(rows);
    if (ie) return dbFejl('send-billeder', ie, 'kunneIkkeSende');
  }

  revalidatePath(`/beskeder/${convId}`);
  revalidatePath('/beskeder');
  return { ok: true, data: msg.id as string };
}

// Markér samtalen som læst: opdatér last_read_at + ryd pb_besked-notifikationer.
export async function markLaest(convId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  await sb
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', convId)
    .eq('user_id', user.id);
  await sb
    .from('notifications')
    .update({ er_laest: true })
    .eq('modtager_id', user.id)
    .eq('type', 'pb_besked')
    .eq('reference', convId)
    .eq('er_laest', false);
}

// Skjul-for-mig (P15): fjern samtalen fra MIN indbakke ved at sætte min egen
// deltager-rækkes hidden_at. Udsletter ikke den andens kopi; samtalen dukker op
// igen hos mig, hvis den anden skriver (ny besked bumper last_message_at).
// RLS conv_part_update_own tillader opdatering af egen række.
export async function sletSamtale(convId: string): Promise<BeskedSvar> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const { error } = await sb
    .from('conversation_participants')
    .update({ hidden_at: new Date().toISOString() })
    .eq('conversation_id', convId)
    .eq('user_id', user.id);
  if (error) return dbFejl('slet', error, 'kunneIkkeSlette');
  revalidatePath('/beskeder');
  return { ok: true, data: undefined };
}

export async function blokerBruger(convId: string, otherId: string): Promise<BeskedSvar> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const { error } = await sb
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: otherId });
  if (error && !/duplicate key/i.test(error.message)) {
    console.error('[beskeder] bloker:', error.message);
    return fejlSvar('nogetGikGalt');
  }
  revalidatePath(`/beskeder/${convId}`);
  return { ok: true, data: undefined };
}

export async function fjernBlok(convId: string, otherId: string): Promise<BeskedSvar> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const { error } = await sb
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', otherId);
  if (error) {
    console.error('[beskeder] fjern blok:', error.message);
    return fejlSvar('nogetGikGalt');
  }
  revalidatePath(`/beskeder/${convId}`);
  return { ok: true, data: undefined };
}

export async function anmeldBesked(
  convId: string,
  messageId: string | null,
  reason: string,
): Promise<BeskedSvar> {
  const { sb, user } = await hentBruger();
  if (!user) return fejlSvar('logInd');
  const { error } = await sb.from('message_reports').insert({
    // Tom streng er ikke et gyldigt uuid -> brug null (anmeld hele samtalen).
    message_id: messageId || null,
    conversation_id: convId,
    reporter_id: user.id,
    reason: reason.trim() || null,
  });
  if (error) {
    console.error('[beskeder] anmeld:', error.message);
    return fejlSvar('kunneIkkeAnmelde');
  }
  return { ok: true, data: undefined };
}
