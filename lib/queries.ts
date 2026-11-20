import { supabaseServer } from '@/lib/supabase/server';
import { MODEL_FALLBACK, type Severity, type Status, type IssueType } from '@/lib/config';
import type { IssueRow, Model } from '@/lib/types';

// --- Modeller ---
export async function getModels(): Promise<Model[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('models')
    .select('id, slug, name, platform, display_order')
    .order('display_order', { ascending: true });

  if (error || !data || data.length === 0) {
    // Fallback hvis DB ikke kan naas — siden virker stadig.
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
    .select(
      `id, type, title, description, category, severity, status, created_at,
       issue_models ( models ( id, slug, name, platform ) ),
       confirmations ( count )`,
    )
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any): IssueRow => {
    const models = (row.issue_models ?? [])
      .map((im: any) => im.models)
      .filter(Boolean)
      .map((m: any) => ({ id: m.id, slug: m.slug, name: m.name, platform: m.platform }));
    const confirmations = Array.isArray(row.confirmations)
      ? (row.confirmations[0]?.count ?? 0)
      : 0;
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
      software_version: null,
    };
  });
}

// --- Den aktuelle brugers egne bekraeftelser (til "stemt"-markering) ---
export async function getMyConfirmedIssueIds(): Promise<Set<string>> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Set();

  const { data } = await sb
    .from('confirmations')
    .select('issue_id')
    .eq('user_id', user.id);

  return new Set((data ?? []).map((r: any) => r.issue_id as string));
}

// --- Aktuel bruger (login-tilstand i header m.m.) ---
export async function getCurrentUser() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}
