-- Zeekr Garage — skive 1: kerneskema (custom-delen)
-- Selvhostet Supabase (Postgres) paa Pixa.
-- Adgang (BESLUTTET: aabent): alt er offentligt laesbart; login (authenticated)
-- kraeves kun for at bidrage. VIN/praecise bil-data er private (egen tabel).
-- Moderering/admin-handlinger koerer via service_role (bypasser RLS) i skive 1.

-- =========================================================================
-- Enums
-- =========================================================================
create type public.issue_status as enum (
  'ny',              -- netop meldt
  'bekraeftet',      -- bekraeftet af flere ejere
  'sendt_til_zeekr', -- med i en Zeekr-rapport
  'loest_i_ota'      -- loest i en software-opdatering
);

create type public.issue_severity as enum (
  'lav',
  'middel',
  'hoej',
  'kritisk'
);

-- =========================================================================
-- models  (reference/seed — de 6 DK-modeller + platform)
-- =========================================================================
create table public.models (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  platform      text not null,            -- SEA-R / PMA2+ / SEA1/SEA2
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);

-- =========================================================================
-- software_versions  (OTA pr. platform)
-- =========================================================================
create table public.software_versions (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,
  version     text not null,
  released_at date,
  created_at  timestamptz not null default now(),
  unique (platform, version)
);

-- =========================================================================
-- profiles  (udvider auth.users; SSO-koblet til Discourse senere)
-- =========================================================================
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  discourse_external_id text unique,       -- SSO-kobling til Discourse
  created_at           timestamptz not null default now()
);

-- =========================================================================
-- cars  (offentlige felter: model, variant, software)
-- =========================================================================
create table public.cars (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  model_id            uuid not null references public.models(id),
  variant             text,               -- hardware-variant (valgfri metadata)
  software_version_id uuid references public.software_versions(id),
  created_at          timestamptz not null default now()
);
create index cars_owner_id_idx on public.cars (owner_id);
create index cars_model_id_idx on public.cars (model_id);

-- car_private  (VIN m.m. — kun ejeren laeser/skriver)
create table public.car_private (
  car_id uuid primary key references public.cars(id) on delete cascade,
  vin    text,
  notes  text
);

-- =========================================================================
-- issues  (fejl-/issue-board)
-- =========================================================================
create table public.issues (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  category    text,
  severity    public.issue_severity not null default 'middel',
  status      public.issue_status  not null default 'ny',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index issues_status_idx   on public.issues (status);
create index issues_severity_idx on public.issues (severity);

-- issue_models  (kobling — én fejl kan ramme flere modeller)
create table public.issue_models (
  issue_id uuid not null references public.issues(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  primary key (issue_id, model_id)
);
create index issue_models_model_id_idx on public.issue_models (model_id);

-- confirmations  ("jeg har ogsaa det her" = bekraeft + stem, én pr. bruger/fejl/model)
create table public.confirmations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  issue_id            uuid not null references public.issues(id) on delete cascade,
  model_id            uuid not null references public.models(id) on delete cascade,
  software_version_id uuid references public.software_versions(id),
  created_at          timestamptz not null default now(),
  unique (user_id, issue_id, model_id)
);
create index confirmations_issue_id_idx on public.confirmations (issue_id);
create index confirmations_model_id_idx on public.confirmations (model_id);

-- =========================================================================
-- zeekr_reports  (offentlige, samlede rapporter — portfolio-kronjuvel)
-- =========================================================================
create table public.zeekr_reports (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  period      text,
  model_scope text,
  status      text not null default 'kladde',
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.zeekr_report_issues (
  report_id uuid not null references public.zeekr_reports(id) on delete cascade,
  issue_id  uuid not null references public.issues(id) on delete cascade,
  primary key (report_id, issue_id)
);

-- =========================================================================
-- Triggers
-- =========================================================================

-- opdater issues.updated_at ved aendring
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger issues_touch_updated_at
  before update on public.issues
  for each row execute function public.touch_updated_at();

-- opret automatisk en profil-raekke naar en bruger signer op
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Row Level Security
--   Laesning: offentlig (anon + authenticated).
--   Skrivning: kun authenticated, og kun egne raekker.
-- =========================================================================
alter table public.models              enable row level security;
alter table public.software_versions   enable row level security;
alter table public.profiles            enable row level security;
alter table public.cars                enable row level security;
alter table public.car_private         enable row level security;
alter table public.issues              enable row level security;
alter table public.issue_models        enable row level security;
alter table public.confirmations       enable row level security;
alter table public.zeekr_reports       enable row level security;
alter table public.zeekr_report_issues enable row level security;

-- ---- models: offentlig laesning; skrivning kun service_role ----
create policy models_read_all on public.models
  for select using (true);

-- ---- software_versions: offentlig laesning; skrivning kun service_role ----
create policy sw_read_all on public.software_versions
  for select using (true);

-- ---- profiles: offentlig laesning af display_name; ejer opdaterer egen ----
create policy profiles_read_all on public.profiles
  for select using (true);
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---- cars: offentlig laesning; ejer skriver egne ----
create policy cars_read_all on public.cars
  for select using (true);
create policy cars_insert_own on public.cars
  for insert to authenticated with check (owner_id = auth.uid());
create policy cars_update_own on public.cars
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy cars_delete_own on public.cars
  for delete to authenticated using (owner_id = auth.uid());

-- ---- car_private: KUN ejeren (via join til cars) ----
create policy car_private_owner_all on public.car_private
  for all to authenticated
  using (exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid()));

-- ---- issues: offentlig laesning; authenticated melder; opretter retter egen ----
create policy issues_read_all on public.issues
  for select using (true);
create policy issues_insert_auth on public.issues
  for insert to authenticated with check (created_by = auth.uid());
create policy issues_update_own on public.issues
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

-- ---- issue_models: offentlig laesning; authenticated kobler ----
create policy issue_models_read_all on public.issue_models
  for select using (true);
create policy issue_models_insert_auth on public.issue_models
  for insert to authenticated with check (true);

-- ---- confirmations: offentlig laesning (tael stemmer); ejer skriver/sletter egne ----
create policy confirmations_read_all on public.confirmations
  for select using (true);
create policy confirmations_insert_own on public.confirmations
  for insert to authenticated with check (user_id = auth.uid());
create policy confirmations_delete_own on public.confirmations
  for delete to authenticated using (user_id = auth.uid());

-- ---- zeekr_reports: kun publicerede er offentlige; skrivning kun service_role ----
create policy zeekr_reports_read_published on public.zeekr_reports
  for select using (published = true);
create policy zeekr_report_issues_read_published on public.zeekr_report_issues
  for select using (
    exists (select 1 from public.zeekr_reports r where r.id = report_id and r.published = true)
  );
