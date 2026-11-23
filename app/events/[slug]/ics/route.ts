import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { publicOrigin } from '@/lib/url';
import { byggEventIcs } from '@/lib/ics';

export const dynamic = 'force-dynamic';

// .ics-kalendereksport for ÉT event (P13).
// -----------------------------------------------------------------------------
// Download-knappen paa event-siden peger herhen. Vi streamer ét VEVENT (ikke et
// feed), saa brugeren foejer netop dette event til Apple/Google Kalender.
// Al formatering (Europe/Copenhagen-tidszone, STATUS:CANCELLED ved aflysning,
// SEQUENCE afledt af updated_at) ligger i lib/ics.ts (ren + testet).
// Events er offentligt laesbare (RLS: select using(true)) - ingen auth noedig.

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const sb = supabaseServer();
  const { data: ev } = await sb
    .from('events')
    .select('id, slug, title, description, location, starts_at, ends_at, is_cancelled, created_at, updated_at')
    .eq('slug', params.slug)
    .limit(1)
    .maybeSingle();

  if (!ev) return new NextResponse('Event findes ikke', { status: 404 });

  // Uden starttid kan et VEVENT ikke bygges (ingen DTSTART) - eventet er endnu
  // ikke dato-sat. Knappen vises foerst naar der er en dato (se event-siden).
  if (!ev.starts_at) {
    return new NextResponse('Eventet har endnu ingen dato', { status: 404 });
  }

  const eventUrl = `${publicOrigin(req)}/events/${ev.slug}`;
  const body = byggEventIcs(ev as any, eventUrl);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ev.slug}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
