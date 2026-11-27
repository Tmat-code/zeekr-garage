'use server';

// UI-i18n (U1): server-actions til sprogvalget. Bruges af sprogvælgeren i
// footeren, sprog-feltet i Min garage og login-formularen (synk).

import { supabaseServer } from '@/lib/supabase/server';
import { erUiSprog } from '@/lib/i18n/sprog';
import { gemSprogPaaBruger, saetSprogCookie, synkSprogEfterLogin } from '@/lib/i18n/server';

// Sætter UI-sproget: altid cookien (1 år); er man indlogget også profilen
// (+ user_metadata til mails). Klienten kalder router.refresh() bagefter.
// `profilGemt=false` betyder at cookien er sat, men profilen ikke kunne
// opdateres (fx før migrationen er kørt) - sproget virker stadig i browseren.
export async function saetSprog(
  sprog: string,
): Promise<{ ok: boolean; profilGemt?: boolean }> {
  if (!erUiSprog(sprog)) return { ok: false };
  saetSprogCookie(sprog);
  try {
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { ok: true };
    const { ok } = await gemSprogPaaBruger(sb, user, sprog);
    return { ok: true, profilGemt: ok };
  } catch {
    return { ok: true, profilGemt: false };
  }
}

// Kaldes af login-formularen lige efter et lykkedes password-login.
export async function synkSprogVedLogin(): Promise<void> {
  await synkSprogEfterLogin();
}
