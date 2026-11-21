-- Zeekr Garage - Events / meetups (bruger-ønske 21-11-2026)
-- Admin + moderatorer opretter events; brugere melder sig på (RSVP);
-- moderator kan sende en opdatering, der (hvis email er sat op) mailes til
-- de tilmeldte. Adgang som resten: alt offentligt laesbart, login for at deltage.

-- =========================================================================
-- Tabeller
-- =========================================================================
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null,
  description  text,
  location     text,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  is_cancelled boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists events_slug_idx on public.events (slug);
create index if not exists events_starts_at_idx on public.events (starts_at);

create table if not exists public.event_signups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_signups_event_idx on public.event_signups (event_id);

create table if not exists public.event_updates (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  body       text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists event_updates_event_idx on public.event_updates (event_id);

-- updated_at-touch
drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.touch_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.events        enable row level security;
alter table public.event_signups enable row level security;
alter table public.event_updates enable row level security;

-- events: laes alle; kun moderator/admin opretter/retter/sletter
drop policy if exists events_read_all on public.events;
create policy events_read_all on public.events for select using (true);
drop policy if exists events_write_mod on public.events;
create policy events_write_mod on public.events
  for all to authenticated using (public.er_moderator()) with check (public.er_moderator());

-- signups: laes alle (tael/vis tilmeldte); authenticated melder sig selv til/fra
drop policy if exists event_signups_read_all on public.event_signups;
create policy event_signups_read_all on public.event_signups for select using (true);
drop policy if exists event_signups_insert_own on public.event_signups;
create policy event_signups_insert_own on public.event_signups
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists event_signups_update_own on public.event_signups;
create policy event_signups_update_own on public.event_signups
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists event_signups_delete_own on public.event_signups;
create policy event_signups_delete_own on public.event_signups
  for delete to authenticated using (user_id = auth.uid());

-- updates: laes alle; kun moderator skriver
drop policy if exists event_updates_read_all on public.event_updates;
create policy event_updates_read_all on public.event_updates for select using (true);
drop policy if exists event_updates_insert_mod on public.event_updates;
create policy event_updates_insert_mod on public.event_updates
  for insert to authenticated with check (public.er_moderator() and created_by = auth.uid());

-- =========================================================================
-- RPC: emails paa de tilmeldte (til "send info til tilmeldte")
--   security definer => kan laese auth.users.email. Gated paa er_moderator()
--   i WHERE, saa en ikke-moderator faar tom liste (ingen laek).
-- =========================================================================
create or replace function public.event_deltager_emails(e_id uuid)
returns setof text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.event_signups s
  join auth.users u on u.id = s.user_id
  where s.event_id = e_id
    and u.email is not null
    and public.er_moderator();
$$;
grant execute on function public.event_deltager_emails(uuid) to authenticated;
