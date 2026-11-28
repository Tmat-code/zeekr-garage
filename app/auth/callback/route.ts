import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { publicOrigin, sikkerSti } from '@/lib/url';
import { synkSprogEfterLogin } from '@/lib/i18n/server';

// Bytter koden fra en magic-link / e-mail-bekraeftelse til en session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const naeste = sikkerSti(searchParams.get('naeste'));

  if (code) {
    const sb = supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      // U4: et udloebet/brugt (eller i en anden browser aabnet) PKCE-link gav
      // hidtil en stille redirect uden forklaring. Nu: login med en venlig
      // besked paa laeserens sprog (teksten slaas op paa /login).
      const fejl = naeste.startsWith('/nulstil') ? 'reset' : 'bekraeft';
      return NextResponse.redirect(new URL(`/login?fejl=${fejl}`, publicOrigin(request)));
    }
    // UI-sprog: profil <-> cookie (+ signup-sproget fra user_metadata). Best-effort.
    await synkSprogEfterLogin(sb);
  }
  // Offentlig origin fra headers, ikke request.url (= 0.0.0.0:3000).
  return NextResponse.redirect(new URL(naeste, publicOrigin(request)));
}
