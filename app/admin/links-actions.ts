'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erAdmin } from '@/lib/admin';
import { rensOversaettelser, type Oversaettelser } from '@/lib/i18n/indhold';

// Al link-kuratering er admin-only (som P17/P18). RPC'erne er selv er_admin()-
// gatede; vi dobbelt-gater her, saa en ikke-admin faar en ren fejl uden et
// RPC-kald. revalider rammer baade den offentlige side og admin-siden.
async function kraevAdmin() {
  if (!(await erAdmin())) throw new Error('Kun admin.');
}
function revalider() {
  revalidatePath('/links');
  revalidatePath('/admin/links');
}

// --- Grupper ---
// U1b: felter pr. sprog renses her OG i RPC'en (public.rens_oversaettelser).
export async function opretLinkGruppe(titel: string, oversaettelser: Oversaettelser<'titel'> = {}): Promise<void> {
  await kraevAdmin();
  const t = titel.trim();
  if (!t) throw new Error('Giv gruppen en titel.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_opret_link_gruppe', {
    p_titel: t,
    p_oversaettelser: rensOversaettelser(oversaettelser, ['titel'] as const),
  });
  if (error) throw new Error(error.message);
  revalider();
}

export async function redigerLinkGruppe(
  id: string,
  titel: string,
  oversaettelser: Oversaettelser<'titel'> = {},
): Promise<void> {
  await kraevAdmin();
  const t = titel.trim();
  if (!t) throw new Error('Titlen må ikke være tom.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_rediger_link_gruppe', {
    p_id: id,
    p_titel: t,
    p_oversaettelser: rensOversaettelser(oversaettelser, ['titel'] as const),
  });
  if (error) throw new Error(error.message);
  revalider();
}

export async function sletLinkGruppe(id: string): Promise<void> {
  await kraevAdmin();
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_slet_link_gruppe', { p_id: id });
  if (error) throw new Error(error.message);
  revalider();
}

export async function flytLinkGruppe(id: string, op: boolean): Promise<void> {
  await kraevAdmin();
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_flyt_link_gruppe', { p_id: id, p_op: op });
  if (error) throw new Error(error.message);
  revalider();
}

// --- Links --- (modelIds: 0..n modeller; tom = "gælder alle")
export async function opretLink(input: {
  groupId: string;
  navn: string;
  kilde: string;
  url: string;
  modelIds: string[];
  oversaettelser?: Oversaettelser<'navn' | 'kilde'>;
}): Promise<void> {
  await kraevAdmin();
  if (!input.navn.trim()) throw new Error('Giv linket et navn.');
  if (!input.url.trim()) throw new Error('Giv linket en URL.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_opret_link', {
    p_group_id: input.groupId,
    p_navn: input.navn.trim(),
    p_kilde: input.kilde.trim(),
    p_url: input.url.trim(),
    p_model_ids: input.modelIds,
    p_oversaettelser: rensOversaettelser(input.oversaettelser ?? {}, ['navn', 'kilde'] as const),
  });
  if (error) throw new Error(error.message);
  revalider();
}

export async function redigerLink(
  id: string,
  input: {
    navn: string;
    kilde: string;
    url: string;
    modelIds: string[];
    oversaettelser?: Oversaettelser<'navn' | 'kilde'>;
  },
): Promise<void> {
  await kraevAdmin();
  if (!input.navn.trim()) throw new Error('Giv linket et navn.');
  if (!input.url.trim()) throw new Error('Giv linket en URL.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_rediger_link', {
    p_id: id,
    p_navn: input.navn.trim(),
    p_kilde: input.kilde.trim(),
    p_url: input.url.trim(),
    p_model_ids: input.modelIds,
    p_oversaettelser: rensOversaettelser(input.oversaettelser ?? {}, ['navn', 'kilde'] as const),
  });
  if (error) throw new Error(error.message);
  revalider();
}

export async function sletLink(id: string): Promise<void> {
  await kraevAdmin();
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_slet_link', { p_id: id });
  if (error) throw new Error(error.message);
  revalider();
}

export async function flytLink(id: string, op: boolean): Promise<void> {
  await kraevAdmin();
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_flyt_link', { p_id: id, p_op: op });
  if (error) throw new Error(error.message);
  revalider();
}

export async function flytLinkTilGruppe(id: string, groupId: string): Promise<void> {
  await kraevAdmin();
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_flyt_link_til_gruppe', { p_id: id, p_group_id: groupId });
  if (error) throw new Error(error.message);
  revalider();
}
