import { supabaseServer } from '@/lib/supabase/server';

// Rolle-model: admin (formand) = alt. moderator = moderere board'et. null = almindelig.
export type Rolle = 'admin' | 'moderator' | null;

export type AdminKontekst = {
  user: Awaited<ReturnType<typeof hentUser>>;
  rolle: Rolle;
  displayName: string | null;
};

async function hentUser() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

// Hent bruger + rolle + visningsnavn i ét kald (bruges af /admin-gaten og headeren).
export async function adminKontekst(): Promise<AdminKontekst> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { user: null, rolle: null, displayName: null };

  const { data } = await sb
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  return {
    user,
    rolle: ((data?.role as Rolle) ?? null),
    displayName: (data?.display_name as string | null) ?? null,
  };
}

export async function minRolle(): Promise<Rolle> {
  return (await adminKontekst()).rolle;
}

export async function erAdmin(): Promise<boolean> {
  return (await minRolle()) === 'admin';
}

export async function erModerator(): Promise<boolean> {
  const r = await minRolle();
  return r === 'admin' || r === 'moderator';
}
