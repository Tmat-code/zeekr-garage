'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { getKontaktBeskeder, type KontaktFiltre, type KontaktSide } from '@/lib/queries-admin';
import { vFejlFraDb, type VFejl, type VSvar } from '@/lib/vaerksted-fejl';

// Alle handlinger kraever stab. RLS/RPC haandhaever det ogsaa i DB; vi stopper
// tidligt her. U6: returnerer fejl-NØGLER (lib/vaerksted-fejl.ts).
function fejlSvar(fejl: VFejl): { ok: false; fejl: VFejl } {
  return { ok: false, fejl };
}
function dbSvar(error: { message?: string } | null | undefined): { ok: false; fejl: VFejl } {
  const k = vFejlFraDb(error?.message);
  if (!k) console.error('[vaerksted] DB-fejl:', error?.message);
  return fejlSvar(k ?? 'nogetGikGalt');
}

// Markér/afmarkér en henvendelse som behandlet.
export async function saetKontaktBehandlet(id: string, behandlet: boolean): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  const sb = supabaseServer();
  const { error } = await sb.rpc('kontakt_saet_behandlet', {
    p_id: id,
    p_behandlet: behandlet,
  });
  if (error) return dbSvar(error);
  revalidatePath('/admin/kontakt');
  return { ok: true, data: undefined };
}

// Stab-laesbar side ("vis flere" / genhent efter en handling).
export async function hentKontaktBeskeder(f: KontaktFiltre): Promise<VSvar<KontaktSide>> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  try {
    return { ok: true, data: await getKontaktBeskeder(f) };
  } catch (e: any) {
    return dbSvar(e);
  }
}
