'use server';

// Admin-kun-handlinger i Værkstedet (rolle-styring, oprydning, forside-besked).
// Udskilt fra app/admin/actions.ts i U6: admin-kun-flader forbliver DANSKE
// (design valg 2), så de kaster stadig dansk tekst; moderator-handlingerne i
// actions.ts returnerer fejl-nøgler på moderatorens sprog.

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erAdmin, erSuperadmin } from '@/lib/admin';
import { rensOversaettelser, OVERSAETTELSE_MAKS_BESKED, type Oversaettelser } from '@/lib/i18n/indhold';
import type { AlleBruger } from '@/lib/queries-admin';
import { supabaseService } from '@/lib/supabase/service';
import {
  BILLED_SPOR,
  BESKED_SPOR,
  findForaeldreloese,
  fjernFiler,
} from '@/lib/storage-oprydning';

function revalider() {
  revalidatePath('/admin');
  revalidatePath('/');
}

// --- Adgange (kun admin) ---
// --- Rolle-governance (P32): KUN superadmin giver/fjerner admin+moderator ---
export async function inviterBruger(email: string, rolle: string): Promise<'sat' | 'inviteret'> {
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
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
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('admin_alle_brugere', { p_soeg: soeg.trim() });
  if (error) throw new Error(error.message);
  return (data ?? []) as AlleBruger[];
}

export async function saetRolle(brugerId: string, rolle: string | null): Promise<void> {
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_saet_rolle', { p_bruger: brugerId, p_rolle: rolle });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
  revalidatePath('/admin');
}

export async function fjernInvitation(email: string): Promise<void> {
  if (!(await erSuperadmin())) throw new Error('Kun superadmin.');
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

// --- Oprydning: forældreløse billed-filer i storage (P9/P10, kun admin) ---
// Finder/rydder objekter i 'forum'-, 'meld'- og 'besked'-bucketen uden en
// levende reference i forum_post_images / issue_images / message_images (fx
// compose-uploads der blev fortrudt). Soft-removed forum-indhold + skjulte
// samtaler beholder deres rækker og røres IKKE. Serveren rescanner selv ved
// sletning - klienten sender ingen paths.
//
// De to offentlige spor (forum/meld) køres med den almindelige klient; det
// private besked-spor køres med SERVICE-ROLLEN (bucketen har ingen læse-policy).
// Ét tal pr. offentligt spor (bucket-navn -> antal) + det private besked-spor.
type OprydTal = { forum: number; meld: number; avatar: number; besked: number };

export async function taelForaeldreloeseFiler(): Promise<OprydTal> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const svc = supabaseService();
  const [res, beskedRes] = await Promise.all([
    Promise.all(BILLED_SPOR.map((s) => findForaeldreloese(sb, s.bucket, s.tabel, s.kolonne))),
    findForaeldreloese(svc, BESKED_SPOR.bucket, BESKED_SPOR.tabel),
  ]);
  const pr = new Map(BILLED_SPOR.map((s, i) => [s.bucket, res[i].foraeldreloese.length]));
  return {
    forum: pr.get(BILLED_SPOR[0].bucket) ?? 0,
    meld: pr.get(BILLED_SPOR[1].bucket) ?? 0,
    avatar: pr.get(BILLED_SPOR[2].bucket) ?? 0,
    besked: beskedRes.foraeldreloese.length,
  };
}

export async function rydForaeldreloeseFiler(): Promise<OprydTal> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const svc = supabaseService();
  const [res, beskedRes] = await Promise.all([
    Promise.all(BILLED_SPOR.map((s) => findForaeldreloese(sb, s.bucket, s.tabel, s.kolonne))),
    findForaeldreloese(svc, BESKED_SPOR.bucket, BESKED_SPOR.tabel),
  ]);
  const fjernet = new Map<string, number>();
  for (let i = 0; i < BILLED_SPOR.length; i++) {
    fjernet.set(BILLED_SPOR[i].bucket, await fjernFiler(sb, BILLED_SPOR[i].bucket, res[i].foraeldreloese));
  }
  const besked = await fjernFiler(svc, BESKED_SPOR.bucket, beskedRes.foraeldreloese);
  revalider();
  return {
    forum: fjernet.get(BILLED_SPOR[0].bucket) ?? 0,
    meld: fjernet.get(BILLED_SPOR[1].bucket) ?? 0,
    avatar: fjernet.get(BILLED_SPOR[2].bucket) ?? 0,
    besked,
  };
}

// --- Forside-besked (kun admin) ---
// U7: `oversaettelser` = sv/en ({sv:{message}, en:{message}}); undefined = røres ikke.
export async function gemForsideBesked(
  message: string,
  active: boolean,
  oversaettelser?: Oversaettelser<'message'>,
): Promise<void> {
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
      ...(oversaettelser !== undefined
        ? { oversaettelser: rensOversaettelser(oversaettelser, ['message'], OVERSAETTELSE_MAKS_BESKED) }
        : {}),
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  revalider();
}
