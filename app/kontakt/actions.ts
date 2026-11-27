'use server';

import { supabaseServer } from '@/lib/supabase/server';

// Send en privat henvendelse til staben. KUN indloggede (RPC'en afviser selv
// null-uid). RPC'en stempler user_id = auth.uid() + fryser navnet fra profilen,
// saa hverken afsender eller navn kan forfalskes herfra. Trigger prajer staben
// i klokken. Returnerer intet - formularen viser bare en kvittering.
export async function sendKontakt(
  emne: string,
  besked: string,
  svarMail: string,
): Promise<void> {
  const sb = supabaseServer();
  // Tidlig, laesbar gate (RLS/RPC haandhaever det ogsaa i DB).
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Log ind for at sende en henvendelse.');

  const { error } = await sb.rpc('kontakt_opret', {
    p_emne: emne,
    p_besked: besked,
    p_svar_mail: svarMail.trim() || null,
  });
  if (error) throw new Error(error.message);
}
