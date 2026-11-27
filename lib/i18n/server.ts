// UI-i18n: server-siden. Afgør læserens UI-sprog og slår ordbogen op.
// Må KUN importeres fra server-komponenter, server-actions og route-handlere.
//
// Rækkefølge (låst 27-11): profil.sprog > cookie zg_sprog > Accept-Language > da.
// Profil-opslaget er defensivt: findes kolonnen ikke endnu (migrationen ikke
// kørt), eller fejler opslaget, behandles det som "ikke sat".

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { ordbog, type Ordbog } from './index';
import {
  SPROG_COOKIE,
  SPROG_COOKIE_MAKS_ALDER,
  erUiSprog,
  oploesSprog,
  synkPlan,
  type UiSprog,
} from './sprog';

async function profilSprog(sb: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await sb.from('profiles').select('sprog').eq('id', userId).maybeSingle();
    if (error) return null;
    return (data?.sprog as string | null) ?? null;
  } catch {
    return null;
  }
}

// Én opløsning pr. request (React cache deler resultatet mellem layout, header,
// footer og siden).
export const hentSprog = cache(async (): Promise<UiSprog> => {
  const cookie = cookies().get(SPROG_COOKIE)?.value ?? null;
  const header = headers().get('accept-language');
  let profil: string | null = null;
  try {
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) profil = await profilSprog(sb, user.id);
  } catch {
    profil = null;
  }
  return oploesSprog({ profil, cookie, header });
});

// Den indloggede brugers GEMTE sprog (profiles.sprog) - null hvis ikke valgt,
// ikke indlogget, eller kolonnen ikke findes endnu. Til sprog-feltet i Min garage.
export async function hentProfilSprog(): Promise<UiSprog | null> {
  try {
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const p = await profilSprog(sb, user.id);
    return erUiSprog(p) ? p : null;
  } catch {
    return null;
  }
}

export async function hentOrdbog(): Promise<Ordbog> {
  return ordbog(await hentSprog());
}

export function saetSprogCookie(sprog: UiSprog) {
  cookies().set(SPROG_COOKIE, sprog, {
    path: '/',
    maxAge: SPROG_COOKIE_MAKS_ALDER,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}

// Gemmer sproget på en indlogget bruger: profiles.sprog (UI'et) + user_metadata
// (til mail-skabelonerne i U8). Begge best-effort - cookien er sat i forvejen.
export async function gemSprogPaaBruger(
  sb: SupabaseClient,
  user: User,
  sprog: UiSprog,
  hvad: { profil: boolean; metadata: boolean } = { profil: true, metadata: true },
): Promise<{ ok: boolean }> {
  let ok = true;
  if (hvad.profil) {
    const { error } = await sb.from('profiles').update({ sprog }).eq('id', user.id);
    if (error) ok = false;
  }
  if (hvad.metadata && user.user_metadata?.sprog !== sprog) {
    const { error } = await sb.auth.updateUser({ data: { sprog } });
    if (error) ok = false;
  }
  return { ok };
}

// Synk ved login (password-login, bekræftelses-link, magic-link): profilen er
// sandheden når den er sat (-> cookien følger den); er den tom, skrives cookiens
// sprog (eller sprogets fra signup i user_metadata) til profilen første gang.
// Kaldes efter at sessionen er etableret. Fejler stille - login må aldrig
// blokeres af sprog-synken.
export async function synkSprogEfterLogin(sb: SupabaseClient = supabaseServer()): Promise<void> {
  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const plan = synkPlan({
      profil: await profilSprog(sb, user.id),
      cookie: cookies().get(SPROG_COOKIE)?.value ?? null,
      metadata: (user.user_metadata?.sprog as string | undefined) ?? null,
    });
    if (plan.saetCookie) saetSprogCookie(plan.saetCookie);
    const maal = plan.saetProfil ?? plan.saetMetadata;
    if (maal && erUiSprog(maal)) {
      await gemSprogPaaBruger(sb, user, maal, {
        profil: !!plan.saetProfil,
        metadata: !!plan.saetMetadata,
      });
    }
  } catch {
    // best-effort
  }
}
