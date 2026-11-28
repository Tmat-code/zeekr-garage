'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';
import { erModerator } from '@/lib/admin';
import { BESKED_BUCKET } from '@/lib/billeder';
import { vFejlFraDb, type VFejl, type VSvar } from '@/lib/vaerksted-fejl';

// Alle handlinger kraever moderator/admin. RLS haandhaever det ogsaa i DB
// (reports_update_mod, messages_delete_mod), men vi stopper tidligt.
// U6: returnerer fejl-NØGLER (lib/vaerksted-fejl.ts) - aldrig rå DB-fejl.
function fejlSvar(fejl: VFejl): { ok: false; fejl: VFejl } {
  return { ok: false, fejl };
}
function dbSvar(error: { message?: string } | null | undefined): { ok: false; fejl: VFejl } {
  const k = vFejlFraDb(error?.message);
  if (!k) console.error('[vaerksted] DB-fejl:', error?.message);
  return fejlSvar(k ?? 'nogetGikGalt');
}

// Markér en anmeldelse som haandteret (eller fortryd). RLS: reports_update_mod.
export async function saetAnmeldelseHaandteret(
  reportId: string,
  handled: boolean,
): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  const sb = supabaseServer();
  const { error } = await sb
    .from('message_reports')
    .update({ handled })
    .eq('id', reportId);
  if (error) return dbSvar(error);
  revalidatePath('/admin/beskeder');
  return { ok: true, data: undefined };
}

// Slet den anmeldte besked og markér anmeldelsen haandteret. RLS:
// messages_delete_mod (slet) + reports_update_mod (handled). Beskedens FK i
// message_reports er 'on delete set null', saa anmeldelsen bliver staaende
// (nu uden besked) som historik.
export async function sletAnmeldtBesked(
  reportId: string,
  messageId: string,
): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  const sb = supabaseServer();

  // P10/P9: hård sletning rydder billed-filerne straks (som meld-sletning).
  // Moderator er ikke deltager og kan ikke LÆSE besked-billeder (RLS), men
  // må gerne slette dem - hent path'ene via service-rollen (kun metadata, ikke
  // billed-bytes), slet beskeden (message_images cascader), ryd så filerne.
  const svc = supabaseService();
  const { data: imgs } = await svc
    .from('message_images')
    .select('path')
    .eq('message_id', messageId);
  const paths = (imgs ?? []).map((r: any) => r.path).filter(Boolean);

  const { error: sletFejl } = await sb.from('messages').delete().eq('id', messageId);
  if (sletFejl) return dbSvar(sletFejl);

  if (paths.length) {
    try {
      await svc.storage.from(BESKED_BUCKET).remove(paths);
    } catch {
      /* best-effort: en forældreløs fil ryddes ellers af admin-sweep'et */
    }
  }

  // Markér alle anmeldelser paa netop denne besked som haandteret (ikke kun
  // den aktuelle - samme besked kan vaere anmeldt flere gange).
  await sb.from('message_reports').update({ handled: true }).eq('message_id', messageId);

  revalidatePath('/admin/beskeder');
  return { ok: true, data: undefined };
}
