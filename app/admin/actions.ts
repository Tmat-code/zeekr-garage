'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator, erAdmin } from '@/lib/admin';
import { STATUSES, SEVERITIES, ISSUE_CATEGORIES, type Status, type Severity } from '@/lib/config';
import { erKildesprog } from '@/lib/kildesprog';
import { planlaegTitelOversaettelse } from '@/lib/titel-oversaet';
import type {
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
import { vFejlFraDb, gyldigeDage, type VFejl, type VSvar } from '@/lib/vaerksted-fejl';
import { MELD_BUCKET } from '@/lib/billeder';

// U6: moderator-handlingerne RETURNERER en fejl-NØGLE (lib/vaerksted-fejl.ts)
// i stedet for at kaste tekst - klienten slår teksten op i Værksted-ordbogen,
// så fejlen står på moderatorens sprog og skifter med. Rå DB-fejl vises aldrig
// (kendte RPC-tekster mappes, resten -> 'nogetGikGalt' + console.error).
// Admin-kun-handlingerne (roller, oprydning, forside-besked) ligger i
// app/admin/admin-actions.ts og kaster stadig dansk tekst (admin-kun = dansk,
// design valg 2).
function fejlSvar(fejl: VFejl): { ok: false; fejl: VFejl } {
  return { ok: false, fejl };
}

function dbSvar(error: { message?: string } | null | undefined): { ok: false; fejl: VFejl } {
  const k = vFejlFraDb(error?.message);
  if (!k) console.error('[vaerksted] DB-fejl:', error?.message);
  return fejlSvar(k ?? 'nogetGikGalt');
}

const OK: { ok: true; data: undefined } = { ok: true, data: undefined };

// Alle moderator-handlinger kraever moderator/admin (erModerator-tjek øverst i
// hver). RLS haandhaever det ogsaa i DB, men vi stopper tidligt.

function revalider() {
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function saetStatus(issueId: string, status: Status): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  if (!STATUSES.includes(status)) return fejlSvar('ugyldigStatus');
  const sb = supabaseServer();
  const { error } = await sb.from('issues').update({ status }).eq('id', issueId);
  if (error) return dbSvar(error);
  revalider();
  return OK;
}

export async function saetSeverity(issueId: string, severity: Severity): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  if (!SEVERITIES.includes(severity)) return fejlSvar('ugyldigAlvor');
  const sb = supabaseServer();
  const { error } = await sb.from('issues').update({ severity }).eq('id', issueId);
  if (error) return dbSvar(error);
  revalider();
  return OK;
}

export async function saetKategori(issueId: string, kategori: string): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  const gyldig = kategori === '' || ISSUE_CATEGORIES.some((c) => c.slug === kategori);
  if (!gyldig) return fejlSvar('ugyldigKategori');
  const sb = supabaseServer();
  const { error } = await sb
    .from('issues')
    .update({ category: kategori || null })
    .eq('id', issueId);
  if (error) return dbSvar(error);
  revalider();
  revalidatePath('/feedback');
  return OK;
}

// U3b: ret en meldings kildesprog (hvis detektionen ramte forkert). Styrer
// rapport-oversættelsen og boardets titel-oversættelser (begge caches er keyet
// på sproget, så de gen-oversættes af sig selv).
export async function saetMeldingSprog(issueId: string, sprog: string): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  if (!erKildesprog(sprog)) return fejlSvar('ugyldigtSprog');
  const sb = supabaseServer();
  const { error } = await sb.from('issues').update({ sprog }).eq('id', issueId);
  if (error) return dbSvar(error);
  planlaegTitelOversaettelse();
  revalider();
  revalidatePath('/feedback');
  return OK;
}

export async function markerLoest(issueId: string): Promise<VSvar> {
  return saetStatus(issueId, 'loest_i_ota');
}

export async function sletMelding(issueId: string): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  const sb = supabaseServer();

  // P9: sletning af en melding er HÅRD (uoprettelig) - cascade fjerner
  // issue_images-rækkerne, men ikke selve storage-filerne. Hent billed-paths
  // FØR issue'et slettes, slet så issue'et, og ryd til sidst filerne best-effort.
  const { data: imgs } = await sb.from('issue_images').select('path').eq('issue_id', issueId);
  const paths = (imgs ?? [])
    .map((r: any) => r.path)
    .filter((p: any): p is string => typeof p === 'string');

  const { error } = await sb.from('issues').delete().eq('id', issueId);
  if (error) return dbSvar(error);

  if (paths.length > 0) {
    try {
      await sb.storage.from(MELD_BUCKET).remove(paths);
    } catch {
      /* ignoreres - en evt. tilbageblevet fil fanges af storage-sweep'et */
    }
  }
  revalider();
  return OK;
}

export async function gemRedigering(
  issueId: string,
  felter: { title: string; description: string },
): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  const title = felter.title.trim();
  const description = felter.description.trim();
  if (!title) return fejlSvar('tomTitel');
  const sb = supabaseServer();
  const { error } = await sb
    .from('issues')
    .update({ title, description })
    .eq('id', issueId);
  if (error) return dbSvar(error);
  planlaegTitelOversaettelse(); // U3b: ny titel -> ny oversættelse i baggrunden
  revalider();
  return OK;
}

// --- P43: sammenlæg dublet-meldinger ---
// Hele flytningen sker atomisk i én security-definer RPC (stemmer med dedupe
// pr. bil, kommentarer, billeder, modeller + skjul dubletten). RPC'en gater
// selv på er_moderator() og logges i P32-audit; vi stopper tidligt her.
function revaliderSammenlaegning(...ids: string[]) {
  revalider();
  revalidatePath('/feedback');
  revalidatePath('/meld');
  revalidatePath('/admin/feedback');
  for (const id of ids) revalidatePath(`/melding/${id}`);
}

export async function samlDublet(dubletId: string, originalId: string): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  if (!dubletId || !originalId) return fejlSvar('meldingFindesIkke');
  if (dubletId === originalId) return fejlSvar('samlSelv');
  const sb = supabaseServer();
  const { error } = await sb.rpc('feedback_saml_dublet', {
    p_dublet: dubletId,
    p_original: originalId,
  });
  if (error) return dbSvar(error);
  revaliderSammenlaegning(dubletId, originalId);
  return OK;
}

export async function fortrydSammenlaegning(
  id: number,
  dubletId: string,
  originalId: string,
): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  if (!Number.isInteger(id) || id < 1) return fejlSvar('sammenlaegningFindesIkke');
  const sb = supabaseServer();
  const { error } = await sb.rpc('feedback_fortryd_sammenlaegning', { p_id: id });
  if (error) return dbSvar(error);
  revaliderSammenlaegning(dubletId, originalId);
  return OK;
}

// --- Bruger-administration / sanktioner (P20) ---
// Oversigten er moderator-laesbar (find en bruger at handle paa); handlingerne
// er rolle-gatede: moderator maa advare + suspendere, admin maa banne, ophaeve
// og anonymisere. RPC'erne (M4) haandhaever gatingen i DB; vi stopper tidligt
// her med en laesbar fejl. Hver RPC er atomisk (sanktion + log + evt. notif).

export async function hentBrugere(f: BrugerFiltre): Promise<VSvar<BrugerSide>> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  try {
    return { ok: true, data: await getBrugerOverblik(f) };
  } catch (e: any) {
    return dbSvar(e);
  }
}

// --- Forum-moderering: paginering + filter (P16) ---
// Moderator-laesbare lister til /admin/forum (soeg + "kraever opmaerksomhed" +
// "vis flere"). RPC'erne (M5) gater selv i DB; vi stopper tidligt her.
export async function hentForumTraade(f: ForumModFiltre): Promise<VSvar<ForumModTraadSide>> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  try {
    return { ok: true, data: await getForumModTraade(f) };
  } catch (e: any) {
    return dbSvar(e);
  }
}

export async function hentForumIndlaeg(f: ForumModFiltre): Promise<VSvar<ForumModIndlaegSide>> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  try {
    return { ok: true, data: await getForumModIndlaeg(f) };
  } catch (e: any) {
    return dbSvar(e);
  }
}

// --- Rapport-køen: defensivt loft (P24) ---
// Moderator-læsbar side af den indgående rapport-kø ("vis flere"). RPC'en
// gater selv i DB; vi stopper tidligt her.
export async function hentForumRapporter(f: ForumRapportFiltre): Promise<VSvar<ForumRapportSide>> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  try {
    return { ok: true, data: await getForumRapporter(f) };
  } catch (e: any) {
    return dbSvar(e);
  }
}

export async function suspenderBruger(
  userId: string,
  dage: number,
  grund: string,
  fritekst?: string,
): Promise<VSvar> {
  if (!(await erModerator())) return fejlSvar('ingenAdgang');
  if (!MOD_GRUND_VALUES.includes(grund)) return fejlSvar('ugyldigGrund');
  if (!gyldigeDage(dage)) return fejlSvar('ugyldigeDage');
  const sb = supabaseServer();
  const { error } = await sb.rpc('mod_suspender_bruger', {
    p_user_id: userId,
    p_dage: dage,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
  });
  if (error) return dbSvar(error);
  revalidatePath('/admin/adgange');
  return OK;
}

// Ban/ophæv/anonymisér er admin-handlinger, men knapperne sidder i den samme
// Brugere-liste som moderatorerne bruger (afklaret med Torben 28-11: oversættes
// med), så de følger samme returnér-nøgle-mønster.
export async function banBruger(userId: string, grund: string, fritekst?: string): Promise<VSvar> {
  if (!(await erAdmin())) return fejlSvar('ingenAdgang');
  if (!MOD_GRUND_VALUES.includes(grund)) return fejlSvar('ugyldigGrund');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_ban_bruger', {
    p_user_id: userId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
  });
  if (error) return dbSvar(error);
  revalidatePath('/admin/adgange');
  return OK;
}

export async function ophaevBruger(userId: string): Promise<VSvar> {
  if (!(await erAdmin())) return fejlSvar('ingenAdgang');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_ophaev', { p_user_id: userId });
  if (error) return dbSvar(error);
  revalidatePath('/admin/adgange');
  return OK;
}

export async function anonymiserBruger(
  userId: string,
  grund: string,
  fritekst?: string,
): Promise<VSvar> {
  if (!(await erAdmin())) return fejlSvar('ingenAdgang');
  if (!MOD_GRUND_VALUES.includes(grund)) return fejlSvar('ugyldigGrund');
  const sb = supabaseServer();
  const { error } = await sb.rpc('admin_anonymiser', {
    p_user_id: userId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
  });
  if (error) return dbSvar(error);
  revalidatePath('/admin/adgange');
  return OK;
}
