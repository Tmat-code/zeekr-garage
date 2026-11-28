import { supabaseServer } from '@/lib/supabase/server';
import { forumBilledeUrl, avatarUrl } from '@/lib/billeder';
import { foersteUrl, normaliserUrl } from '@/lib/forum-links';
import { laesKategoriOversaettelser, lokaliserKategori, gruppeLabel } from '@/lib/forum-kategori-i18n';
import type { UiSprog } from '@/lib/i18n/sprog';
import { oversatFelt } from '@/lib/i18n/indhold';
import type {
  ForumGruppe,
  ForumKategori,
  ForumKategoriStat,
  ForumTraadRow,
  ForumIndlaeg,
  ForumTraadDetalje,
  ForumSoegeResultat,
  ModelEjerTal,
} from '@/lib/types';

// Forfatter + bil (garage-badge) i ét embed. 3-niveau: forum_* -> profiles -> model/variant.
// (Samme FK-hints som getMyCar bruger på profiles.)
function authorSelect(fk: string): string {
  return `author:profiles!${fk} (
      display_name,
      avatar_path,
      bil:models!profiles_car_model_id_fkey ( name ),
      variant:variants!profiles_car_variant_id_fkey ( name )
    )`;
}

// a: det embeddede author-objekt -> { navn, bil, avatar }.
function mapAuthor(a: any): { navn: string | null; bil: string | null; avatar: string | null } {
  if (!a) return { navn: null, bil: null, avatar: null };
  const navn = a.display_name ?? null;
  const modelNavn = a.bil?.name ?? null;
  const variantNavn = a.variant?.name ?? null;
  const bil = modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
  const avatar = a.avatar_path ? avatarUrl(a.avatar_path) : null;
  return { navn, bil, avatar };
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
    oversaettelser: laesKategoriOversaettelser(r.oversaettelser),
    groupKey: r.group_label,
  };
}

const KATEGORI_COLS_U = 'id, slug, name, description, icon, group_label, group_order, display_order, model_id, is_locked'; // i18n-ok (kolonneliste)
const KATEGORI_COLS = `${KATEGORI_COLS_U}, oversaettelser`; // i18n-ok (kolonneliste)

// U7: forum_categories-select med oversaettelser - og uden, hvis kolonnen endnu
// ikke findes (koden deployet før migrationen): så vises alt på dansk i stedet
// for at forummet vælter. `byg` får kolonnelisten og returnerer forespørgslen.
async function medKategoriKolonner<T>(
  byg: (cols: string) => PromiseLike<{ data: T | null; error: any }>,
): Promise<T | null> {
  const r = await byg(KATEGORI_COLS);
  if (!r.error) return r.data;
  if (!String(r.error?.message ?? '').includes('oversaettelser')) return r.data;
  return (await byg(KATEGORI_COLS_U)).data;
}

// U7: slug -> kategorinavn på læserens sprog (til lister der kun har slug/dansk
// navn fra en RPC: søgning, forum-moderering, aktivitet).
export async function getKategoriNavnPrSlug(sprog: UiSprog): Promise<Map<string, string>> {
  const liste = await getKategoriListe(sprog);
  return new Map(liste.map((k) => [k.slug, k.name]));
}

// --- Ejer-graf pr. model (P6) ---
// Social proof paa model-foraene: "N ejere" kommer fra Min garage (cars), ikke
// fra forum-traade, saa foraene er substantierede selv med 0 traade. cars +
// confirmations er read-all; vi henter de raa model-koblinger og aggregerer
// server-side (ingen owner_id naar browseren). Ingen migration noedvendig -
// virker paa de nuvaerende data med det samme. Vokser garagen sig stor, er en
// aggregat-view/RPC den naturlige naeste optimering (SQL'en ligger i HANDOVER).
// Returnerer model_id -> {ejere, biler, bekraeftelser}; kun modeller med data
// optraeder i map'et.
export async function getModelEjerTal(): Promise<Record<string, ModelEjerTal>> {
  const sb = supabaseServer();
  const [{ data: biler }, { data: bekr }] = await Promise.all([
    sb.from('cars').select('owner_id, model_id'),
    sb.from('confirmations').select('model_id'),
  ]);

  const ejereSet = new Map<string, Set<string>>(); // model_id -> distinkte owner_id
  const bilerAntal = new Map<string, number>();
  for (const c of (biler ?? []) as any[]) {
    const mid = c.model_id as string | null;
    if (!mid) continue;
    bilerAntal.set(mid, (bilerAntal.get(mid) ?? 0) + 1);
    if (c.owner_id) {
      let s = ejereSet.get(mid);
      if (!s) ejereSet.set(mid, (s = new Set<string>()));
      s.add(c.owner_id as string);
    }
  }

  const bekrAntal = new Map<string, number>();
  for (const r of (bekr ?? []) as any[]) {
    const mid = r.model_id as string | null;
    if (!mid) continue;
    bekrAntal.set(mid, (bekrAntal.get(mid) ?? 0) + 1);
  }

  const out: Record<string, ModelEjerTal> = {};
  for (const mid of new Set<string>([...bilerAntal.keys(), ...bekrAntal.keys()])) {
    out[mid] = {
      ejere: ejereSet.get(mid)?.size ?? 0,
      biler: bilerAntal.get(mid) ?? 0,
      bekraeftelser: bekrAntal.get(mid) ?? 0,
    };
  }
  return out;
}

// --- Forummets forside: kategorier grupperet + optalte tal ---
// sprog: læserens sprog ('da' = rå danske navne + oversaettelser, til editoren).
export async function getForumGrupper(sprog: UiSprog = 'da'): Promise<ForumGruppe[]> {
  const sb = supabaseServer();
  const [kats, { data: stats }, ejerTal] = await Promise.all([
    medKategoriKolonner<any[]>((cols) =>
      sb
        .from('forum_categories')
        .select(cols)
        .order('group_order', { ascending: true })
        .order('display_order', { ascending: true }),
    ),
    sb
      .from('forum_threads')
      .select('category_id, reply_count, view_count, last_post_at')
      .eq('is_removed', false),
    getModelEjerTal(),
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
    const et = k.modelId ? ejerTal[k.modelId] : undefined;
    const stat: ForumKategoriStat = {
      ...k,
      traade: s.traade,
      indlaeg: s.traade + s.svar, // hver tråd har ét åbnings-indlæg
      visninger: s.visninger,
      sidstAktiv: s.sidst,
      ejere: et?.ejere ?? 0,
      biler: et?.biler ?? 0,
      bekraeftelser: et?.bekraeftelser ?? 0,
    };
    if (!idx.has(k.groupKey)) {
      idx.set(k.groupKey, grupper.length);
      grupper.push({ label: k.groupKey, noegle: k.groupKey, kategorier: [] });
    }
    grupper[idx.get(k.groupKey)!].kategorier.push(stat);
  }
  if (sprog === 'da') return grupper;
  return grupper.map((g) => ({
    ...g,
    label: gruppeLabel(g.noegle, g.kategorier, sprog),
    kategorier: g.kategorier.map((k) => lokaliserKategori(k, sprog)),
  }));
}

// --- Enkelt kategori (slug) ---
export async function getKategori(slug: string, sprog: UiSprog = 'da'): Promise<ForumKategori | null> {
  const sb = supabaseServer();
  const data = await medKategoriKolonner<any>((cols) =>
    sb.from('forum_categories').select(cols).eq('slug', slug).maybeSingle(),
  );
  return data ? lokaliserKategori(mapKategori(data), sprog) : null;
}

// --- Flad, ordnet kategori-liste (til scope-dropdown i søgningen) ---
export async function getKategoriListe(sprog: UiSprog = 'da'): Promise<ForumKategori[]> {
  const sb = supabaseServer();
  const data = await medKategoriKolonner<any[]>((cols) =>
    sb
      .from('forum_categories')
      .select(cols)
      .order('group_order', { ascending: true })
      .order('display_order', { ascending: true }),
  );
  const liste = ((data ?? []) as any[]).map(mapKategori);
  if (sprog === 'da') return liste;
  // Gruppe-labelen slås op for hele gruppen (samme regel som forum-oversigten).
  const perGruppe = new Map<string, ForumKategori[]>();
  for (const k of liste) perGruppe.set(k.groupKey, [...(perGruppe.get(k.groupKey) ?? []), k]);
  return liste.map((k) => ({
    ...lokaliserKategori(k, sprog),
    groupLabel: gruppeLabel(k.groupKey, perGruppe.get(k.groupKey) ?? [k], sprog),
  }));
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
    const { navn, bil, avatar } = mapAuthor(r.author);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      forfatter: navn,
      bil,
      avatar,
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
export async function getTraad(traadSlug: string, sprog: UiSprog = 'da'): Promise<ForumTraadDetalje | null> {
  const sb = supabaseServer();
  const byg = (ekstra: string) =>
    sb
      .from('forum_threads')
      .select(
        `id, slug, title, created_at, is_pinned, is_locked, view_count, reply_count, is_removed,
       kategori:forum_categories ( slug, name, icon, is_locked, model_id${ekstra} )`,
      )
      .eq('slug', traadSlug)
      .limit(1)
      .maybeSingle();
  let { data, error } = await byg(', oversaettelser'); // i18n-ok (kolonne)
  // U7: før migrationen findes kolonnen ikke -> hent uden (dansk navn).
  if (error && String(error.message ?? '').includes('oversaettelser')) ({ data } = await byg(''));

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
      name: oversatFelt(k?.name ?? '', laesKategoriOversaettelser(k?.oversaettelser), sprog, 'name') ?? '',
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
export async function getForumSoeg(
  q: string,
  kategoriSlug?: string | null,
  maks = 50,
  sprog: UiSprog = 'da',
): Promise<ForumSoegeResultat[]> {
  const soegeord = (q ?? '').trim();
  if (!soegeord) return [];

  const sb = supabaseServer();
  const { data, error } = await sb.rpc('forum_soeg', {
    p_soegeord: soegeord,
    p_kategori: (kategoriSlug ?? '').trim() || null,
    p_maks: maks,
  });
  if (error || !data) return [];
  // U7: RPC'en giver det danske kategorinavn - slå op på læserens sprog via slug.
  const navne = sprog === 'da' ? null : await getKategoriNavnPrSlug(sprog);

  return (data as any[]).map((r) => {
    const modelNavn = r.bil_model ?? null;
    const variantNavn = r.bil_variant ?? null;
    const bil = modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
    return {
      id: r.thread_id,
      slug: r.slug,
      title: r.title,
      kategoriSlug: r.kategori_slug,
      kategoriNavn: navne?.get(r.kategori_slug) ?? r.kategori_navn,
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
      `id, thread_id, body, is_opening, edited, created_at, author_id, parent_id, is_removed,
       ${authorSelect('forum_posts_author_id_fkey')},
       svarTil:profiles!forum_posts_reply_to_author_fkey ( display_name ),
       billeder:forum_post_images ( path, display_order )`,
    )
    .eq('thread_id', threadId)
    // Fjernede indlæg hentes med, så et fjernet top-svar kan vises som tombstone
    // uden at tage sine undersvar med sig. Indholdet blankes server-side nedenfor.
    .order('is_opening', { ascending: false })
    .order('created_at', { ascending: true });

  const poster: ForumIndlaeg[] = ((data ?? []) as any[]).map((r) => {
    const { navn, bil, avatar } = mapAuthor(r.author);
    const fjernet = r.is_removed ?? false;
    const sorterede = ((r.billeder ?? []) as any[]).sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );
    const billederPaths = fjernet ? [] : sorterede.map((i) => i.path as string);
    const billeder = billederPaths.map((p) => forumBilledeUrl(p));
    const svarTilNavn =
      (Array.isArray(r.svarTil) ? r.svarTil[0]?.display_name : r.svarTil?.display_name) ?? null;
    return {
      id: r.id,
      threadId: r.thread_id,
      // Fjernet indlæg leaker hverken tekst eller billeder - kun positionen bevares.
      body: fjernet ? '' : r.body,
      forfatter: fjernet ? null : navn,
      bil: fjernet ? null : bil,
      avatar: fjernet ? null : avatar,
      authorId: r.author_id ?? null,
      createdAt: r.created_at,
      edited: r.edited ?? false,
      isOpening: r.is_opening ?? false,
      parentId: r.parent_id ?? null,
      isRemoved: fjernet,
      svarTilNavn: fjernet ? null : svarTilNavn,
      billeder,
      billederPaths,
      linkPreview: null,
    };
  });

  // P38: slå første URL i hvert (ikke-fjernet) indlæg op i preview-cachen og
  // hæng et kort på. Cachen er keyet på den NORMALISEREDE URL; vi beholder den
  // rå URL til den klikbare titel. ÉT kort pr. indlæg (første link). Best-effort:
  // mangler tabellen (migration ikke kørt endnu) sluges fejlen -> ingen kort.
  const raaUrlPr: Record<string, string> = {};
  const noegler = new Set<string>();
  for (const p of poster) {
    if (p.isRemoved || !p.body) continue;
    const raw = foersteUrl(p.body);
    if (!raw) continue;
    raaUrlPr[p.id] = raw;
    noegler.add(normaliserUrl(raw));
  }
  if (noegler.size > 0) {
    const { data: previews } = await sb
      .from('forum_link_previews')
      .select('url, title, description, image_url, ok')
      .in('url', Array.from(noegler));
    const kort: Record<string, any> = {};
    for (const row of (previews ?? []) as any[]) {
      if (row.ok && (row.title || row.image_url)) kort[row.url] = row;
    }
    for (const p of poster) {
      const raw = raaUrlPr[p.id];
      if (!raw) continue;
      const row = kort[normaliserUrl(raw)];
      if (!row) continue;
      p.linkPreview = {
        url: raw,
        title: row.title ?? null,
        description: row.description ?? null,
        image: row.image_url ?? null,
      };
    }
  }

  return poster;
}
