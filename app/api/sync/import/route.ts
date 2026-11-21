import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Modtager bugherrer-eksportens JSON fra n8n og upserter idempotent via RPC.
// Token-beskyttet (SYNC_TOKEN). Skriver med service-rolle (uden om RLS).
export async function POST(req: Request) {
  const token = req.headers.get('x-sync-token');
  if (!process.env.SYNC_TOKEN || token !== process.env.SYNC_TOKEN) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const meldinger = Array.isArray(body)
    ? body
    : (body as { meldinger?: unknown })?.meldinger;
  if (!Array.isArray(meldinger)) {
    return NextResponse.json({ error: 'Forventede { meldinger: [...] }' }, { status: 400 });
  }

  const sb = supabaseService();
  const { data, error } = await sb.rpc('sync_import_bugherrer', { p_data: meldinger });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ imported: data, modtaget: meldinger.length });
}
