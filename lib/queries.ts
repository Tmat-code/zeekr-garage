import { supabaseServer } from '@/lib/supabase/server';
import { MODEL_FALLBACK, type Severity, type Status, type IssueType } from '@/lib/config';
import { meldBilledeUrl } from '@/lib/billeder';
import type { IssueRow, Model, Kommentar, VariantMap, MinBil, GarageBil } from '@/lib/types';

// Fælles select + mapper, så board og detalje-side viser det samme.
const ISSUE_SELECT = `id, type, title, description, category, severity, status, software_version, created_at,
       legacy_stemmer,
       issue_models ( models ( id, slug, name, platform ) ),
       issue_images ( path, display_order ),
       confirmations ( count ),
       comments ( count )`;

function mapIssue(row: any): IssueRow {
  const models = (row.issue_models ?? [])
    .map((im: any) => im.models)
    .filter(Boolean)
    .map((m: any) => ({ id: m.id, slug: m.slug, name: m.name, platform: m.platform }));
  const liveConf = Array.isArray(row.confirmations) ? (row.confirmations[0]?.count ?? 0) : 0;
  // Vist stemmetal = live konto-bekræftelser + importeret legacy-baseline.
  const confirmations = liveConf + (row.legacy_stemmer ?? 0);
  const comments = Array.isArray(row.comments) ? (row.comments[0]?.count ?? 0) : 0;
  const billeder = ((row.issue_images ?? []) as any[])
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((im: any) => meldBilledeUrl(im.path));
  return {
    id: row.id,
    type: (row.type ?? 'fejl') as IssueType,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity as Severity,
    status: row.status as Status,
    created_at: row.created_at,
    models,
    confirmations,
    comments,
    software_version: row.software_version ?? null,
    billeder,
  };
}

// --- Modeller ---
export async function getModels(): Promise<Model[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('models')
    .select('id, slug, name, platform, display_order')
    .order('display_order', { ascending: true });

  if (error || !data || data.length === 0) {
    // Fallback hvis DB ikke kan naas - siden virker stadig.
    return MODEL_FALLBACK.map((m, i) => ({
      id: m.slug,
      slug: m.slug,
      name: m.name,
      platform: m.platform,
      display_order: (i + 1) * 10,
    }));
  }
  return data as Model[];
}

// --- Fejl (issues) med koblede modeller + optalte bekraeftelser ---
export async function getIssues(): Promise<IssueRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('issues')
    .select(ISSUE_SELECT)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapIssue);
}

// --- Enkelt melding (til detalje-siden) ---
export async function getIssueDetalje(id: string): Promise<IssueRow | null> {
  const sb = supabaseServer();
  const { data, error } = await sb.from('issues').select(ISSUE_SELECT).eq('id', id).single();
  if (error || !data) return null;
  return mapIssue(data);
}

// --- Brugerens egen bil (til ét-kliks "mig med") ---
export async function getMyCar(): Promise<MinBil | null> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from('profiles')
    .select(
      'car_model_id, car_variant_id, model:models!profiles_car_model_id_fkey ( name ), variant:variants!profiles_car_variant_id_fkey ( name )',
    )
    .eq('id', user.id)
    .single();

  if (!data?.car_model_id) return null;
  return {
    modelId: data.car_model_id,
    variantId: data.car_variant_id ?? null,
    modelName: (data as any).model?.name ?? '',
    variantName: (data as any).variant?.name ?? null,
  };
}

// --- Alle brugerens biler (til multi-model "mig med") ---
export async function getMyCars(): Promise<GarageBil[]> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data } = await sb
    .from('cars')
    .select(
      'id, model_id, variant_id, model:models!cars_model_id_fkey ( name ), variant:variants!cars_variant_id_fkey ( name )',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  return ((data ?? []) as any[]).map((r) => ({
    carId: r.id,
    modelId: r.model_id,
    variantId: r.variant_id ?? null,
    modelName: r.model?.name ?? '',
    variantName: r.variant?.name ?? null,
  }));
}

// --- Mit visningsnavn (det der vises som forfatter overalt) ---
export async function getMitNavn(): Promise<string> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return '';

  const { data } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  return (data as any)?.display_name ?? '';
}

// --- Varianter pr. model (til "mig med"-flowet) ---
export async function getVarianter(): Promise<VariantMap> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('variants')
    .select('id, name, model_id')
    .order('display_order', { ascending: true });
  const map: VariantMap = {};
  for (const r of (data ?? []) as any[]) {
    (map[r.model_id] ??= []).push({ id: r.id, name: r.name });
  }
  return map;
}

// --- Variant-fordeling på en melding (til detalje-siden) ---
export async function getVariantFordeling(
  issueId: string,
): Promise<{ navn: string; antal: number }[]> {
  const sb = supabaseServer();
  const [{ data: live }, { data: issue }] = await Promise.all([
    sb.from('confirmations').select('variant_id, variants ( name )').eq('issue_id', issueId),
    sb.from('issues').select('legacy_biler').eq('id', issueId).single(),
  ]);

  const m = new Map<string, number>();
  for (const r of (live ?? []) as any[]) {
    const navn = r.variants?.name ?? 'Uden variant';
    m.set(navn, (m.get(navn) ?? 0) + 1);
  }
  // Importeret legacy-fordeling lægges oveni.
  for (const b of ((issue?.legacy_biler ?? []) as any[])) {
    if (b?.variant) m.set(b.variant, (m.get(b.variant) ?? 0) + Number(b.n ?? 0));
  }

  return [...m.entries()]
    .map(([navn, antal]) => ({ navn, antal }))
    .sort((a, b) => b.antal - a.antal);
}

// --- Kommentarer på en melding ("Byggemøde") ---
export async function getComments(issueId: string): Promise<Kommentar[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('comments')
    .select('id, body, is_solution, created_at, author_id, author_navn, profiles ( display_name )')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    body: r.body,
    is_solution: r.is_solution,
    created_at: r.created_at,
    author_id: r.author_id,
    author_navn: r.profiles?.display_name ?? r.author_navn ?? null,
  }));
}

// --- Den aktuelle brugers egne bekraeftelser pr. melding (antal egne biler) ---
// issue_id -> hvor mange af MINE biler der har bekraeftet meldingen. Bruges
// til "stemt"-markering (antal > 0) og til praecis optimistisk optaelling naar
// man bekraefter/fjerner med flere biler.
export async function getMyConfirmedCounts(): Promise<Record<string, number>> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return {};

  const { data } = await sb
    .from('confirmations')
    .select('issue_id')
    .eq('user_id', user.id);

  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as any[]) {
    counts[r.issue_id] = (counts[r.issue_id] ?? 0) + 1;
  }
  return counts;
}

// --- Aktuel bruger (login-tilstand i header m.m.) ---
export async function getCurrentUser() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

// --- Forside-besked (banner) ---
export type ForsideBesked = { message: string; active: boolean };

// Til admin-editoren: raa raekke uanset active.
export async function getForsideBeskedRaw(): Promise<ForsideBesked> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('site_announcement')
    .select('message, active')
    .eq('id', 1)
    .single();
  return { message: data?.message ?? '', active: data?.active ?? false };
}

// Til forsiden: kun hvis aktiv + har tekst, ellers null (intet banner).
export async function getForsideBesked(): Promise<string | null> {
  const { message, active } = await getForsideBeskedRaw();
  return active && message.trim() ? message : null;
}
