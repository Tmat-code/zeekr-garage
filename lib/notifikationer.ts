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

// Første side til /notifikationer-siden (SSR, ingen tom-blink). Henter én side
// (laeste + ulaeste, nyeste foerst) + det praecise total til "viser X af Y" +
// ulaest-tallet til at vise/skjule "Markér alle læst". Klienten pagineres
// videre via range + exact count (samme afkortnings-vej som P16/P20/P24).
export type NotifikationSide = {
  items: Notifikation[];
  total: number;
  ulaest: number;
};

export async function getNotifikationerSide(limit = 20): Promise<NotifikationSide> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { items: [], total: 0, ulaest: 0 };

  const [{ data, count }, { count: ulaest }] = await Promise.all([
    sb
      .from('notifications')
      .select('id, type, tekst, href, er_laest, created_at', { count: 'exact' })
      .eq('modtager_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, limit - 1),
    sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('modtager_id', user.id)
      .eq('er_laest', false),
  ]);

  return {
    items: (data ?? []).map((r: any) => ({
      id: r.id,
      type: r.type,
      tekst: r.tekst,
      href: r.href,
      erLaest: r.er_laest ?? false,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
    ulaest: ulaest ?? 0,
  };
}
