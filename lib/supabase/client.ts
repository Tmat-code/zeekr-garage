'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase-klient. Bruger den OFFENTLIGE URL (skal kunne naas fra
// brugerens browser — selvhostet instans eksponeres via Cloudflare Tunnel).
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    // Fast cookie-navn, saa browser (public URL) og server (intern URL) deler
    // samme session-cookie. Uden dette udleder @supabase/ssr navnet fra
    // Supabase-URL'ens vaertsnavn -> forskellige navne -> login-bounce.
    { auth: { storageKey: 'sb-zeekr-garage-auth' } },
  );
}
