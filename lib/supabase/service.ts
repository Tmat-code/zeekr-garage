import { createClient } from '@supabase/supabase-js';

// Service-role-klient: KUN til server-only, token-beskyttede endpoints (fx sync-import).
// Bruger service-nøglen og går uden om RLS. Må aldrig importeres i klient-kode.
export function supabaseService() {
  const url = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
