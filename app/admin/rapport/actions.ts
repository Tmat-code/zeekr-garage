'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erAdmin, erModerator } from '@/lib/admin';
import { erGyldigRapportType } from '@/lib/rapport-i18n';
import { oversaetDiagnose, type OversaetStatus } from '@/lib/oversaet';

export async function danRapport(
  type: string,
  kunAendrede: boolean,
  top: string,
): Promise<number> {
  if (!(await erAdmin())) throw new Error('Kun admin kan danne rapporten.');
  const antal = top === 'alle' ? 1_000_000 : Math.min(Math.max(Number(top) || 20, 1), 200);
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('dan_rapport_markering', {
    p_type: erGyldigRapportType(type),
    p_kun_aendrede: kunAendrede,
    p_antal: antal,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/rapport');
  revalidatePath('/');
  return Number(data ?? 0);
}

export async function fortrydMarkering(): Promise<number> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('fortryd_markering');
  if (error) throw new Error(error.message);
  revalidatePath('/admin/rapport');
  revalidatePath('/');
  return Number(data ?? 0);
}

export async function testOversaettelse(): Promise<OversaetStatus> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
  return oversaetDiagnose();
}
