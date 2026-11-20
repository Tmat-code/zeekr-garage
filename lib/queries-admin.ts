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

// =========================================================================
// Aktivitet — hændelser pr. time/ugedag/dag (i dansk tid)
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
