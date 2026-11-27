'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { getKontaktBeskeder, type KontaktFiltre, type KontaktSide } from '@/lib/queries-admin';

// Alle handlinger kraever stab. RLS/RPC haandhaever det ogsaa i DB; vi stopper
// tidligt her med en laesbar fejl.
async function kraevStab() {
  if (!(await erModerator())) throw new Error('Du har ikke adgang.');
}

// Markér/afmarkér en henvendelse som behandlet.
export async function saetKontaktBehandlet(id: string, behandlet: boolean): Promise<void> {
  await kraevStab();
  const sb = supabaseServer();
  const { error } = await sb.rpc('kontakt_saet_behandlet', {
    p_id: id,
    p_behandlet: behandlet,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/kontakt');
}

// Stab-laesbar side ("vis flere" / genhent efter en handling).
export async function hentKontaktBeskeder(f: KontaktFiltre): Promise<KontaktSide> {
  await kraevStab();
  return getKontaktBeskeder(f);
}
