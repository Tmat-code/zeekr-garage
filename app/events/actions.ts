'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { sendMailBcc } from '@/lib/email';
import { SITE } from '@/lib/config';
import { validerEvent, type EventFejl, type OpdateringGrund } from '@/lib/events-fejl';
import { bygEventMail, grupperModtagere } from '@/lib/event-mail';
import { ORDBOGER, UI_SPROG } from '@/lib/i18n';

// U5: fejl gives tilbage som NØGLER (lib/events-fejl.ts) - aldrig som tekst eller
// rå DB-fejl. Klienten slår teksten op på læserens sprog ved render.
export type EventSvar<T = undefined> = { ok: true; data: T } | { ok: false; fejl: EventFejl };

function nej(fejl: EventFejl): { ok: false; fejl: EventFejl } {
  return { ok: false, fejl };
}

function dbNej(hvor: string, error: { message?: string } | null | undefined, fejl: EventFejl) {
  console.error(`[events] ${hvor}:`, error?.message);
  return nej(fejl);
}

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
  return base || 'event';
}

const erMod = erModerator;

type EventInput = {
  title: string;
  description?: string;
  location?: string;
  startsAt?: string | null; // ISO
  endsAt?: string | null; // ISO
};

export async function opretEvent(input: EventInput): Promise<EventSvar<string>> {
  if (!(await erMod())) return nej('kunModerator');
  const ugyldig = validerEvent(input);
  if (ugyldig) return nej(ugyldig);
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return nej('kunModerator');
  const t = input.title.trim();
  const slug = `${slugify(t)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await sb
    .from('events')
    .insert({
      title: t,
      slug,
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      created_by: user.id,
    })
    .select('slug')
    .single();
  if (error || !data) return dbNej('opret', error, 'kunneIkkeOprette');
  revalidatePath('/events');
  return { ok: true, data: `/events/${data.slug}` };
}

export async function retEvent(id: string, slug: string, input: EventInput): Promise<EventSvar> {
  if (!(await erMod())) return nej('kunModerator');
  const ugyldig = validerEvent(input);
  if (ugyldig) return nej(ugyldig);
  const t = input.title.trim();
  const sb = supabaseServer();
  const { error } = await sb
    .from('events')
    .update({
      title: t,
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
    })
    .eq('id', id);
  if (error) return dbNej('ret', error, 'kunneIkkeGemme');
  revalidatePath('/events');
  revalidatePath(`/events/${slug}`);
  return { ok: true, data: undefined };
}

export async function aflysEvent(id: string, slug: string, vaerd: boolean): Promise<EventSvar> {
  if (!(await erMod())) return nej('kunModerator');
  const sb = supabaseServer();
  const { error } = await sb.from('events').update({ is_cancelled: vaerd }).eq('id', id);
  if (error) return dbNej('aflys', error, 'kunneIkkeAflyse');
  revalidatePath('/events');
  revalidatePath(`/events/${slug}`);
  return { ok: true, data: undefined };
}

export async function sletEvent(id: string): Promise<EventSvar> {
  if (!(await erMod())) return nej('kunModerator');
  const sb = supabaseServer();
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) return dbNej('slet', error, 'kunneIkkeSlette');
  revalidatePath('/events');
  return { ok: true, data: undefined };
}

// --- Tilmelding (brugere) ---
export async function tilmeld(eventId: string, slug: string, note?: string): Promise<EventSvar> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return nej('logIndTilmeld');
  const { error } = await sb
    .from('event_signups')
    .upsert(
      { event_id: eventId, user_id: user.id, note: note?.trim() || null },
      { onConflict: 'event_id,user_id' },
    );
  if (error) return dbNej('tilmeld', error, 'kunneIkkeTilmelde');
  revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
  return { ok: true, data: undefined };
}

export async function afmeld(eventId: string, slug: string): Promise<EventSvar> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return nej('logIndTilmeld');
  const { error } = await sb
    .from('event_signups')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);
  if (error) return dbNej('afmeld', error, 'kunneIkkeAfmelde');
  revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
  return { ok: true, data: undefined };
}

// --- Opdatering til tilmeldte (moderator) ---
export async function sendOpdatering(
  eventId: string,
  slug: string,
  title: string,
  body: string,
): Promise<EventSvar<{ sent: number; grund: OpdateringGrund }>> {
  if (!(await erMod())) return nej('kunModerator');
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return nej('kunModerator');
  const tekst = body.trim();
  if (!tekst) return nej('skrivBesked');

  const { error } = await sb
    .from('event_updates')
    .insert({ event_id: eventId, body: tekst, created_by: user.id });
  if (error) return dbNej('opdatering', error, 'kunneIkkeSende');

  // Hent de tilmeldte (mail + sprog) og send én BCC-mail pr. sprog-gruppe (U8).
  // RPC'en er security definer + moderator-gated. Findes den nye RPC ikke endnu
  // (kode deployet før migrationen), bruges den gamle mail-liste, alle på dansk.
  // `info` er teknisk diagnose til serverloggen, ikke UI.
  let sent = 0;
  let info = '';
  try {
    let rows: unknown = null;
    const ny = await sb.rpc('event_deltager_modtagere', { e_id: eventId });
    if (!ny.error) {
      rows = ny.data;
    } else {
      const gl = await sb.rpc('event_deltager_emails', { e_id: eventId });
      if (gl.error) {
        info = `RPC-fejl: ${ny.error.message} / ${gl.error.message}`; // i18n-ok (log)
      } else {
        // Robust mod både scalar-array (["a@b"]) og objekt-array ([{event_deltager_emails:"a@b"}]).
        rows = ((gl.data ?? []) as any[]).map((x) => ({
          email: typeof x === 'string' ? x : x?.event_deltager_emails ?? x?.email,
          sprog: 'da',
        }));
      }
    }
    if (!info) {
      const grupper = grupperModtagere(rows);
      const ialt = UI_SPROG.reduce((n, sp) => n + grupper[sp].length, 0);
      if (ialt === 0) {
        info = 'ingen tilmeldte med email'; // i18n-ok (log)
      } else {
        const link = `https://${SITE.domain}/events/${slug}`;
        const fejlInfo: string[] = [];
        for (const sp of UI_SPROG) {
          if (grupper[sp].length === 0) continue;
          const { emne, html } = bygEventMail(ORDBOGER[sp].events.mail, {
            titel: title,
            tekst,
            link,
            domaene: SITE.domain,
            site: SITE.name,
          });
          const res = await sendMailBcc(grupper[sp], emne, html);
          sent += res.sent;
          if (res.info !== 'ok') fejlInfo.push(`${sp}: ${res.info}`);
        }
        info = fejlInfo.length ? fejlInfo.join(' | ') : 'ok';
      }
    }
  } catch (e: any) {
    info = `undtagelse: ${String(e?.message ?? e).slice(0, 140)}`;
  }

  revalidatePath(`/events/${slug}`);
  if (sent > 0) return { ok: true, data: { sent, grund: 'ok' } };
  if (info === 'ingen tilmeldte med email' || info === 'ingen gyldige modtager-emails') { // i18n-ok
    return { ok: true, data: { sent: 0, grund: 'ingenTilmeldte' } };
  }
  console.error('[events] opdaterings-mail:', info);
  return { ok: true, data: { sent: 0, grund: 'mailFejl' } };
}
