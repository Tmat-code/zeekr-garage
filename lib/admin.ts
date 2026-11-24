import { supabaseServer } from '@/lib/supabase/server';

// Rolle-model: superadmin (Torben alene, DB-only) > admin (formand) = alt >
// moderator = moderere board'et. null = almindelig.
// superadmin er et AEGTE superset: den har alle admin- OG moderator-rettigheder.
export type Rolle = 'superadmin' | 'admin' | 'moderator' | null;

// Rene praedikater (til inline-tjek i pages/komponenter, saa superadmin altid
// taeller som admin/moderator - praecis som er_admin()/er_moderator() i DB).
export function rolleErAdmin(r: Rolle): boolean {
  return r === 'admin' || r === 'superadmin';
}
export function rolleErModerator(r: Rolle): boolean {
  return r === 'admin' || r === 'moderator' || r === 'superadmin';
}
export function rolleErSuperadmin(r: Rolle): boolean {
  return r === 'superadmin';
}

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
  return rolleErAdmin(await minRolle());
}

export async function erModerator(): Promise<boolean> {
  return rolleErModerator(await minRolle());
}

export async function erSuperadmin(): Promise<boolean> {
  return rolleErSuperadmin(await minRolle());
}
