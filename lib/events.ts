import { supabaseServer } from '@/lib/supabase/server';
import type {
  EventRow,
  EventDetalje,
  EventDeltager,
  EventOpdatering,
  MinTilmelding,
} from '@/lib/types';

const EVENT_SELECT = `id, slug, title, description, location, starts_at, ends_at, is_cancelled,
  opretter:profiles!events_created_by_fkey ( display_name ),
  event_signups ( count )`;

function mapEvent(r: any): EventRow {
  const signupCount = Array.isArray(r.event_signups) ? (r.event_signups[0]?.count ?? 0) : 0;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description ?? null,
    location: r.location ?? null,
    startsAt: r.starts_at ?? null,
    endsAt: r.ends_at ?? null,
    isCancelled: r.is_cancelled ?? false,
    signupCount,
    opretter: r.opretter?.display_name ?? null,
  };
}

// Alle events, delt i kommende og afholdte (dansk tid, bedst-effort på klienten via ISO).
export async function getEvents(): Promise<{ kommende: EventRow[]; afholdte: EventRow[] }> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('events')
    .select(EVENT_SELECT)
    .order('starts_at', { ascending: true, nullsFirst: true });

  const alle = ((data ?? []) as any[]).map(mapEvent);
  const nu = Date.now();
  const kommende: EventRow[] = [];
  const afholdte: EventRow[] = [];
  for (const e of alle) {
    // Uden dato (planlægges) eller i fremtiden => kommende.
    if (!e.startsAt || new Date(e.startsAt).getTime() >= nu) kommende.push(e);
    else afholdte.push(e);
  }
  // Afholdte: nyeste først.
  afholdte.reverse();
  return { kommende, afholdte };
}

export async function getEvent(slug: string): Promise<EventDetalje | null> {
  const sb = supabaseServer();
  const { data } = await sb.from('events').select(EVENT_SELECT).eq('slug', slug).limit(1).maybeSingle();
  if (!data) return null;
  const base = mapEvent(data);

  const [{ data: sig }, { data: upd }] = await Promise.all([
    sb
      .from('event_signups')
      .select('note, created_at, profiles ( display_name )')
      .eq('event_id', base.id)
      .order('created_at', { ascending: true }),
    sb
      .from('event_updates')
      .select('id, body, created_at, forfatter:profiles!event_updates_created_by_fkey ( display_name )')
      .eq('event_id', base.id)
      .order('created_at', { ascending: false }),
  ]);

  const deltagere: EventDeltager[] = ((sig ?? []) as any[]).map((r) => ({
    navn: r.profiles?.display_name ?? null,
    note: r.note ?? null,
  }));
  const opdateringer: EventOpdatering[] = ((upd ?? []) as any[]).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    forfatter: r.forfatter?.display_name ?? null,
  }));

  return { ...base, deltagere, opdateringer };
}

// Er den aktuelle bruger tilmeldt dette event?
export async function getMinTilmelding(eventId: string): Promise<MinTilmelding> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { tilmeldt: false, note: null };
  const { data } = await sb
    .from('event_signups')
    .select('note')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();
  return { tilmeldt: !!data, note: (data as any)?.note ?? null };
}
