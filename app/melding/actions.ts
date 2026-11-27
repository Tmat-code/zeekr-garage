'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';
import { hentOrdbog } from '@/lib/i18n/server';

// U3: fejltekster på læserens sprog. Ukendte DB-fejl vises som den oversatte
// generiske tekst (originalen logges).
async function dbFejl(error: { message: string }): Promise<never> {
  console.error('[melding] DB-fejl:', error.message);
  throw new Error((await hentOrdbog()).faellesFejl.nogetGikGalt);
}

function revalider(issueId: string) {
  revalidatePath(`/melding/${issueId}`);
  revalidatePath('/');
}

export async function tilfoejKommentar(issueId: string, body: string): Promise<void> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const t = (await hentOrdbog()).kommentarer;
  if (!user) throw new Error(t.logIndFoerst);
  const tekst = body.trim();
  if (!tekst) throw new Error(t.skrivEn);
  if (tekst.length > 5000) throw new Error(t.forLang);
  const { error } = await sb
    .from('comments')
    .insert({ issue_id: issueId, author_id: user.id, body: tekst });
  if (error) await dbFejl(error);
  revalider(issueId);
}

export async function retKommentar(
  commentId: string,
  issueId: string,
  body: string,
): Promise<void> {
  const tekst = body.trim();
  if (!tekst) throw new Error((await hentOrdbog()).kommentarer.maaIkkeVaereTom);
  const sb = supabaseServer();
  // RLS: kun forfatter eller moderator kan opdatere.
  const { error } = await sb.from('comments').update({ body: tekst }).eq('id', commentId);
  if (error) await dbFejl(error);
  revalider(issueId);
}

export async function sletKommentar(commentId: string, issueId: string): Promise<void> {
  const sb = supabaseServer();
  // RLS: kun forfatter eller moderator kan slette.
  const { error } = await sb.from('comments').delete().eq('id', commentId);
  if (error) await dbFejl(error);
  revalider(issueId);
}

export async function markerLoesning(
  commentId: string,
  issueId: string,
  vaerd: boolean,
): Promise<void> {
  if (!(await erModerator())) throw new Error((await hentOrdbog()).kommentarer.kunModerator);
  const sb = supabaseServer();
  if (vaerd) {
    // Kun én løsning pr. melding - nulstil de andre først.
    await sb
      .from('comments')
      .update({ is_solution: false })
      .eq('issue_id', issueId)
      .eq('is_solution', true);
  }
  const { error } = await sb.from('comments').update({ is_solution: vaerd }).eq('id', commentId);
  if (error) await dbFejl(error);
  revalider(issueId);
}
