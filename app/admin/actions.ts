'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { STATUSES, SEVERITIES, type Status, type Severity } from '@/lib/config';

// Alle handlinger kraever moderator/admin. RLS haandhaever det ogsaa i DB,
// men vi stopper tidligt med en laesbar fejl.
async function kraevModerator() {
  if (!(await erModerator())) {
    throw new Error('Du har ikke adgang til at moderere.');
  }
}

function revalider() {
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function saetStatus(issueId: string, status: Status): Promise<void> {
  await kraevModerator();
  if (!STATUSES.includes(status)) throw new Error('Ugyldig status.');
  const sb = supabaseServer();
  const { error } = await sb.from('issues').update({ status }).eq('id', issueId);
  if (error) throw new Error(error.message);
  revalider();
}

export async function saetSeverity(issueId: string, severity: Severity): Promise<void> {
  await kraevModerator();
  if (!SEVERITIES.includes(severity)) throw new Error('Ugyldig alvorlighed.');
  const sb = supabaseServer();
  const { error } = await sb.from('issues').update({ severity }).eq('id', issueId);
  if (error) throw new Error(error.message);
  revalider();
}

export async function markerLoest(issueId: string): Promise<void> {
  return saetStatus(issueId, 'loest_i_ota');
}

export async function sletMelding(issueId: string): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const { error } = await sb.from('issues').delete().eq('id', issueId);
  if (error) throw new Error(error.message);
  revalider();
}

export async function gemRedigering(
  issueId: string,
  felter: { title: string; description: string },
): Promise<void> {
  await kraevModerator();
  const title = felter.title.trim();
  const description = felter.description.trim();
  if (!title) throw new Error('Titel må ikke være tom.');
  const sb = supabaseServer();
  const { error } = await sb
    .from('issues')
    .update({ title, description })
    .eq('id', issueId);
  if (error) throw new Error(error.message);
  revalider();
}
