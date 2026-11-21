'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { sendMailBcc } from '@/lib/email';
import { SITE } from '@/lib/config';

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

async function kraevMod() {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
}

type EventInput = {
  title: string;
  description?: string;
  location?: string;
  startsAt?: string | null; // ISO
  endsAt?: string | null; // ISO
};

export async function opretEvent(input: EventInput): Promise<string> {
  await kraevMod();
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const t = input.title.trim();
  if (t.length < 3) throw new Error('Giv eventet en sigende titel.');
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
      created_by: user!.id,
    })
    .select('slug')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Kunne ikke oprette eventet.');
  revalidatePath('/events');
  return `/events/${data.slug}`;
}

export async function retEvent(id: string, slug: string, input: EventInput): Promise<void> {
  await kraevMod();
  const t = input.title.trim();
  if (t.length < 3) throw new Error('Giv eventet en sigende titel.');
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
  if (error) throw new Error(error.message);
  revalidatePath('/events');
  revalidatePath(`/events/${slug}`);
}

export async function aflysEvent(id: string, slug: string, vaerd: boolean): Promise<void> {
  await kraevMod();
  const sb = supabaseServer();
  const { error } = await sb.from('events').update({ is_cancelled: vaerd }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/events');
  revalidatePath(`/events/${slug}`);
}

export async function sletEvent(id: string): Promise<void> {
  await kraevMod();
  const sb = supabaseServer();
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/events');
}

// --- Tilmelding (brugere) ---
export async function tilmeld(eventId: string, slug: string, note?: string): Promise<void> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at melde dig til.');
  const { error } = await sb
    .from('event_signups')
    .upsert(
      { event_id: eventId, user_id: user.id, note: note?.trim() || null },
      { onConflict: 'event_id,user_id' },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
}

export async function afmeld(eventId: string, slug: string): Promise<void> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind.');
  const { error } = await sb
    .from('event_signups')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
}

// --- Opdatering til tilmeldte (moderator) ---
export async function sendOpdatering(
  eventId: string,
  slug: string,
  title: string,
  body: string,
): Promise<{ sent: number; info: string }> {
  await kraevMod();
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tekst = body.trim();
  if (!tekst) throw new Error('Skriv en besked.');

  const { error } = await sb
    .from('event_updates')
    .insert({ event_id: eventId, body: tekst, created_by: user!.id });
  if (error) throw new Error(error.message);

  // Hent de tilmeldtes emails (security-definer RPC, moderator-gated) og mail dem.
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
        info = 'ingen tilmeldte med email';
      } else {
        const link = `https://${SITE.domain}/events/${slug}`;
        const html =
          `<p>Der er en ny opdatering til <strong>${escapeHtml(title)}</strong>:</p>` +
          `<p style="white-space:pre-line">${escapeHtml(tekst)}</p>` +
          `<p><a href="${link}">Se eventet på ${SITE.domain}</a></p>` +
          `<hr><p style="color:#888;font-size:12px">Du får denne mail, fordi du er tilmeldt eventet på ${SITE.name}.</p>`;
        const res = await sendMailBcc(liste, `Opdatering: ${title} - ${SITE.name}`, html);
        sent = res.sent;
        info = res.info;
      }
    }
  } catch (e: any) {
    info = `undtagelse: ${String(e?.message ?? e).slice(0, 140)}`;
  }

  revalidatePath(`/events/${slug}`);
  return { sent, info };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
