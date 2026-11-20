import { supabaseServer } from '@/lib/supabase/server';
import { STATUSES, type Status } from '@/lib/config';

// =========================================================================
// Overblik — tal til stat-tiles
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
// Seneste aktivitet — forenet feed af nye meldinger + bekraeftelser
// =========================================================================
export type AktivitetPost = {
  kind: 'melding' | 'bekraeftelse';
  titel: string;
  detalje: string | null;
  created_at: string;
};

export async function getSenesteAktivitet(graense = 12): Promise<AktivitetPost[]> {
  const sb = supabaseServer();
  const [nye, bek] = await Promise.all([
    sb
      .from('issues')
      .select('title, type, created_at')
      .order('created_at', { ascending: false })
      .limit(graense),
    sb
      .from('confirmations')
      .select('created_at, issues ( title ), models ( name )')
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
    });
  }

  for (const r of (bek.data ?? []) as any[]) {
    feed.push({
      kind: 'bekraeftelse',
      titel: r.issues?.title ?? 'en melding',
      detalje: r.models?.name ?? null,
      created_at: r.created_at,
    });
  }

  feed.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return feed.slice(0, graense);
}
