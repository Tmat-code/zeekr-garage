'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';

// Alle handlinger kraever moderator/admin. RLS haandhaever det ogsaa i DB
// (reports_update_mod, messages_delete_mod), men vi stopper tidligt med en
// laesbar fejl.
async function kraevModerator() {
  if (!(await erModerator())) {
    throw new Error('Du har ikke adgang til at moderere.');
  }
}

// Markér en anmeldelse som haandteret (eller fortryd). RLS: reports_update_mod.
export async function saetAnmeldelseHaandteret(
  reportId: string,
  handled: boolean,
): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const { error } = await sb
    .from('message_reports')
    .update({ handled })
    .eq('id', reportId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/beskeder');
}

// Slet den anmeldte besked og markér anmeldelsen haandteret. RLS:
// messages_delete_mod (slet) + reports_update_mod (handled). Beskedens FK i
// message_reports er 'on delete set null', saa anmeldelsen bliver staaende
// (nu uden besked) som historik.
export async function sletAnmeldtBesked(
  reportId: string,
  messageId: string,
): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();

  const { error: sletFejl } = await sb.from('messages').delete().eq('id', messageId);
  if (sletFejl) throw new Error(sletFejl.message);

  // Markér alle anmeldelser paa netop denne besked som haandteret (ikke kun
  // den aktuelle - samme besked kan vaere anmeldt flere gange).
  await sb.from('message_reports').update({ handled: true }).eq('message_id', messageId);

  revalidatePath('/admin/beskeder');
}
