import { supabaseServer } from '@/lib/supabase/server';
import type { Notifikation } from '@/lib/types';

// Antal ulaeste notifikationer for den indloggede bruger (til badge ved SSR,
// saa klokken ikke blinker tom foer klienten har hentet). 0 hvis ikke logget ind.
export async function getUlaestAntal(): Promise<number> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return 0;

  const { count } = await sb
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('modtager_id', user.id)
    .eq('er_laest', false);
  return count ?? 0;
}

// De nyeste notifikationer for den indloggede bruger (til dropdown-listen).
// RLS sikrer "kun egne" - filteret her er bare for tydelighed/indeks.
export async function getNotifikationer(limit = 15): Promise<Notifikation[]> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data } = await sb
    .from('notifications')
    .select('id, type, tekst, href, er_laest, created_at')
    .eq('modtager_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: r.type,
    tekst: r.tekst,
    href: r.href,
    erLaest: r.er_laest ?? false,
    createdAt: r.created_at,
  }));
}
