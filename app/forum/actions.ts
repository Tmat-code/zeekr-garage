'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { MAKS_ANTAL, FORUM_BUCKET } from '@/lib/billeder';
import { MOD_GRUND_VALUES } from '@/lib/moderering';

// Vedhæft uploadede billeder (storage-paths) til et indlæg. Validerer at hvert
// path ligger i brugerens egen mappe (<user_id>/...). RLS tjekker også ejerskab.
// offset = start-værdi for display_order (så tilføjede billeder lægger sig EFTER
// eksisterende ved redigering, i stedet for at kollidere på display_order 0..n).
async function tilfoejBilleder(
  sb: ReturnType<typeof supabaseServer>,
  postId: string,
  userId: string,
  billeder: string[],
  offset = 0,
): Promise<void> {
  const rene = (billeder ?? [])
    .filter((p) => typeof p === 'string' && p.startsWith(`${userId}/`))
    .slice(0, MAKS_ANTAL);
  if (rene.length === 0) return;
  const rows = rene.map((path, i) => ({ post_id: postId, path, display_order: offset + i }));
  const { error } = await sb.from('forum_post_images').insert(rows);
  if (error) throw new Error(error.message);
}

// Dansk-venlig slug: æøå -> ae/oe/aa, resten normaliseres.
function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'traad';
}

function revalider(kategoriSlug: string, traadSlug?: string) {
  revalidatePath('/forum');
  revalidatePath(`/forum/${kategoriSlug}`);
  if (traadSlug) revalidatePath(`/forum/${kategoriSlug}/${traadSlug}`);
  // Værkstedet viser også forum-aktivitet/moderering.
  revalidatePath('/admin/forum');
  revalidatePath('/admin');
}

// Opret tråd -> returnér URL til den nye tråd (klienten navigerer dertil).
export async function opretTraad(
  kategoriSlug: string,
  title: string,
  body: string,
  billeder: string[] = [],
): Promise<string> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at oprette en tråd.');

  const t = title.trim();
  const b = body.trim();
  if (t.length < 3) throw new Error('Giv tråden en sigende titel.');
  if (t.length > 160) throw new Error('Titlen er for lang (maks. 160 tegn).');
  if (!b) throw new Error('Skriv et åbnings-indlæg.');
  if (b.length > 10000) throw new Error('Indlægget er for langt.');

  const { data: kat } = await sb
    .from('forum_categories')
    .select('id, is_locked')
    .eq('slug', kategoriSlug)
    .single();
  if (!kat) throw new Error('Kategorien findes ikke.');

  const slug = `${slugify(t)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: traad, error } = await sb
    .from('forum_threads')
    .insert({ category_id: kat.id, author_id: user.id, title: t, slug })
    .select('id, slug')
    .single();
  if (error || !traad) throw new Error(error?.message ?? 'Kunne ikke oprette tråden.');

  const { data: aabning, error: pe } = await sb
    .from('forum_posts')
    .insert({ thread_id: traad.id, author_id: user.id, body: b, is_opening: true })
    .select('id')
    .single();
  if (pe || !aabning) {
    // Ryd op, så vi ikke efterlader en tom tråd (RLS: egen tråd).
    await sb.from('forum_threads').delete().eq('id', traad.id);
    throw new Error(pe?.message ?? 'Kunne ikke oprette indlægget.');
  }

  await tilfoejBilleder(sb, aabning.id, user.id, billeder);

  revalider(kategoriSlug, traad.slug);
  return `/forum/${kategoriSlug}/${traad.slug}`;
}

// Svar på en tråd.
export async function svar(
  threadId: string,
  kategoriSlug: string,
  traadSlug: string,
  body: string,
  billeder: string[] = [],
): Promise<void> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at svare.');
  const b = body.trim();
  const harBilleder = (billeder ?? []).length > 0;
  if (!b && !harBilleder) throw new Error('Skriv et svar eller vedhæft et billede.');
  if (b.length > 10000) throw new Error('Svaret er for langt.');

  const { data: post, error } = await sb
    .from('forum_posts')
    .insert({ thread_id: threadId, author_id: user.id, body: b })
    .select('id')
    .single();
  if (error || !post) throw new Error(error?.message ?? 'Kunne ikke sende svaret.');

  await tilfoejBilleder(sb, post.id, user.id, billeder);
  revalider(kategoriSlug, traadSlug);
}

// Ret et indlæg (RLS: egen eller moderator) - tekst OG billeder.
// fjernPaths = eksisterende billed-paths der skal fjernes; nyeBilleder = netop
// uploadede paths der skal tilføjes. Begge er valgfrie, så ren tekst-redigering
// er uændret.
export async function retIndlaeg(
  postId: string,
  kategoriSlug: string,
  traadSlug: string,
  body: string,
  fjernPaths: string[] = [],
  nyeBilleder: string[] = [],
): Promise<void> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at rette.');

  const b = body.trim();
  if (b.length > 10000) throw new Error('Indlægget er for langt.');

  // Hent indlægget + dets nuværende billeder (til at validere resulterende antal
  // og til at beregne display_order-offset for de tilføjede).
  const { data: post } = await sb
    .from('forum_posts')
    .select('is_opening, forum_post_images ( path )')
    .eq('id', postId)
    .maybeSingle();
  if (!post) throw new Error('Indlægget findes ikke.');

  const nuvaerende: string[] = ((post as any).forum_post_images ?? []).map((i: any) => i.path);
  const tilFjernelse = (fjernPaths ?? []).filter((p) => nuvaerende.includes(p));
  const beholdte = nuvaerende.filter((p) => !tilFjernelse.includes(p));

  // Nye billeder må kun fylde den resterende plads op til MAKS_ANTAL.
  const plads = Math.max(0, MAKS_ANTAL - beholdte.length);
  const tilfoejes = (nyeBilleder ?? []).slice(0, plads);
  const resterende = beholdte.length + tilfoejes.length;

  if ((post as any).is_opening && !b) throw new Error('Åbnings-indlægget skal have tekst.');
  if (!b && resterende === 0) throw new Error('Skriv noget eller behold mindst ét billede.');

  // 1) Tekst (edited-markering).
  const { error: ue } = await sb
    .from('forum_posts')
    .update({ body: b, edited: true })
    .eq('id', postId);
  if (ue) throw new Error(ue.message);

  // 2) Fjern valgte eksisterende billeder: først DB-rækken (RLS: eget/moderator),
  //    derefter best-effort selve storage-filen (forældreløse filer ryddes i P9).
  if (tilFjernelse.length > 0) {
    const { error: de } = await sb
      .from('forum_post_images')
      .delete()
      .eq('post_id', postId)
      .in('path', tilFjernelse);
    if (de) throw new Error(de.message);
    try {
      await sb.storage.from(FORUM_BUCKET).remove(tilFjernelse);
    } catch {
      /* ignoreres - forældreløs fil kan ryddes senere (P9) */
    }
  }

  // 3) Tilføj nye billeder EFTER de beholdte (display_order-offset).
  if (tilfoejes.length > 0) {
    await tilfoejBilleder(sb, postId, user.id, tilfoejes, beholdte.length);
  }

  revalider(kategoriSlug, traadSlug);
}

// Fjern et indlæg (soft-remove; RLS: egen eller moderator).
// P9-beslutning: soft-remove er reversibelt (is_removed kan sættes false igen) og
// BEHOLDER bevidst forum_post_images-rækkerne + storage-filerne, så et evt.
// gendannet indlæg ikke får brudte billeder. Vi destruerer altså IKKE filer her.
// Ægte forældreløse forum-filer (compose-/editor-fortryd) ryddes af admin-sweep'et
// i Værkstedet (taelForaeldreloeseFiler/rydForaeldreloeseFiler, lib/storage-oprydning.ts).
export async function fjernIndlaeg(
  postId: string,
  kategoriSlug: string,
  traadSlug: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from('forum_posts').update({ is_removed: true }).eq('id', postId);
  if (error) throw new Error(error.message);
  revalider(kategoriSlug, traadSlug);
}

// --- Moderering af tråd (kun moderator/admin) ---
export async function saetFastgjort(
  threadId: string,
  kategoriSlug: string,
  traadSlug: string,
  vaerd: boolean,
): Promise<void> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
  const sb = supabaseServer();
  const { error } = await sb.from('forum_threads').update({ is_pinned: vaerd }).eq('id', threadId);
  if (error) throw new Error(error.message);
  revalider(kategoriSlug, traadSlug);
}

export async function saetLaast(
  threadId: string,
  kategoriSlug: string,
  traadSlug: string,
  vaerd: boolean,
): Promise<void> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
  const sb = supabaseServer();
  const { error } = await sb.from('forum_threads').update({ is_locked: vaerd }).eq('id', threadId);
  if (error) throw new Error(error.message);
  revalider(kategoriSlug, traadSlug);
}

// --- P21: moderering med begrundelse + officiel besked + rapport-kø ---
// De tidligere stumme fjern-handlinger (ren is_removed-update) er afløst af de
// atomiske RPC'er mod_fjern_traad / mod_fjern_indlaeg (handling + audit-log +
// notifikation til forfatteren i ÉN transaktion). Brugerens egen sletning af
// EGET indlæg kører stadig via den plaine fjernIndlaeg ovenfor (ingen grund,
// ingen notifikation - det er ikke moderering).

// Bruger rapporterer forum-indhold: en tråd (threadId, typisk åbnings-indlægget)
// eller et konkret indlæg (postId). RLS sikrer reporter_id = mig + kilde=bruger.
export async function rapporterForum(
  threadId: string | null,
  postId: string | null,
  reason: string,
): Promise<void> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at rapportere.');
  if (!threadId && !postId) throw new Error('Ingen reference at rapportere.');
  if (!MOD_GRUND_VALUES.includes(reason)) throw new Error('Ugyldig grund.');

  const { error } = await sb.from('forum_reports').insert({
    reporter_id: user.id,
    thread_id: threadId,
    post_id: postId,
    reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forum');
}

// Moderator: fjern tråd MED grund (RPC = soft-remove + log + notif atomisk).
// p_report_id markerer den udløsende rapport håndteret i samme transaktion.
export async function modFjernTraad(
  threadId: string,
  kategoriSlug: string,
  grund: string,
  fritekst?: string,
  reportId?: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.rpc('mod_fjern_traad', {
    p_thread_id: threadId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
    p_report_id: reportId ?? null,
  });
  if (error) throw new Error(error.message);
  revalider(kategoriSlug);
}

// Moderator: fjern indlæg MED grund (RPC = soft-remove + log + notif atomisk).
export async function modFjernIndlaeg(
  postId: string,
  kategoriSlug: string,
  traadSlug: string,
  grund: string,
  fritekst?: string,
  reportId?: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.rpc('mod_fjern_indlaeg', {
    p_post_id: postId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
    p_report_id: reportId ?? null,
  });
  if (error) throw new Error(error.message);
  revalider(kategoriSlug, traadSlug);
}

// Moderator: fjern en brugers upassende avatar MED grund (RPC = nulstil
// avatar_path + log + notif atomisk; selve filen ryddes af P9-sweepet). P22.
export async function modFjernAvatar(
  userId: string,
  kategoriSlug: string,
  traadSlug: string,
  grund: string,
  fritekst?: string,
  reportId?: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.rpc('mod_fjern_avatar', {
    p_user_id: userId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
    p_report_id: reportId ?? null,
  });
  if (error) throw new Error(error.message);
  revalider(kategoriSlug, traadSlug);
}

// Moderator: advar/kontakt en bruger (uafhængigt af en konkret tråd).
export async function modAdvarBruger(
  userId: string,
  grund: string,
  fritekst?: string,
  reportId?: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.rpc('mod_advar_bruger', {
    p_user_id: userId,
    p_grund: grund,
    p_fritekst: fritekst ?? null,
    p_report_id: reportId ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forum');
}

// Moderator: afvis en rapport (markér håndteret uden en indholds-handling).
export async function afvisRapport(reportId: string): Promise<void> {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
  const sb = supabaseServer();
  const { error } = await sb.from('forum_reports').update({ handled: true }).eq('id', reportId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forum');
}
