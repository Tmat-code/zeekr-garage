-- Zeekr Garage - Adgange (moderator-/admin-roller via email-invitation)
-- ---------------------------------------------------------------------------
-- Ingen separat password-mekanik (login er Supabase). Admin inviterer paa email:
--  - findes brugeren allerede => rollen saettes med det samme
--  - ellers gemmes en pending invitation, og rollen saettes automatisk naar
--    personen opretter en konto med den email (via handle_new_user-triggeren).
-- Alle RPC'er er security definer og tjekker er_admin() internt.

-- =========================================================================
-- pending_invitations
-- =========================================================================
create table if not exists public.pending_invitations (
  email       text primary key,
  role        text not null check (role in ('admin', 'moderator')),
  created_at  timestamptz not null default now(),
  invited_by  uuid references public.profiles(id) on delete set null
);

alter table public.pending_invitations enable row level security;

drop policy if exists pending_inv_read_admin on public.pending_invitations;
create policy pending_inv_read_admin on public.pending_invitations
  for select to authenticated using (public.er_admin());

-- =========================================================================
-- RPC: liste over personer med en rolle (email hentes fra auth.users)
-- =========================================================================
create or replace function public.admin_brugere()
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
  where public.er_admin() and p.role is not null
  order by p.role, u.email;
$$;

-- =========================================================================
-- RPC: saet/fjern rolle paa en eksisterende bruger
-- =========================================================================
create or replace function public.admin_saet_rolle(p_bruger uuid, p_rolle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.er_admin() then raise exception 'Kun admin'; end if;
  if p_rolle is not null and p_rolle not in ('admin', 'moderator') then
    raise exception 'Ugyldig rolle';
  end if;
  update public.profiles set role = p_rolle where id = p_bruger;
end;
$$;

-- =========================================================================
-- RPC: inviter paa email (saet nu hvis brugeren findes, ellers pending)
-- =========================================================================
create or replace function public.admin_inviter(p_email text, p_rolle text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_id uuid;
begin
  if not public.er_admin() then raise exception 'Kun admin'; end if;
  if p_rolle not in ('admin', 'moderator') then raise exception 'Ugyldig rolle'; end if;

  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is not null then
    update public.profiles set role = p_rolle where id = v_id;
    return 'sat';
  else
    insert into public.pending_invitations (email, role, invited_by)
    values (lower(p_email), p_rolle, auth.uid())
    on conflict (email) do update set role = excluded.role, invited_by = excluded.invited_by;
    return 'inviteret';
  end if;
end;
$$;

-- =========================================================================
-- RPC: fjern en pending invitation
-- =========================================================================
create or replace function public.admin_fjern_invitation(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.er_admin() then raise exception 'Kun admin'; end if;
  delete from public.pending_invitations where lower(email) = lower(p_email);
end;
$$;

-- =========================================================================
-- Opdatér new-user-trigger: anvend pending invitation ved signup
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_role text;
begin
  select role into v_role from public.pending_invitations
    where lower(email) = lower(new.email);

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    v_role
  )
  on conflict (id) do nothing;

  if v_role is not null then
    delete from public.pending_invitations where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;
