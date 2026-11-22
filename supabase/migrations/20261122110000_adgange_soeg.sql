-- Zeekr Garage - Adgange: søg ALLE oprettede brugere + tildel rolle direkte
-- ---------------------------------------------------------------------------
-- Hidtil viste Adgange KUN personer der allerede havde en rolle (admin_brugere),
-- og roller blev givet via email-invitation. Denne RPC lader admin søge en
-- hvilken som helst oprettet bruger frem (på email eller visningsnavn) og give
-- rollen direkte via den eksisterende admin_saet_rolle(). Email-invitationen
-- beholdes til folk der endnu ikke har oprettet en konto.
--
-- Samme mønster som admin_brugere: security definer, er_admin()-gated i WHERE
-- (ikke-admin får tom liste). Idempotent (create or replace).

create or replace function public.admin_alle_brugere(p_soeg text)
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  sidst_logget timestamptz,
  oprettet timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, u.email, p.display_name, p.role, u.last_sign_in_at, u.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.er_admin()
    and (
      coalesce(btrim(p_soeg), '') = ''
      or u.email ilike '%' || p_soeg || '%'
      or coalesce(p.display_name, '') ilike '%' || p_soeg || '%'
    )
  -- Dem med en rolle øverst, derefter alfabetisk på email.
  order by (p.role is null), u.email
  limit 50;
$$;
