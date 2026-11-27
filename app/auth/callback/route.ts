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
    // UI-sprog: profil <-> cookie (+ signup-sproget fra user_metadata). Best-effort.
    if (!error) await synkSprogEfterLogin(sb);
  }
  // Offentlig origin fra headers, ikke request.url (= 0.0.0.0:3000).
  return NextResponse.redirect(new URL(naeste, publicOrigin(request)));
}
