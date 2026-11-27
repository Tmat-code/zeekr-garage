'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator, erAdmin, erSuperadmin } from '@/lib/admin';
import { STATUSES, SEVERITIES, ISSUE_CATEGORIES, type Status, type Severity } from '@/lib/config';
import { erKildesprog } from '@/lib/kildesprog';
import { planlaegTitelOversaettelse } from '@/lib/titel-oversaet';
import type {
  AlleBruger,
  BrugerFiltre,
  BrugerSide,
  ForumModFiltre,
  ForumModTraadSide,
  ForumModIndlaegSide,
  ForumRapportFiltre,
  ForumRapportSide,
} from '@/lib/queries-admin';
import {
  getBrugerOverblik,
  getForumModTraade,
  getForumModIndlaeg,
  getForumRapporter,
} from '@/lib/queries-admin';
import { MOD_GRUND_VALUES } from '@/lib/moderering';
import { MELD_BUCKET } from '@/lib/billeder';
import { supabaseService } from '@/lib/supabase/service';
import {
  BILLED_SPOR,
  BESKED_SPOR,
  findForaeldreloese,
  fjernFiler,
} from '@/lib/storage-oprydning';

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

// U3b: ret en meldings kildesprog (hvis detektionen ramte forkert). Styrer
// rapport-oversættelsen og boardets titel-oversættelser (begge caches er keyet
// på sproget, så de gen-oversættes af sig selv).
export async function saetMeldingSprog(issueId: string, sprog: string): Promise<void> {
  await kraevModerator();
  if (!erKildesprog(sprog)) throw new Error('Ugyldigt sprog.');
  const sb = supabaseServer();
  const { error } = await sb.from('issues').update({ sprog }).eq('id', issueId);
  if (error) throw new Error(error.message);
  planlaegTitelOversaettelse();
  revalider();
  revalidatePath('/feedback');
}

export async function markerLoest(issueId: string): Promise<void> {
  return saetStatus(issueId, 'loest_i_ota');
}

export async function sletMelding(issueId: string): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();

  // P9: sletning af en melding er HÅRD (uoprettelig) - cascade fjerner
  // issue_images-rækkerne, men ikke selve storage-filerne. Hent billed-paths
  // FØR issue'et slettes, slet så issue'et, og ryd til sidst filerne best-effort.
  const { data: imgs } = await sb.from('issue_images').select('path').eq('issue_id', issueId);
  const paths = (imgs ?? [])
    .map((r: any) => r.path)
    .filter((p: any): p is string => typeof p === 'string');

  const { error } = await sb.from('issues').delete().eq('id', issueId);
  if (error) throw new Error(error.message);

  if (paths.length > 0) {
    try {
      await sb.storage.from(MELD_BUCKET).remove(paths);
    } catch {
      /* ignoreres - en evt. tilbageblevet fil fanges af storage-sweep'et */
    }
  }
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
  planlaegTitelOversaettelse(); // U3b: ny titel -> ny oversættelse i baggrunden
  revalider();
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

// --- Bruger-administration / sanktioner (P20) ---
// Oversigten er moderator-laesbar (find en bruger at handle paa); handlingerne
// er rolle-gatede: moderator maa advare + suspendere, admin maa banne, ophaeve
// og anonymisere. RPC'erne (M4) haandhaever gatingen i DB; vi stopper tidligt
// her med en laesbar fejl. Hver RPC er atomisk (sanktion + log + evt. notif).

export async function hentBrugere(f: BrugerFiltre): Promise<BrugerSide> {
  if (!(await erModerator())) throw new Error('Du har ikke adgang.');
  return getBrugerOverblik(f);
}

// --- Forum-moderering: paginering + filter (P16) ---
// Moderator-laesbare lister til /admin/forum (soeg + "kraever opmaerksomhed" +
// "vis flere"). RPC'erne (M5) gater selv i DB; vi stopper tidligt her.
export async function hentForumTraade(f: ForumModFiltre): Promise<ForumModTraadSide> {
  if (!(await erModerator())) throw new Error('Du har ikke adgang.');
  return getForumModTraade(f);
}

export async function hentForumIndlaeg(f: ForumModFiltre): Promise<ForumModIndlaegSide> {
  if (!(await erModerator())) throw new Error('Du har ikke adgang.');
  return getForumModIndlaeg(f);
}

// --- Rapport-køen: defensivt loft (P24) ---
// Moderator-læsbar side af den indgående rapport-kø ("vis flere"). RPC'en
// gater selv i DB; vi stopper tidligt her med en læsbar fejl.
export async function hentForumRapporter(f: ForumRapportFiltre): Promise<ForumRapportSide> {
  if (!(await erModerator())) throw new Error('Du har ikke adgang.');
  return getForumRapporter(f);
}

function tjekGrund(grund: string) {
  if (!MOD_GRUND_VALUES.includes(grund)) throw new Error('Ugyldig grund.');
}

export async function suspenderBruger(
  userId: string,
  dage: number,
  grund: string,
  fritekst?: string,
): Promise<void> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
  tjekGrund(grund);
  if (!Number.isInteger(dage) || dage < 1 || dage > 3650) {
    throw new Error('Antal dage skal være mellem 1 og 3650.');
  }
  const sb = supabaseServer();
  const { error } = await sb.rpc('mod_suspender_bruger', {
    p_user_id: userId,
    p_dage: dage,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
}

export async function banBruger(userId: string, grund: string, fritekst?: string): Promise<void> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  tjekGrund(grund);
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_ban_bruger', {
    p_user_id: userId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
}

export async function ophaevBruger(userId: string): Promise<void> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_ophaev', { p_user_id: userId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/adgange');
}

export async function anonymiserBruger(
  userId: string,
  grund: string,
  fritekst?: string,
): Promise<void> {
  if (!(await erAdmin())) throw new Error('Kun admin.');
  tjekGrund(grund);
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_anonymiser', {
    p_user_id: userId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
  });
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
