import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { publicOrigin, sikkerSti } from '@/lib/url';
import { synkSprogEfterLogin } from '@/lib/i18n/server';

// Cross-browser-sikker bekraeftelse af email-links (recovery/signup).
// Bruger token_hash + verifyOtp (server-side) - IKKE PKCE - saa linket virker
// uanset hvilken browser det aabnes i. Resend-mailen peger hertil.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = sikkerSti(searchParams.get('next'));

  if (token_hash && type) {
    const sb = supabaseServer();
    const { error } = await sb.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // UI-sprog: profil <-> cookie (+ signup-sproget fra user_metadata). Best-effort.
      await synkSprogEfterLogin(sb);
      return NextResponse.redirect(new URL(next, publicOrigin(request)));
    }
  }
  // Ugyldigt/udloebet link -> tilbage til login med en venlig besked. Hver
  // link-type faar sin egen tekst (en ny bruger skal ikke se "nulstil"-ordlyd).
  // Kun en kode i URL'en - selve teksten slaas op i ordbogen paa /login (U4),
  // saa beskeden kommer paa laeserens UI-sprog.
  const fejl =
    type === 'signup' || type === 'invite'
      ? 'bekraeft'
      : type === 'recovery'
        ? 'reset'
        : type === 'email_change'
          ? 'mail'
          : 'link';
  return NextResponse.redirect(new URL(`/login?fejl=${fejl}`, publicOrigin(request)));
}
