'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erAdmin } from '@/lib/admin';

// OTA-opslag er admin-only (som P17/P18/P19). RPC'erne er selv er_admin()-gatede;
// vi dobbelt-gater her, saa en ikke-admin faar en ren fejl uden et RPC-kald.
// revalider rammer baade den offentlige side og admin-siden.
async function kraevAdmin() {
  if (!(await erAdmin())) throw new Error('Kun admin.');
}
function revalider() {
  revalidatePath('/software');
  revalidatePath('/admin/ota');
}

// Normalisér changelog: een linje pr. punkt, trimmet, tomme linjer fjernet.
// Gemmes kanonisk (join med \n), saa visning bare kan splitte paa \n.
function normChangelog(raw: string): string {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n');
}

export type OtaInput = {
  version: string;
  releasedAt: string; // 'YYYY-MM-DD'
  changelog: string;
  note: string;
  modelIds: string[];
};

function valider(input: OtaInput): string {
  if (!input.version.trim()) throw new Error('Giv opslaget en version.');
  const cl = normChangelog(input.changelog);
  if (!cl) throw new Error('Changeloggen må ikke være tom.');
  if (!input.modelIds || input.modelIds.length === 0) throw new Error('Vælg mindst én model.');
  if (!input.releasedAt) throw new Error('Vælg en dato.');
  return cl;
}

export async function opretOta(input: OtaInput): Promise<void> {
  await kraevAdmin();
  const cl = valider(input);
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_opret_ota', {
    p_version: input.version.trim(),
    p_released_at: input.releasedAt,
    p_changelog: cl,
    p_note: input.note.trim(),
    p_model_ids: input.modelIds,
  });
  if (error) throw new Error(error.message);
  revalider();
}

export async function retOta(id: string, input: OtaInput): Promise<void> {
  await kraevAdmin();
  const cl = valider(input);
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_ret_ota', {
    p_id: id,
    p_version: input.version.trim(),
    p_released_at: input.releasedAt,
    p_changelog: cl,
    p_note: input.note.trim(),
    p_model_ids: input.modelIds,
  });
  if (error) throw new Error(error.message);
  revalider();
}

export async function sletOta(id: string): Promise<void> {
  await kraevAdmin();
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_slet_ota', { p_id: id });
  if (error) throw new Error(error.message);
  revalider();
}
