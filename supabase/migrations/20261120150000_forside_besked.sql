-- Zeekr Garage - Forside-besked (banner)
-- ---------------------------------------------------------------------------
-- Én besked ad gangen, vist oeverst paa forsiden naar active = true.
-- Singleton: altid id = 1. Kun admin skriver; alle laeser (banneret er offentligt).

create table if not exists public.site_announcement (
  id          int primary key default 1 check (id = 1),
  message     text,
  active      boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

insert into public.site_announcement (id, message, active)
  values (1, null, false)
  on conflict (id) do nothing;

alter table public.site_announcement enable row level security;

drop policy if exists site_announcement_read_all on public.site_announcement;
create policy site_announcement_read_all on public.site_announcement
  for select using (true);

drop policy if exists site_announcement_update_admin on public.site_announcement;
create policy site_announcement_update_admin on public.site_announcement
  for update to authenticated
  using (public.er_admin())
  with check (public.er_admin());
