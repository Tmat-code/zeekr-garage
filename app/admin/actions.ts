'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator, erAdmin } from '@/lib/admin';
import { STATUSES, SEVERITIES, ISSUE_CATEGORIES, type Status, type Severity } from '@/lib/config';
import type { AlleBruger } from '@/lib/queries-admin';

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

export async function saetKategori(issueId: string, kategori: string): Promise<void> {
  await kraevModerator();
  const gyldig = kategori === '' || ISSUE_CATEGORIES.some((c) => c.slug === kategori);
  if (!gyldig) throw new Error('Ugyldig kategori.');
  const sb = supabaseServer();
  const { error } = await sb
    .from('issues')
    .update({ category: kategori || null })
    .eq('id', issueId);
  if (error) throw new Error(error.message);
  revalider();
  revalidatePath('/feedback');
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

// --- Adgange (kun admin) ---
export async function inviterBruger(email: string, rolle: string): Promise<'sat' | 'inviteret'> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Ugyldig email.');
  if (rolle !== 'admin' && rolle !== 'moderator') throw new Error('Ugyldig rolle.');
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('admin_inviter', { p_email: e, p_rolle: rolle });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
  return (data as 'sat' | 'inviteret') ?? 'inviteret';
}

// Søg blandt ALLE oprettede brugere (email eller visningsnavn). Admin-gated.
export async function soegBrugere(soeg: string): Promise<AlleBruger[]> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('admin_alle_brugere', { p_soeg: soeg.trim() });
  if (error) throw new Error(error.message);
  return (data ?? []) as AlleBruger[];
}

export async function saetRolle(brugerId: string, rolle: string | null): Promise<void> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_saet_rolle', { p_bruger: brugerId, p_rolle: rolle });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
  revalidatePath('/admin');
}

export async function fjernInvitation(email: string): Promise<void> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_fjern_invitation', { p_email: email.toLowerCase() });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
}

// --- Oprydning: fjern bekræftelser (stemmer) før en dato (kun admin) ---
function gyldigDato(dato: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dato);
}

export async function taelBekraeftelserFoer(dato: string): Promise<number> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  if (!gyldigDato(dato)) throw new Error('Ugyldig dato.');
  const sb = supabaseServer();
  const { count, error } = await sb
    .from('confirmations')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', `${dato}T00:00:00.000Z`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fjernBekraeftelserFoer(dato: string): Promise<number> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  if (!gyldigDato(dato)) throw new Error('Ugyldig dato.');
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('confirmations')
    .delete()
    .lt('created_at', `${dato}T00:00:00.000Z`)
    .select('id');
  if (error) throw new Error(error.message);
  revalider();
  return (data ?? []).length;
}

// --- Forside-besked (kun admin) ---
export async function gemForsideBesked(message: string, active: boolean): Promise<void> {
  if (!(await erAdmin())) throw new Error('Kun admin kan ændre forside-beskeden.');
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { error } = await sb
    .from('site_announcement')
    .update({
      message: message.trim() || null,
      active,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  revalider();
}
