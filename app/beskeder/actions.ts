'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { soegBrugere, senesteKontakter } from '@/lib/beskeder';
import { MAKS_ANTAL } from '@/lib/billeder';
import type { AndenPart } from '@/lib/types';

async function kraevBruger() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at skrive beskeder.');
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

// Find-eller-opret en 1:1-samtale med en anden bruger. Returnerer samtale-id.
export async function startSamtaleMedBruger(otherId: string): Promise<string> {
  const { sb } = await kraevBruger();
  const { data, error } = await sb.rpc('start_samtale', { p_other: otherId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Kunne ikke starte samtalen.');
  revalidatePath('/beskeder');
  return data as string;
}

// Opret en gruppe-samtale (P12). others = de øvrige deltagere (mindst 2);
// jeg selv tilføjes af RPC'en. titel er valgfri (afledes ellers af navne).
export async function startGruppe(others: string[], titel: string): Promise<string> {
  const { sb } = await kraevBruger();
  const { data, error } = await sb.rpc('start_gruppe', {
    p_others: others,
    p_title: titel.trim() || null,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Kunne ikke oprette gruppen.');
  revalidatePath('/beskeder');
  return data as string;
}

// Tilføj en deltager til en gruppe (kun opretteren; RPC'en gater).
export async function tilfoejDeltager(convId: string, userId: string): Promise<void> {
  const { sb } = await kraevBruger();
  const { error } = await sb.rpc('gruppe_tilfoej_deltager', { p_conv: convId, p_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
}

// Fjern en deltager fra en gruppe (kun opretteren; ikke sig selv).
export async function fjernDeltager(convId: string, userId: string): Promise<void> {
  const { sb } = await kraevBruger();
  const { error } = await sb.rpc('gruppe_fjern_deltager', { p_conv: convId, p_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
}

// Forlad en gruppe (enhver deltager fjerner sig selv).
export async function forladGruppe(convId: string): Promise<void> {
  const { sb } = await kraevBruger();
  const { error } = await sb.rpc('gruppe_forlad', { p_conv: convId });
  if (error) throw new Error(error.message);
  revalidatePath('/beskeder');
}

// Omdøb en gruppe (kun opretteren; tom titel => afledes af navne i UI).
export async function omdoebGruppe(convId: string, titel: string): Promise<void> {
  const { sb } = await kraevBruger();
  const { error } = await sb.rpc('gruppe_omdoeb', { p_conv: convId, p_title: titel.trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
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
): Promise<string> {
  const { sb, user } = await kraevBruger();
  const b = body.trim();
  // Kun egne uploads (<user_id>/...), maks MAKS_ANTAL. RLS tjekker også ejerskab.
  const rene = (billeder ?? [])
    .filter((p) => typeof p === 'string' && p.startsWith(`${user.id}/`))
    .slice(0, MAKS_ANTAL);
  if (!b && rene.length === 0) throw new Error('Skriv en besked eller vedhæft et billede.');
  if (b.length > 5000) throw new Error('Beskeden er for lang.');

  const { data: msg, error } = await sb
    .from('messages')
    .insert({ conversation_id: convId, sender_id: user.id, body: b })
    .select('id')
    .single();
  if (error || !msg) {
    // RLS-afvisning (fx blokeret) giver en teknisk fejl - gør den læsbar.
    throw new Error(
      /row-level security|violates|permission/i.test(error?.message ?? '')
        ? 'Beskeden kunne ikke sendes (måske er I blokeret).'
        : (error?.message ?? 'Kunne ikke sende beskeden.'),
    );
  }

  // Vedhæft billed-rækker (RLS message_images_insert: kun egen besked).
  if (rene.length > 0) {
    const rows = rene.map((path, i) => ({ message_id: msg.id, path, display_order: i }));
    const { error: ie } = await sb.from('message_images').insert(rows);
    if (ie) throw new Error(ie.message);
  }

  revalidatePath(`/beskeder/${convId}`);
  revalidatePath('/beskeder');
  return msg.id as string;
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
export async function sletSamtale(convId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb
    .from('conversation_participants')
    .update({ hidden_at: new Date().toISOString() })
    .eq('conversation_id', convId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/beskeder');
}

export async function blokerBruger(convId: string, otherId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: otherId });
  if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
}

export async function fjernBlok(convId: string, otherId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', otherId);
  if (error) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
}

export async function anmeldBesked(
  convId: string,
  messageId: string | null,
  reason: string,
): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb.from('message_reports').insert({
    // Tom streng er ikke et gyldigt uuid -> brug null (anmeld hele samtalen).
    message_id: messageId || null,
    conversation_id: convId,
    reporter_id: user.id,
    reason: reason.trim() || null,
  });
  if (error) throw new Error(error.message);
}
