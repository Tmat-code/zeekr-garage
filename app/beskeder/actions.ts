'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';

async function kraevBruger() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at skrive beskeder.');
  return { sb, user };
}

// Find-eller-opret en 1:1-samtale med en anden bruger. Returnerer samtale-id.
export async function startSamtaleMedBruger(otherId: string): Promise<string> {
  const { sb } = await kraevBruger();
  const { data, error } = await sb.rpc('start_samtale', { p_other: otherId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Kunne ikke starte samtalen.');
  revalidatePath('/beskeder');
  return data as string;
}

// Send en besked i en samtale. RLS håndhæver deltager + ikke-blokeret.
export async function sendBesked(convId: string, body: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  const b = body.trim();
  if (!b) throw new Error('Skriv en besked.');
  if (b.length > 5000) throw new Error('Beskeden er for lang.');
  const { error } = await sb
    .from('messages')
    .insert({ conversation_id: convId, sender_id: user.id, body: b });
  if (error) {
    // RLS-afvisning (fx blokeret) giver en teknisk fejl - gør den læsbar.
    throw new Error(
      /row-level security|violates|permission/i.test(error.message)
        ? 'Beskeden kunne ikke sendes (måske er I blokeret).'
        : error.message,
    );
  }
  revalidatePath(`/beskeder/${convId}`);
  revalidatePath('/beskeder');
}

// Markér samtalen som læst: opdatér last_read_at + ryd pb_besked-notifikationer.
export async function markLaest(convId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  await sb
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', convId)
    .eq('user_id', user.id);
  await sb
    .from('notifications')
    .update({ er_laest: true })
    .eq('modtager_id', user.id)
    .eq('type', 'pb_besked')
    .eq('reference', convId)
    .eq('er_laest', false);
}

export async function blokerBruger(convId: string, otherId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: otherId });
  if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
}

export async function fjernBlok(convId: string, otherId: string): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', otherId);
  if (error) throw new Error(error.message);
  revalidatePath(`/beskeder/${convId}`);
}

export async function anmeldBesked(
  convId: string,
  messageId: string,
  reason: string,
): Promise<void> {
  const { sb, user } = await kraevBruger();
  const { error } = await sb.from('message_reports').insert({
    message_id: messageId,
    conversation_id: convId,
    reporter_id: user.id,
    reason: reason.trim() || null,
  });
  if (error) throw new Error(error.message);
}
