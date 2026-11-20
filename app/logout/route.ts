import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { publicOrigin } from '@/lib/url';

export async function POST(request: NextRequest) {
  const sb = supabaseServer();
  await sb.auth.signOut();
  // Byg redirect paa den offentlige origin, ikke paa request.url (= 0.0.0.0:3000).
  return NextResponse.redirect(new URL('/', publicOrigin(request)), { status: 303 });
}
