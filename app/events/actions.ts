'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { sendMailBcc } from '@/lib/email';
import { SITE } from '@/lib/config';
import { validerEvent, type EventFejl, type OpdateringGrund } from '@/lib/events-fejl';

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

  // Hent de tilmeldtes emails. NB: selve mailen er stadig DANSK for alle (U8:
  // kræver at RPC'en også giver modtagerens sprog, så der kan sendes pr.
  // sprog-gruppe). `info` er teknisk diagnose til serverloggen, ikke UI. (security-definer RPC, moderator-gated) og mail dem.
  let sent = 0;
  let info = '';
  try {
    const { data: emails, error: rpcErr } = await sb.rpc('event_deltager_emails', {
      e_id: eventId,
    });
    if (rpcErr) {
      info = `RPC-fejl: ${rpcErr.message}`;
    } else {
      // Robust mod både scalar-array (["a@b"]) og objekt-array ([{event_deltager_emails:"a@b"}]).
      const liste = ((emails ?? []) as any[])
        .map((x) => (typeof x === 'string' ? x : x?.event_deltager_emails ?? x?.email))
        .filter((m: any) => typeof m === 'string' && m.includes('@'));
      if (liste.length === 0) {
        info = 'ingen tilmeldte med email'; // i18n-ok (log)
      } else {
        const link = `https://${SITE.domain}/events/${slug}`;
        // i18n-ok (U8): event-mailen er dansk indtil U8.
        const html =
          `<p>Der er en ny opdatering til <strong>${escapeHtml(title)}</strong>:</p>` + // i18n-ok (U8)
          `<p style="white-space:pre-line">${escapeHtml(tekst)}</p>` + // i18n-ok (U8)
          `<p><a href="${link}">Se eventet på ${SITE.domain}</a></p>` + // i18n-ok (U8)
          `<hr><p style="color:#888;font-size:12px">Du får denne mail, fordi du er tilmeldt eventet på ${SITE.name}.</p>`; // i18n-ok (U8)
        const res = await sendMailBcc(liste, `Opdatering: ${title} - ${SITE.name}`, html); // i18n-ok (U8)
        sent = res.sent;
        info = res.info;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
