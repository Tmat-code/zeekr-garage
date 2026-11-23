import { supabaseServer } from '@/lib/supabase/server';
import { forumBilledeUrl } from '@/lib/billeder';
import type {
  ForumGruppe,
  ForumKategori,
  ForumKategoriStat,
  ForumTraadRow,
  ForumIndlaeg,
  ForumTraadDetalje,
  ForumSoegeResultat,
} from '@/lib/types';

// Forfatter + bil (garage-badge) i ét embed. 3-niveau: forum_* -> profiles -> model/variant.
// (Samme FK-hints som getMyCar bruger på profiles.)
function authorSelect(fk: string): string {
  return `author:profiles!${fk} (
      display_name,
      bil:models!profiles_car_model_id_fkey ( name ),
      variant:variants!profiles_car_variant_id_fkey ( name )
    )`;
}

// a: det embeddede author-objekt -> { navn, bil }.
function mapAuthor(a: any): { navn: string | null; bil: string | null } {
  if (!a) return { navn: null, bil: null };
  const navn = a.display_name ?? null;
  const modelNavn = a.bil?.name ?? null;
  const variantNavn = a.variant?.name ?? null;
  const bil = modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
  return { navn, bil };
}

function mapKategori(r: any): ForumKategori {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? null,
    icon: r.icon ?? null,
    groupLabel: r.group_label,
    groupOrder: r.group_order,
    displayOrder: r.display_order,
    modelId: r.model_id ?? null,
    isLocked: r.is_locked ?? false,
  };
}

const KATEGORI_COLS =
  'id, slug, name, description, icon, group_label, group_order, display_order, model_id, is_locked';

// --- Forummets forside: kategorier grupperet + optalte tal ---
export async function getForumGrupper(): Promise<ForumGruppe[]> {
  const sb = supabaseServer();
  const [{ data: kats }, { data: stats }] = await Promise.all([
    sb
      .from('forum_categories')
      .select(KATEGORI_COLS)
      .order('group_order', { ascending: true })
      .order('display_order', { ascending: true }),
    sb
      .from('forum_threads')
      .select('category_id, reply_count, view_count, last_post_at')
      .eq('is_removed', false),
  ]);

  // Saml stats pr. kategori.
  const perKat = new Map<
    string,
    { traade: number; svar: number; visninger: number; sidst: string | null }
  >();
  for (const t of (stats ?? []) as any[]) {
    const s = perKat.get(t.category_id) ?? { traade: 0, svar: 0, visninger: 0, sidst: null };
    s.traade += 1;
    s.svar += t.reply_count ?? 0;
    s.visninger += t.view_count ?? 0;
    if (!s.sidst || (t.last_post_at && t.last_post_at > s.sidst)) s.sidst = t.last_post_at ?? s.sidst;
    perKat.set(t.category_id, s);
  }

  // Byg kategori-stats og gruppér (rækkefølge bevaret fra order-by).
  const grupper: ForumGruppe[] = [];
  const idx = new Map<string, number>();
  for (const r of (kats ?? []) as any[]) {
    const k = mapKategori(r);
    const s = perKat.get(k.id) ?? { traade: 0, svar: 0, visninger: 0, sidst: null };
    const stat: ForumKategoriStat = {
      ...k,
      traade: s.traade,
      indlaeg: s.traade + s.svar, // hver tråd har ét åbnings-indlæg
      visninger: s.visninger,
      sidstAktiv: s.sidst,
    };
    if (!idx.has(k.groupLabel)) {
      idx.set(k.groupLabel, grupper.length);
      grupper.push({ label: k.groupLabel, kategorier: [] });
    }
    grupper[idx.get(k.groupLabel)!].kategorier.push(stat);
  }
  return grupper;
}

// --- Enkelt kategori (slug) ---
export async function getKategori(slug: string): Promise<ForumKategori | null> {
  const sb = supabaseServer();
  const { data } = await sb.from('forum_categories').select(KATEGORI_COLS).eq('slug', slug).single();
  return data ? mapKategori(data) : null;
}

// --- Tråde i en kategori (fastgjorte først, derefter seneste aktivitet) ---
export async function getTraade(categoryId: string): Promise<ForumTraadRow[]> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('forum_threads')
    .select(
      `id, slug, title, created_at, last_post_at, reply_count, view_count, is_pinned, is_locked,
       ${authorSelect('forum_threads_author_id_fkey')}`,
    )
    .eq('category_id', categoryId)
    .eq('is_removed', false)
    .order('is_pinned', { ascending: false })
    .order('last_post_at', { ascending: false });

  return ((data ?? []) as any[]).map((r) => {
    const { navn, bil } = mapAuthor(r.author);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      forfatter: navn,
      bil,
      createdAt: r.created_at,
      lastPostAt: r.last_post_at,
      replyCount: r.reply_count ?? 0,
      viewCount: r.view_count ?? 0,
      isPinned: r.is_pinned ?? false,
      isLocked: r.is_locked ?? false,
    };
  });
}

// --- Enkelt tråd (slug) med dens kategori ---
export async function getTraad(traadSlug: string): Promise<ForumTraadDetalje | null> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('forum_threads')
    .select(
      `id, slug, title, created_at, is_pinned, is_locked, view_count, reply_count, is_removed,
       kategori:forum_categories ( slug, name, icon, is_locked, model_id )`,
    )
    .eq('slug', traadSlug)
    .limit(1)
    .maybeSingle();

  if (!data || (data as any).is_removed) return null;
  const k = (data as any).kategori;
  return {
    id: (data as any).id,
    slug: (data as any).slug,
    title: (data as any).title,
    createdAt: (data as any).created_at,
    isPinned: (data as any).is_pinned ?? false,
    isLocked: (data as any).is_locked ?? false,
    viewCount: (data as any).view_count ?? 0,
    replyCount: (data as any).reply_count ?? 0,
    kategori: {
      slug: k?.slug ?? '',
      name: k?.name ?? '',
      icon: k?.icon ?? null,
      modelId: k?.model_id ?? null,
      isLocked: k?.is_locked ?? false,
    },
  };
}

// --- Tværgående tråd-søgning (P4) ---
// Søger på tværs af ALLE kategorier/model-fora, match i trådtitler + indlægs-
// tekst (åbning + svar). Fjernede tråde/indlæg holdes ude (sker i RPC'en).
// Returnerer én række pr. tråd, sorteret efter relevans (ts_rank).
export async function getForumSoeg(q: string, maks = 50): Promise<ForumSoegeResultat[]> {
  const soegeord = (q ?? '').trim();
  if (!soegeord) return [];

  const sb = supabaseServer();
  const { data, error } = await sb.rpc('forum_soeg', {
    p_soegeord: soegeord,
    p_maks: maks,
  });
  if (error || !data) return [];

  return (data as any[]).map((r) => {
    const modelNavn = r.bil_model ?? null;
    const variantNavn = r.bil_variant ?? null;
    const bil = modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
    return {
      id: r.thread_id,
      slug: r.slug,
      title: r.title,
      kategoriSlug: r.kategori_slug,
      kategoriNavn: r.kategori_navn,
      kategoriIcon: r.kategori_icon ?? null,
      modelId: r.model_id ?? null,
      forfatter: r.forfatter ?? null,
      bil,
      lastPostAt: r.last_post_at,
      replyCount: r.reply_count ?? 0,
      viewCount: r.view_count ?? 0,
      isPinned: r.is_pinned ?? false,
      isLocked: r.is_locked ?? false,
      rank: Number(r.rank ?? 0),
      uddrag: r.uddrag ?? null,
    };
  });
}

// --- Indlæg i en tråd (åbning først, derefter kronologisk) ---
export async function getIndlaeg(threadId: string): Promise<ForumIndlaeg[]> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('forum_posts')
    .select(
      `id, thread_id, body, is_opening, edited, created_at, author_id,
       ${authorSelect('forum_posts_author_id_fkey')},
       billeder:forum_post_images ( path, display_order )`,
    )
    .eq('thread_id', threadId)
    .eq('is_removed', false)
    .order('is_opening', { ascending: false })
    .order('created_at', { ascending: true });

  return ((data ?? []) as any[]).map((r) => {
    const { navn, bil } = mapAuthor(r.author);
    const sorterede = ((r.billeder ?? []) as any[]).sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );
    const billederPaths = sorterede.map((i) => i.path as string);
    const billeder = billederPaths.map((p) => forumBilledeUrl(p));
    return {
      id: r.id,
      threadId: r.thread_id,
      body: r.body,
      forfatter: navn,
      bil,
      authorId: r.author_id ?? null,
      createdAt: r.created_at,
      edited: r.edited ?? false,
      isOpening: r.is_opening ?? false,
      billeder,
      billederPaths,
    };
  });
}
