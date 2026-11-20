import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase-klient (auth-bevidst, cookie-baseret session).
// Bruger den INTERNE URL hvis sat (hurtig, paa Pixas Docker-netvaerk) — ellers
// den offentlige. Samme instans => samme JWT, saa login validerer uanset hvilken.
const SUPABASE_URL =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Skal matche browser-klientens storageKey (client.ts), ellers finder
    // serveren ikke session-cookien naar URL'erne er forskellige.
    auth: { storageKey: 'sb-zeekr-garage-auth' },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Kaldt fra en Server Component (kan ikke saette cookies) — ignoreres.
          // Session-opdatering sker i middleware/route handlers.
        }
      },
    },
  });
}
