'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { MAKS_ANTAL } from '@/lib/billeder';

// Vedhæft uploadede billeder (storage-paths) til et indlæg. Validerer at hvert
// path ligger i brugerens egen mappe (<user_id>/...). RLS tjekker også ejerskab.
async function tilfoejBilleder(
  sb: ReturnType<typeof supabaseServer>,
  postId: string,
  userId: string,
  billeder: string[],
): Promise<void> {
  const rene = (billeder ?? [])
    .filter((p) => typeof p === 'string' && p.startsWith(`${userId}/`))
    .slice(0, MAKS_ANTAL);
  if (rene.length === 0) return;
  const rows = rene.map((path, i) => ({ post_id: postId, path, display_order: i }));
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

// Ret et indlæg (RLS: egen eller moderator).
export async function retIndlaeg(
  postId: string,
  kategoriSlug: string,
  traadSlug: string,
  body: string,
): Promise<void> {
  const b = body.trim();
  if (!b) throw new Error('Indlægget må ikke være tomt.');
  if (b.length > 10000) throw new Error('Indlægget er for langt.');
  const sb = supabaseServer();
  const { error } = await sb.from('forum_posts').update({ body: b, edited: true }).eq('id', postId);
  if (error) throw new Error(error.message);
  revalider(kategoriSlug, traadSlug);
}

// Fjern et indlæg (soft-remove; RLS: egen eller moderator).
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

// Fjern hele tråden (soft-remove). RLS: egen eller moderator.
export async function fjernTraad(threadId: string, kategoriSlug: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from('forum_threads').update({ is_removed: true }).eq('id', threadId);
  if (error) throw new Error(error.message);
  revalider(kategoriSlug);
}
