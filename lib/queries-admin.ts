import { supabaseServer } from '@/lib/supabase/server';
import { STATUSES, type Status } from '@/lib/config';

// =========================================================================
// Overblik - tal til stat-tiles
// =========================================================================
export type AdminStats = {
  meldinger: number;
  bekraeftelser: number;
  perStatus: Record<Status, number>;
};

function tomStatusMap(): Record<Status, number> {
  return STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<Status, number>);
}

export async function getAdminStats(): Promise<AdminStats> {
  const sb = supabaseServer();
  const [{ count: bekraeftelser }, { data: statusRows }] = await Promise.all([
    sb.from('confirmations').select('*', { count: 'exact', head: true }),
    sb.from('issues').select('status'),
  ]);

  const perStatus = tomStatusMap();
  for (const r of (statusRows ?? []) as { status: Status }[]) {
    if (r.status in perStatus) perStatus[r.status]++;
  }

  return {
    meldinger: (statusRows ?? []).length,
    bekraeftelser: bekraeftelser ?? 0,
    perStatus,
  };
}

// =========================================================================
// Forum - tal til overblik
// =========================================================================
export type ForumOverblik = { kategorier: number; traade: number; indlaeg: number };

export async function getForumOverblik(): Promise<ForumOverblik> {
  const sb = supabaseServer();
  const [kat, traade, indlaeg] = await Promise.all([
    sb.from('forum_categories').select('*', { count: 'exact', head: true }),
    sb.from('forum_threads').select('*', { count: 'exact', head: true }).eq('is_removed', false),
    // Indlaeg: tael kun indlaeg der selv IKKE er fjernet OG hvis traad heller ikke er fjernet.
    // fjernTraad saetter kun traadens is_removed=true, ikke indlaeggenes - derfor !inner-join + filter paa traaden,
    // ellers taeller aabnings-indlaeg fra fjernede traade stadig med.
    sb
      .from('forum_posts')
      .select('*, thread:forum_threads!inner(is_removed)', { count: 'exact', head: true })
      .eq('is_removed', false)
      .eq('thread.is_removed', false),
  ]);
  return {
    kategorier: kat.count ?? 0,
    traade: traade.count ?? 0,
    indlaeg: indlaeg.count ?? 0,
  };
}

// =========================================================================
// Seneste aktivitet - delt op pr. omraade (P23): feedback-aktivitet (meldinger
// + bekraeftelser) hoerer under Feedback-fanen, forum-aktivitet (traade +
// indlaeg) under Forum-fanen. Ikke laengere en blandet strom paa forsiden.
// =========================================================================
export type AktivitetPost = {
  kind: 'melding' | 'bekraeftelse' | 'forum_traad' | 'forum_indlaeg';
  titel: string;
  detalje: string | null;
  created_at: string;
  href: string | null;
};

// Feedback-strommen: nye meldinger + bekraeftelser (vises paa /admin/feedback).
export async function getFeedbackAktivitet(graense = 12): Promise<AktivitetPost[]> {
  const sb = supabaseServer();
  const [nye, bek] = await Promise.all([
    sb
      .from('issues')
      .select('id, title, type, created_at')
      .order('created_at', { ascending: false })
      .limit(graense),
    sb
      .from('confirmations')
      .select('created_at, issue_id, issues ( title ), models ( name )')
      .order('created_at', { ascending: false })
      .limit(graense),
  ]);

  const feed: AktivitetPost[] = [];

  for (const r of (nye.data ?? []) as any[]) {
    feed.push({
      kind: 'melding',
      titel: r.title,
      detalje: r.type === 'oenske' ? 'Ønske' : 'Fejl',
      created_at: r.created_at,
      href: `/melding/${r.id}`,
    });
  }

  for (const r of (bek.data ?? []) as any[]) {
    feed.push({
      kind: 'bekraeftelse',
      titel: r.issues?.title ?? 'en melding',
      detalje: r.models?.name ?? null,
      created_at: r.created_at,
      href: r.issue_id ? `/melding/${r.issue_id}` : null,
    });
  }

  feed.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return feed.slice(0, graense);
}

// Forum-strommen: nye traade + svar (vises paa /admin/forum).
export async function getForumAktivitet(graense = 12): Promise<AktivitetPost[]> {
  const sb = supabaseServer();
  const [traade, indlaeg] = await Promise.all([
    sb
      .from('forum_threads')
      .select('title, slug, created_at, kategori:forum_categories ( slug, name )')
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(graense),
    sb
      .from('forum_posts')
      .select(
        'created_at, is_opening, thread:forum_threads ( title, slug, is_removed, kategori:forum_categories ( slug ) )',
      )
      .eq('is_removed', false)
      .eq('is_opening', false)
      .order('created_at', { ascending: false })
      .limit(graense),
  ]);

  const feed: AktivitetPost[] = [];

  for (const r of (traade.data ?? []) as any[]) {
    const kat = r.kategori;
    feed.push({
      kind: 'forum_traad',
      titel: r.title,
      detalje: kat?.name ?? null,
      created_at: r.created_at,
      href: kat?.slug ? `/forum/${kat.slug}/${r.slug}` : null,
    });
  }

  for (const r of (indlaeg.data ?? []) as any[]) {
    const th = r.thread;
    if (!th || th.is_removed) continue; // svar i en fjernet tråd tælles ikke
    const katSlug = th.kategori?.slug ?? null;
    feed.push({
      kind: 'forum_indlaeg',
      titel: th.title ?? 'en tråd',
      detalje: null,
      created_at: r.created_at,
      href: katSlug ? `/forum/${katSlug}/${th.slug}` : null,
    });
  }

  feed.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return feed.slice(0, graense);
}

// =========================================================================
// Forum-moderering - seneste traade + indlaeg til /admin/forum
// =========================================================================
export type AdminForumTraad = {
  id: string;
  slug: string;
  kategoriSlug: string;
  kategoriNavn: string;
  title: string;
  forfatter: string | null;
  lastPostAt: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
};

export type AdminForumIndlaeg = {
  id: string;
  body: string;
  forfatter: string | null;
  createdAt: string;
  isOpening: boolean;
  traadTitel: string;
  traadSlug: string;
  kategoriSlug: string;
};

export async function getAdminForum(graense = 25): Promise<{
  traade: AdminForumTraad[];
  indlaeg: AdminForumIndlaeg[];
}> {
  const sb = supabaseServer();
  const [t, p] = await Promise.all([
    sb
      .from('forum_threads')
      .select(
        `id, slug, title, last_post_at, reply_count, view_count, is_pinned, is_locked,
         forfatter:profiles!forum_threads_author_id_fkey ( display_name ),
         kategori:forum_categories ( slug, name )`,
      )
      .eq('is_removed', false)
      .order('last_post_at', { ascending: false })
      .limit(graense),
    sb
      .from('forum_posts')
      .select(
        `id, body, created_at, is_opening,
         forfatter:profiles!forum_posts_author_id_fkey ( display_name ),
         thread:forum_threads ( title, slug, is_removed, kategori:forum_categories ( slug ) )`,
      )
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(graense),
  ]);

  const traade: AdminForumTraad[] = ((t.data ?? []) as any[]).map((r) => ({
    id: r.id,
    slug: r.slug,
    kategoriSlug: r.kategori?.slug ?? '',
    kategoriNavn: r.kategori?.name ?? '',
    title: r.title,
    forfatter: r.forfatter?.display_name ?? null,
    lastPostAt: r.last_post_at,
    replyCount: r.reply_count ?? 0,
    viewCount: r.view_count ?? 0,
    isPinned: r.is_pinned ?? false,
    isLocked: r.is_locked ?? false,
  }));

  const indlaeg: AdminForumIndlaeg[] = ((p.data ?? []) as any[])
    .filter((r) => r.thread && !r.thread.is_removed)
    .map((r) => ({
      id: r.id,
      body: r.body,
      forfatter: r.forfatter?.display_name ?? null,
      createdAt: r.created_at,
      isOpening: r.is_opening ?? false,
      traadTitel: r.thread?.title ?? '',
      traadSlug: r.thread?.slug ?? '',
      kategoriSlug: r.thread?.kategori?.slug ?? '',
    }));

  return { traade, indlaeg };
}

// =========================================================================
// Forum-rapporter (P21) - den indgående kø, beriget med det rapporterede
// indhold via admin_forum_rapporter() (security definer, moderator-gated).
// =========================================================================
export type ForumRapport = {
  reportId: string;
  threadId: string | null;
  postId: string | null;
  reason: string | null;
  kilde: string;
  handled: boolean;
  createdAt: string;
  reporterNavn: string;
  kategoriSlug: string | null;
  traadSlug: string | null;
  traadTitel: string | null;
  indhold: string | null;
  forfatterId: string | null;
  forfatterNavn: string;
  erFjernet: boolean;
};

// Kun ÅBNE rapporter (handled=false) - køen er "kræver opmærksomhed".
export async function getForumRapporter(): Promise<ForumRapport[]> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('admin_forum_rapporter');
  return ((data ?? []) as any[])
    .filter((r) => !r.handled)
    .map((r) => ({
      reportId: r.report_id,
      threadId: r.thread_id ?? null,
      postId: r.post_id ?? null,
      reason: r.reason ?? null,
      kilde: r.kilde ?? 'bruger',
      handled: r.handled ?? false,
      createdAt: r.created_at,
      reporterNavn: r.reporter_navn ?? 'En ejer',
      kategoriSlug: r.kategori_slug ?? null,
      traadSlug: r.traad_slug ?? null,
      traadTitel: r.traad_titel ?? null,
      indhold: r.indhold ?? null,
      forfatterId: r.forfatter_id ?? null,
      forfatterNavn: r.forfatter_navn ?? 'En ejer',
      erFjernet: r.er_fjernet ?? false,
    }));
}

// =========================================================================
// Aktivitet - hændelser pr. time/ugedag/dag (i dansk tid)
// =========================================================================
const KBH = 'Europe/Copenhagen';
const UGEDAGE = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

function deleIKbh(iso: string): { time: number; ugedagMan0: number; dato: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KBH,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return {
    time: parseInt(get('hour'), 10) % 24,
    ugedagMan0: map[get('weekday')] ?? 0,
    dato: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function sidste30Dage(perDato: Map<string, number>): { dato: string; antal: number }[] {
  const iDag = new Intl.DateTimeFormat('en-CA', {
    timeZone: KBH,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // yyyy-mm-dd
  const base = new Date(`${iDag}T12:00:00`);
  const out: { dato: string; antal: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    out.push({ dato: ds, antal: perDato.get(ds) ?? 0 });
  }
  return out;
}

export type Aktivitet = {
  total: number;
  stemmer: number;
  nyeMeldinger: number;
  perTime: number[]; // 24
  perUgedag: { label: string; antal: number }[]; // 7, Man..Søn
  per30dage: { dato: string; antal: number }[];
  travlestTime: number | null;
  roligstTime: number | null;
};

// =========================================================================
// Adgange - personer med rolle + pending invitationer
// =========================================================================
export type AdgangBruger = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  sidst_logget: string | null;
  oprettet: string;
};
export type AdgangInvitation = { email: string; role: string; created_at: string };

// Som AdgangBruger, men role kan være null (en vilkårlig oprettet bruger uden rolle).
export type AlleBruger = {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  sidst_logget: string | null;
  oprettet: string;
};

export async function getAdgange(): Promise<{
  brugere: AdgangBruger[];
  invitationer: AdgangInvitation[];
}> {
  const sb = supabaseServer();
  const [b, inv] = await Promise.all([
    sb.rpc('admin_brugere'),
    sb
      .from('pending_invitations')
      .select('email, role, created_at')
      .order('created_at', { ascending: false }),
  ]);
  return {
    brugere: (b.data ?? []) as AdgangBruger[],
    invitationer: (inv.data ?? []) as AdgangInvitation[],
  };
}

export async function getAktivitet(): Promise<Aktivitet> {
  const sb = supabaseServer();
  const [iss, con] = await Promise.all([
    sb.from('issues').select('created_at'),
    sb.from('confirmations').select('created_at'),
  ]);

  const haendelser: string[] = [
    ...((iss.data ?? []) as any[]).map((r) => r.created_at),
    ...((con.data ?? []) as any[]).map((r) => r.created_at),
  ];

  const perTime = new Array(24).fill(0);
  const perUge = new Array(7).fill(0);
  const perDato = new Map<string, number>();

  for (const ts of haendelser) {
    const { time, ugedagMan0, dato } = deleIKbh(ts);
    perTime[time]++;
    perUge[ugedagMan0]++;
    perDato.set(dato, (perDato.get(dato) ?? 0) + 1);
  }

  let travlestTime: number | null = null;
  let roligstTime: number | null = null;
  if (haendelser.length > 0) {
    travlestTime = perTime.indexOf(Math.max(...perTime));
    roligstTime = perTime.indexOf(Math.min(...perTime));
  }

  return {
    total: haendelser.length,
    stemmer: ((con.data ?? []) as any[]).length,
    nyeMeldinger: ((iss.data ?? []) as any[]).length,
    perTime,
    perUgedag: UGEDAGE.map((label, i) => ({ label, antal: perUge[i] })),
    per30dage: sidste30Dage(perDato),
    travlestTime,
    roligstTime,
  };
}

// =========================================================================
// Besked-anmeldelser - moderator-visning (Vaerkstedet)
// =========================================================================
// Beriget anmeldelse: raekke fra message_reports + den anmeldte besked (body,
// afsender) + anmelderens navn. Hentes via RPC admin_besked_anmeldelser, fordi
// messages-RLS ellers kun lader deltagere laese besked-indholdet (moderatoren
// er ikke deltager). RPC'en er moderator-gated og laekker kun anmeldte beskeder.
export type BeskedAnmeldelse = {
  id: string;
  messageId: string | null;
  conversationId: string | null;
  reason: string | null;
  handled: boolean;
  createdAt: string;
  anmelderNavn: string;
  beskedBody: string | null;
  beskedSenderId: string | null;
  beskedSenderNavn: string | null;
  beskedCreatedAt: string | null;
};

export async function getBeskedAnmeldelser(): Promise<BeskedAnmeldelse[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('admin_besked_anmeldelser');
  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((r): BeskedAnmeldelse => ({
    id: r.report_id,
    messageId: r.message_id ?? null,
    conversationId: r.conversation_id ?? null,
    reason: r.reason ?? null,
    handled: !!r.handled,
    createdAt: r.created_at,
    anmelderNavn: r.reporter_navn ?? 'En ejer',
    beskedBody: r.besked_body ?? null,
    beskedSenderId: r.besked_sender_id ?? null,
    beskedSenderNavn: r.besked_sender_navn ?? null,
    beskedCreatedAt: r.besked_created_at ?? null,
  }));
}

// =========================================================================
// Modeller-panel (P18): oversigt over modeller med brugs-tal + arkiv-status.
// En raekke pr. model (ogsaa arkiverede, saa de kan genaktiveres), via
// security-definer RPC admin_model_oversigt (er_admin-gated, korrekte tal
// uanset RLS). Styrer slet (kun tomme) / arkiver (i brug) / genaktiver.
// =========================================================================
export type ModelOversigt = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  archived: boolean;
  forumSlug: string | null;
  antalBiler: number;
  antalBekraeftelser: number;
  antalTraade: number;
};

export async function getModelOversigt(): Promise<ModelOversigt[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('admin_model_oversigt');
  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((r): ModelOversigt => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    platform: r.platform,
    archived: !!r.archived,
    forumSlug: r.forum_slug ?? null,
    antalBiler: Number(r.antal_biler ?? 0),
    antalBekraeftelser: Number(r.antal_bekraeftelser ?? 0),
    antalTraade: Number(r.antal_traade ?? 0),
  }));
}
