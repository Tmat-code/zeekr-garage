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
// Forum-moderering (P16) - paginerede lister til /admin/forum, drevet af de
// moderator-laesbare RPC'er admin_forum_mod_traade / _indlaeg (M5). Samme
// afkortnings-vej som admin_alle_brugere (P20): fritekst-soeg + "kraever
// opmaerksomhed"-filter + limit/offset ("vis flere") + total ("viser X af Y").
// har_rapport/forfatter_spaerret returneres raat, saa UI kan saette et maerke
// paa raekken selv i "Alle"-visningen.
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
  harRapport: boolean;
  forfatterSpaerret: boolean;
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
  harRapport: boolean;
  forfatterSpaerret: boolean;
};

export type ForumModFiltre = {
  soeg?: string;
  kunOpm?: boolean; // true = kun "kraever opmaerksomhed" (rapport eller spaerret forfatter)
  limit?: number;
  offset?: number;
};

export type ForumModTraadSide = { traade: AdminForumTraad[]; total: number };
export type ForumModIndlaegSide = { indlaeg: AdminForumIndlaeg[]; total: number };

export async function getForumModTraade(f: ForumModFiltre = {}): Promise<ForumModTraadSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('admin_forum_mod_traade', {
    p_soeg: (f.soeg ?? '').trim(),
    p_kun_opm: f.kunOpm ?? false,
    p_limit: f.limit ?? 25,
    p_offset: f.offset ?? 0,
  });
  const rows = (data ?? []) as any[];
  return {
    traade: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      kategoriSlug: r.kategori_slug ?? '',
      kategoriNavn: r.kategori_navn ?? '',
      title: r.title,
      forfatter: r.forfatter ?? null,
      lastPostAt: r.last_post_at,
      replyCount: r.reply_count ?? 0,
      viewCount: r.view_count ?? 0,
      isPinned: r.is_pinned ?? false,
      isLocked: r.is_locked ?? false,
      harRapport: r.har_rapport ?? false,
      forfatterSpaerret: r.forfatter_spaerret ?? false,
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

export async function getForumModIndlaeg(f: ForumModFiltre = {}): Promise<ForumModIndlaegSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('admin_forum_mod_indlaeg', {
    p_soeg: (f.soeg ?? '').trim(),
    p_kun_opm: f.kunOpm ?? false,
    p_limit: f.limit ?? 25,
    p_offset: f.offset ?? 0,
  });
  const rows = (data ?? []) as any[];
  return {
    indlaeg: rows.map((r) => ({
      id: r.id,
      body: r.body,
      forfatter: r.forfatter ?? null,
      createdAt: r.created_at,
      isOpening: r.is_opening ?? false,
      traadTitel: r.traad_titel ?? '',
      traadSlug: r.traad_slug ?? '',
      kategoriSlug: r.kategori_slug ?? '',
      harRapport: r.har_rapport ?? false,
      forfatterSpaerret: r.forfatter_spaerret ?? false,
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
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

// Antal åbne forum-rapporter - til nav-badges (Værkstedet + Forum-fanen).
// RLS (forum_reports_select_mod) sikrer at ikke-moderatorer tæller 0.
export async function getAabneRapporterAntal(): Promise<number> {
  const sb = supabaseServer();
  const { count } = await sb
    .from('forum_reports')
    .select('id', { count: 'exact', head: true })
    .eq('handled', false);
  return count ?? 0;
}

export type ForumRapportFiltre = { limit?: number; offset?: number };
export type ForumRapportSide = { rapporter: ForumRapport[]; total: number };

// Kun ÅBNE rapporter (handled=false) - køen er "kræver opmærksomhed".
// Defensivt loft (P24): limit/offset + total afkortes nu i RPC'en, samme
// vej som forum-moderingen (P16) og bruger-overblikket (P20), så en dårlig dag
// med mange rapporter ikke bliver en mur. handled-filtret ligger nu i basen.
export async function getForumRapporter(
  f: ForumRapportFiltre = {},
): Promise<ForumRapportSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('admin_forum_rapporter', {
    p_limit: f.limit ?? 20,
    p_offset: f.offset ?? 0,
  });
  const rows = (data ?? []) as any[];
  return {
    rapporter: rows.map((r) => ({
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
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

// =========================================================================
// Kontakt-beskeder (privat bagdoer til staben). Laeses af HELE staben
// (RPC'en gater paa er_moderator). Defensivt loft som rapport-koeen (P24):
// p_limit/p_offset + total via window-count. Ubehandlede foerst, nyeste foerst.
// =========================================================================
export type KontaktBesked = {
  id: string;
  userId: string | null;
  navn: string;
  svarMail: string | null;
  emne: string;
  besked: string;
  behandlet: boolean;
  createdAt: string;
};

export type KontaktFiltre = { limit?: number; offset?: number };
export type KontaktSide = { beskeder: KontaktBesked[]; total: number };

export async function getKontaktBeskeder(f: KontaktFiltre = {}): Promise<KontaktSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('kontakt_beskeder_liste', {
    p_limit: f.limit ?? 20,
    p_offset: f.offset ?? 0,
  });
  const rows = (data ?? []) as any[];
  return {
    beskeder: rows.map((r) => ({
      id: r.id,
      userId: r.user_id ?? null,
      navn: r.navn ?? 'Ejer',
      svarMail: r.svar_mail ?? null,
      emne: r.emne ?? '',
      besked: r.besked ?? '',
      behandlet: r.behandlet ?? false,
      createdAt: r.created_at,
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

// =========================================================================
// Aktivitet - vaekst/engagement (P28): unikke aktive brugere pr. dag + nye
// brugere pr. dag, sidste 30 dage, i dansk tid. "Aktiv" = distinkt bruger der
// gjorde noget den dag: stemte (confirmations) / meldte (issues) / skrev en
// forum-traad eller -svar (forum_threads/forum_posts) / sendte en besked
// (messages). Server-side union - datasaettet er lille, saa ingen migration;
// en RPC/view bliver foerst relevant hvis maengden vokser. Deploy-timing er
// degraderet til en enkelt note (roligste klokkeslaet), ikke laengere en graf.
// =========================================================================
const KBH = 'Europe/Copenhagen';

function deleIKbh(iso: string): { time: number; dato: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KBH,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    time: parseInt(get('hour'), 10) % 24,
    dato: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

// De 30 KBH-datoer t.o.m. i dag (aeldste foerst), som yyyy-mm-dd.
function sidste30Datoer(): string[] {
  const iDag = new Intl.DateTimeFormat('en-CA', {
    timeZone: KBH,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // yyyy-mm-dd
  const base = new Date(`${iDag}T12:00:00`);
  const out: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`,
    );
  }
  return out;
}

export type Aktivitet = {
  aktiveIAlt: number; // distinkte aktive brugere i hele 30-dages-vinduet
  nyeIAlt: number; // nye brugere i vinduet
  brugereIAlt: number; // profiles i alt (all-time)
  aktive30dage: { dato: string; antal: number }[]; // distinkte aktive pr. dag
  nye30dage: { dato: string; antal: number }[]; // nye brugere pr. dag
  travlestTime: number | null;
  roligstTime: number | null;
  harData: boolean; // om der overhovedet var aktivitet i vinduet
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

// =========================================================================
// Bruger-administration (P20) - overblik + status, drevet af admin_alle_brugere
// (moderator-laesbar). Status udledes af spaerret_til i RPC'en.
// =========================================================================
export type BrugerStatus = 'aktiv' | 'suspenderet' | 'bannet';

export type BrugerOverblik = {
  id: string;
  email: string;
  displayName: string | null;
  rolle: string | null;
  sidstLogget: string | null;
  oprettet: string;
  spaerretTil: string | null;
  status: BrugerStatus;
};

export type BrugerFiltre = {
  soeg?: string;
  rolle?: string | null; // 'admin' | 'moderator' | 'ingen' | null (= alle)
  status?: string | null; // 'aktiv' | 'suspenderet' | 'bannet' | null (= alle)
  sort?: string; // 'nyeste' | 'aktiv' (sidst logget) | 'navn'
  limit?: number;
  offset?: number;
};

export type BrugerSide = { brugere: BrugerOverblik[]; total: number };

export async function getBrugerOverblik(f: BrugerFiltre = {}): Promise<BrugerSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('admin_alle_brugere', {
    p_soeg: (f.soeg ?? '').trim(),
    p_rolle: f.rolle ?? null,
    p_status: f.status ?? null,
    p_sort: f.sort ?? 'nyeste',
    p_limit: f.limit ?? 25,
    p_offset: f.offset ?? 0,
  });
  const rows = (data ?? []) as any[];
  return {
    brugere: rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name ?? null,
      rolle: r.role ?? null,
      sidstLogget: r.sidst_logget ?? null,
      oprettet: r.oprettet,
      spaerretTil: r.spaerret_til ?? null,
      status: (r.status ?? 'aktiv') as BrugerStatus,
    })),
    // count(*) over () staar paa hver raekke; 0 naar filtreringen er tom.
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

export async function getAktivitet(): Promise<Aktivitet> {
  const sb = supabaseServer();

  // Vinduet: de 30 KBH-datoer t.o.m. i dag. Hent raekker lidt bredere (31 dage
  // i UTC) og lad dag-bucketingen + gyldigeDatoer skaere praecist, saa TZ-kant
  // (CET/CEST) ikke taber en dag.
  const gyldigeDatoer = sidste30Datoer();
  const gyldige = new Set(gyldigeDatoer);
  const cutoff = new Date(Date.now() - 31 * 864e5).toISOString();

  const [con, iss, traade, indlaeg, msg, nye, antal] = await Promise.all([
    sb.from('confirmations').select('user_id, created_at').gte('created_at', cutoff),
    sb.from('issues').select('created_by, created_at').gte('created_at', cutoff),
    sb.from('forum_threads').select('author_id, created_at').gte('created_at', cutoff),
    sb.from('forum_posts').select('author_id, created_at').gte('created_at', cutoff),
    sb.from('messages').select('sender_id, created_at').gte('created_at', cutoff),
    sb.from('profiles').select('created_at').gte('created_at', cutoff),
    sb.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  // Distinkte aktive bruger-id'er pr. dag (Set pr. dato) + raa haendelser pr.
  // klokkeslaet (til deploy-noten). Null-id'er (slettede forfattere) udelades.
  const aktivePerDag = new Map<string, Set<string>>();
  const globalAktive = new Set<string>();
  const perTime = new Array<number>(24).fill(0);

  const kilder: { rows: any[]; idKey: string }[] = [
    { rows: (con.data ?? []) as any[], idKey: 'user_id' },
    { rows: (iss.data ?? []) as any[], idKey: 'created_by' },
    { rows: (traade.data ?? []) as any[], idKey: 'author_id' },
    { rows: (indlaeg.data ?? []) as any[], idKey: 'author_id' },
    { rows: (msg.data ?? []) as any[], idKey: 'sender_id' },
  ];

  for (const { rows, idKey } of kilder) {
    for (const r of rows) {
      const uid = r[idKey] as string | null;
      if (!uid || !r.created_at) continue;
      const { time, dato } = deleIKbh(r.created_at);
      if (!gyldige.has(dato)) continue;
      perTime[time]++;
      let set = aktivePerDag.get(dato);
      if (!set) {
        set = new Set<string>();
        aktivePerDag.set(dato, set);
      }
      set.add(uid);
      globalAktive.add(uid);
    }
  }

  // Nye brugere pr. dag (profiles.created_at).
  const nyePerDag = new Map<string, number>();
  for (const r of (nye.data ?? []) as any[]) {
    if (!r.created_at) continue;
    const { dato } = deleIKbh(r.created_at);
    if (!gyldige.has(dato)) continue;
    nyePerDag.set(dato, (nyePerDag.get(dato) ?? 0) + 1);
  }

  const aktive30dage = gyldigeDatoer.map((d) => ({ dato: d, antal: aktivePerDag.get(d)?.size ?? 0 }));
  const nye30dage = gyldigeDatoer.map((d) => ({ dato: d, antal: nyePerDag.get(d) ?? 0 }));
  const nyeIAlt = nye30dage.reduce((s, d) => s + d.antal, 0);

  const harData = globalAktive.size > 0;
  let travlestTime: number | null = null;
  let roligstTime: number | null = null;
  if (perTime.some((n) => n > 0)) {
    travlestTime = perTime.indexOf(Math.max(...perTime));
    roligstTime = perTime.indexOf(Math.min(...perTime));
  }

  return {
    aktiveIAlt: globalAktive.size,
    nyeIAlt,
    brugereIAlt: antal.count ?? 0,
    aktive30dage,
    nye30dage,
    travlestTime,
    roligstTime,
    harData,
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

// =========================================================================
// Audit-log (P32) - superadmin-only oversigts-log + revert. RPC'erne gater selv
// paa er_superadmin() (non-superadmin faar 0 raekker), saa disse er aegte selv
// uden ekstra TS-gate.
// =========================================================================
export type AuditAktoer = {
  aktoer: string | null;
  navn: string;
  rolle: string | null;
  antal: number;
  seneste: string | null;
};

export type AuditHaendelse = {
  id: number;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  tabel: string;
  raekkeId: string | null;
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  createdAt: string;
  aktoer?: string | null;
  aktoerNavn?: string | null;
  kanFortrydes: boolean;
};

export type AuditSide = { haendelser: AuditHaendelse[]; total: number };

export async function getAuditAktoerer(): Promise<AuditAktoer[]> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('superadmin_audit_aktoerer');
  return ((data ?? []) as any[]).map((r) => ({
    aktoer: r.aktoer ?? null,
    navn: r.navn ?? 'Ukendt',
    rolle: r.rolle ?? null,
    antal: Number(r.antal ?? 0),
    seneste: r.seneste ?? null,
  }));
}

function mapHaendelse(r: any): AuditHaendelse {
  return {
    id: Number(r.id),
    op: r.op,
    tabel: r.tabel,
    raekkeId: r.raekke_id ?? null,
    oldData: r.old_data ?? null,
    newData: r.new_data ?? null,
    createdAt: r.created_at,
    aktoer: r.aktoer ?? undefined,
    aktoerNavn: r.aktoer_navn ?? undefined,
    kanFortrydes: !!r.kan_fortrydes,
  };
}

export async function getAuditSpor(
  aktoer: string | null,
  limit = 50,
  offset = 0,
): Promise<AuditSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('superadmin_audit_spor', {
    p_aktoer: aktoer,
    p_limit: limit,
    p_offset: offset,
  });
  const rows = (data ?? []) as any[];
  return {
    haendelser: rows.map(mapHaendelse),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

export async function getAuditSeneste(limit = 50, offset = 0): Promise<AuditSide> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('superadmin_audit_seneste', {
    p_limit: limit,
    p_offset: offset,
  });
  const rows = (data ?? []) as any[];
  return {
    haendelser: rows.map(mapHaendelse),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}
