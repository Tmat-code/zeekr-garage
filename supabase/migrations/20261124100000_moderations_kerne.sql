-- Zeekr Garage - Moderings-kerne (M1, delt af P20 + P21)
-- ---------------------------------------------------------------------------
-- Den faelles DB-kerne for al moderering: sanktions-historik, et denormaliseret
-- haandhaevelses-felt paa profiler, en O(1)-hjaelper som skrive-stierne spoerger,
-- og en faelles audit-log. P21 (forum-rapporter + handling-med-grund) og P20
-- (bruger-administration/sanktioner) bygger BEGGE oven paa DENNE migration.
--
-- Designvalg (design-oplaeg 23-11 + laast med Torben 24-11):
--  - "Ban" = kan stadig logge ind og LAESE, men ikke SKRIVE. Haandhaeves som en
--    skrive-spaerre i hver bruger-insert-policy, ikke som en login-spaerre i
--    Supabase auth (tungere + helt stum). Suspender = samme, tidsbegraenset.
--    Begge soft/reversible (indhold + historik bevares) - som forum-soft-remove.
--  - Datamodel: tabel (user_sanctions = historik/sandhedskilde) + denormaliseret
--    felt (profiles.spaerret_til = haandhaevelse). Feltet vedligeholdes KUN af
--    sanktions-RPC'erne (kommer i M3/M4), aldrig fra klienten.
--  - Audit-loggen (moderation_log) deles af P20 + P21 og skrives KUN af de
--    security-definer-RPC'er der udfoerer handlingerne.
--
-- Idempotent: if-not-exists + drop-if-exists foran policies, saa den kan koeres igen.

-- =========================================================================
-- 1) Denormaliseret haandhaevelses-felt paa profiler
--    null = ikke spaerret; fremtidig tid = suspenderet til da;
--    'infinity' = permanent ban. Vedligeholdes KUN af sanktions-RPC'erne.
-- =========================================================================
alter table public.profiles
  add column if not exists spaerret_til timestamptz;

-- =========================================================================
-- 2) er_bruger_spaerret() - O(1)-opslag til skrive-stierne.
--    security definer => laeser profiles uden at vaekke profiles-RLS (samme
--    moenster som er_admin/er_moderator); stable; tjekker den kaldende bruger.
-- =========================================================================
create or replace function public.er_bruger_spaerret()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.spaerret_til is not null
      and p.spaerret_til > now()
  );
$$;

-- =========================================================================
-- 3) Haandhaevelse i skrive-stierne.
--    Hver BRUGER-insert-policy faar "and not public.er_bruger_spaerret()".
--    Moderator-insert-policyerne (*_insert_mod) + AL laesning roeres ikke -
--    en spaerret bruger kan altsaa stadig laese alt, bare ikke bidrage.
--    Policyerne droppes + genskabes med deres NUVAERENDE with-check + det nye
--    led, saa migrationen er selv-dokumenterende.
-- =========================================================================

-- forum_threads: opret traad (ikke i laast kategori)
drop policy if exists forum_threads_insert_auth on public.forum_threads;
create policy forum_threads_insert_auth on public.forum_threads
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (
      select 1 from public.forum_categories c
      where c.id = category_id and c.is_locked
    )
    and not public.er_bruger_spaerret()
  );

-- forum_posts: svar (ikke i laast/fjernet traad)
drop policy if exists forum_posts_insert_auth on public.forum_posts;
create policy forum_posts_insert_auth on public.forum_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (
      select 1 from public.forum_threads th
      where th.id = thread_id and (th.is_locked or th.is_removed)
    )
    and not public.er_bruger_spaerret()
  );

-- comments: kommentar paa feedback-melding
drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth on public.comments
  for insert to authenticated
  with check (author_id = auth.uid() and not public.er_bruger_spaerret());

-- cars: tilfoej bil i Min garage
drop policy if exists cars_insert_own on public.cars;
create policy cars_insert_own on public.cars
  for insert to authenticated
  with check (owner_id = auth.uid() and not public.er_bruger_spaerret());

-- issues: meld fejl/oenske
drop policy if exists issues_insert_auth on public.issues;
create policy issues_insert_auth on public.issues
  for insert to authenticated
  with check (created_by = auth.uid() and not public.er_bruger_spaerret());

-- confirmations: "mig med" (bevarer car_id-ejerskabstjek fra multi_model-garagen)
drop policy if exists confirmations_insert_own on public.confirmations;
create policy confirmations_insert_own on public.confirmations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      car_id is null
      or exists (
        select 1 from public.cars ca
        where ca.id = car_id and ca.owner_id = auth.uid()
      )
    )
    and not public.er_bruger_spaerret()
  );

-- messages: send privat besked (bevarer deltager- + blokerings-tjek)
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.er_deltager(conversation_id)
    and not public.er_blokeret(conversation_id)
    and not public.er_bruger_spaerret()
  );

-- event_signups: tilmeld event
drop policy if exists event_signups_insert_own on public.event_signups;
create policy event_signups_insert_own on public.event_signups
  for insert to authenticated
  with check (user_id = auth.uid() and not public.er_bruger_spaerret());

-- =========================================================================
-- 4) user_sanctions - sanktions-historik (sandhedskilde).
--    Fuld historik pr. bruger; fodrer audit-loggen + Adgange-overblikket (P20).
-- =========================================================================
create table if not exists public.user_sanctions (
  id          uuid primary key default gen_random_uuid(),
  bruger_id   uuid not null references public.profiles(id) on delete cascade,
  type        text not null,            -- advarsel | suspender | ban | ophaev | anonymiser
  grund       text,                     -- dublet | tone | off-topic | spam | andet (hvor relevant)
  fritekst    text,
  udloeber_at timestamptz,              -- null = permanent / ikke tidsbegraenset
  udfoert_af  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists user_sanctions_bruger_idx
  on public.user_sanctions (bruger_id, created_at desc);

-- =========================================================================
-- 5) moderation_log - faelles audit-log (deles af P20 + P21).
--    snapshot fryser titel/navn, saa loggen kan laeses selv hvis maalet er vaek.
--    Skrives KUN af security-definer-RPC'erne, aldrig fra klienten.
-- =========================================================================
create table if not exists public.moderation_log (
  id          uuid primary key default gen_random_uuid(),
  handling    text not null,            -- fjern_traad | fjern_indlaeg | fastgoer | laas | suspender | ban | ophaev | advar | anonymiser | slet | ...
  maal_type   text not null,            -- thread | post | user | ...
  maal_id     uuid,
  grund       text,
  fritekst    text,
  snapshot    text,                     -- frosset titel/navn
  udfoert_af  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists moderation_log_created_idx
  on public.moderation_log (created_at desc);

-- =========================================================================
-- 6) RLS: begge tabeller - moderator/admin LAESER; ingen klient-skrivning.
--    Kun security-definer-RPC'erne (som bypasser RLS) indsaetter raekker.
--    Samme moenster som notifications (ingen klient-insert-policy).
-- =========================================================================
alter table public.user_sanctions enable row level security;
alter table public.moderation_log enable row level security;

drop policy if exists user_sanctions_select_mod on public.user_sanctions;
create policy user_sanctions_select_mod on public.user_sanctions
  for select to authenticated using (public.er_moderator());

drop policy if exists moderation_log_select_mod on public.moderation_log;
create policy moderation_log_select_mod on public.moderation_log
  for select to authenticated using (public.er_moderator());
