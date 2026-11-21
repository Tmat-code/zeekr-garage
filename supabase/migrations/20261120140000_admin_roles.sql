-- Zeekr Garage - admin/moderator-roller + RLS-skrivepolitikker
-- ---------------------------------------------------------------------------
-- Formand = admin. Moderator kan moderere board'et. Begge skriver via deres
-- EGEN authenticated session (anon-key + JWT), styret af RLS - ingen
-- service_role-noegle i app'en. Det afloeser init-kommentarens plan om
-- service_role-moderering.
--
-- Idempotent: drop-if-exists foran hver policy, saa den kan koeres igen.

-- =========================================================================
-- 1) Rolle paa profiler
-- =========================================================================
alter table public.profiles
  add column if not exists role text check (role in ('admin', 'moderator'));

-- =========================================================================
-- 2) Rolle-hjaelpere
--    security definer => funktionen koerer som ejer (postgres), der bypasser
--    RLS internt. Det undgaar uendelig rekursion naar en profiles-policy selv
--    kalder er_admin() (som laeser profiles). Standard Supabase-moenster.
-- =========================================================================
create or replace function public.er_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.er_moderator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'moderator')
  );
$$;

-- =========================================================================
-- 3) Moderering: admin/moderator maa rette og slette ALLE meldinger
--    (permissive => OR med de eksisterende "egne raekker"-politikker)
-- =========================================================================
drop policy if exists issues_update_mod on public.issues;
create policy issues_update_mod on public.issues
  for update to authenticated
  using (public.er_moderator())
  with check (public.er_moderator());

drop policy if exists issues_delete_mod on public.issues;
create policy issues_delete_mod on public.issues
  for delete to authenticated
  using (public.er_moderator());

-- model-tags: moderator maa fjerne forkerte koblinger
drop policy if exists issue_models_delete_mod on public.issue_models;
create policy issue_models_delete_mod on public.issue_models
  for delete to authenticated
  using (public.er_moderator());

-- bekraeftelser (stemmer): admin maa slette (spam/oprydning)
drop policy if exists confirmations_delete_admin on public.confirmations;
create policy confirmations_delete_admin on public.confirmations
  for delete to authenticated
  using (public.er_admin());

-- =========================================================================
-- 4) Rolle-styring: admin maa saette andres rolle (til "Adgange" senere)
-- =========================================================================
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.er_admin())
  with check (public.er_admin());
