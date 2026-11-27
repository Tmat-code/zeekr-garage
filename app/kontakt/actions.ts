'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { hentOrdbog } from '@/lib/i18n/server';
import type { Ordbog } from '@/lib/i18n';

// U3: kontakt_opret's kendte (danske) RPC-fejl -> ordbogs-nøgler på læserens
// sprog. Ukendte fejl -> den generiske tekst (originalen logges).
const RPC_FEJL: Record<string, keyof Ordbog['kontakt']> = {
  'Log ind for at sende en henvendelse.': 'logIndFoerst',
  'Emne og besked skal udfyldes.': 'udfyldBegge',
  'Emnet er for langt (maks 160 tegn).': 'emneForLangt',
  'Beskeden er for lang (maks 4000 tegn).': 'beskedForLang',
  'Svar-mailen ser ikke rigtig ud.': 'mailForkert',
};

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
  const t = await hentOrdbog();
  if (!user) throw new Error(t.kontakt.logIndFoerst);

  const { error } = await sb.rpc('kontakt_opret', {
    p_emne: emne,
    p_besked: besked,
    p_svar_mail: svarMail.trim() || null,
  });
  if (error) {
    const noegle = RPC_FEJL[error.message];
    if (noegle) throw new Error(String(t.kontakt[noegle]));
    console.error('[kontakt] RPC-fejl:', error.message);
    throw new Error(t.faellesFejl.nogetGikGalt);
  }
}
