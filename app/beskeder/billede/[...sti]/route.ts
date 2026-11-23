import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';
import { BESKED_BUCKET } from '@/lib/billeder';

export const dynamic = 'force-dynamic';

// Authz'd serve-rute for PRIVATE besked-billeder (P10).
// -----------------------------------------------------------------------------
// 'besked'-bucketen er privat og har ingen offentlig laese-URL. Billeder hentes
// KUN herigennem. Paa hver forespoergsel tjekkes adgang eksplicit:
//   - kalderen skal vaere logget ind,
//   - og enten UPLOADER (path'ens foerste segment = eget bruger-id, daekker
//     composer-preview foer beskeden sendes) ELLER DELTAGER i den samtale et
//     besked-billede med dette path hoerer til.
// Foerst derefter streames bytes via service-rollen (bypasser RLS i selve
// storage-opslaget). Ingen signed-URL-token der kan videresendes; adgang
// revurderes ved hvert hit. Moderatorer faar bevidst INGEN adgang her.

// path = "<ownerId>/<uuid>.<ext>" - stramt moenster (ingen traversal).
const PATH_RE = /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: { sti: string[] } },
) {
  const path = (params.sti ?? []).map((s) => decodeURIComponent(s)).join('/');
  if (!PATH_RE.test(path)) {
    return new NextResponse('Ugyldig sti', { status: 400 });
  }

  // 1) Logget ind?
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new NextResponse('Log ind', { status: 401 });

  // 2) Adgang: uploader (eget path-praefiks) ELLER deltager i samtalen.
  const erUploader = path.startsWith(`${user.id}/`);
  if (!erUploader) {
    const svc = supabaseService();
    // Find beskeder der refererer dette path, og om jeg er deltager i deres samtale.
    const { data: imgs } = await svc
      .from('message_images')
      .select('message_id')
      .eq('path', path);
    const msgIds = (imgs ?? []).map((r: any) => r.message_id).filter(Boolean);
    if (msgIds.length === 0) {
      return new NextResponse('Ikke fundet', { status: 404 });
    }
    const { data: msgs } = await svc
      .from('messages')
      .select('conversation_id')
      .in('id', msgIds);
    const convIds = [
      ...new Set((msgs ?? []).map((m: any) => m.conversation_id).filter(Boolean)),
    ];
    if (convIds.length === 0) return new NextResponse('Ingen adgang', { status: 403 });
    const { data: part } = await svc
      .from('conversation_participants')
      .select('user_id')
      .in('conversation_id', convIds)
      .eq('user_id', user.id)
      .limit(1);
    if (!part || part.length === 0) {
      return new NextResponse('Ingen adgang', { status: 403 });
    }
  }

  // 3) Stream bytes via service-rollen (privat bucket).
  const svc = supabaseService();
  const { data, error } = await svc.storage.from(BESKED_BUCKET).download(path);
  if (error || !data) {
    return new NextResponse('Ikke fundet', { status: 404 });
  }

  const type = data.type || 'application/octet-stream';
  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': type,
      // Privat cache i browseren: samme bruger, samme session. Path er en uuid,
      // saa indholdet er immutabelt.
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
