-- Zeekr Garage - Forum-rapporter (M2, del af P21)
-- ---------------------------------------------------------------------------
-- Giver almindelige brugere en rapportér-knap paa forum-indhold (traad + indlaeg)
-- og moderatoren en indgaaende koe i Vaerkstedet. Spejler message_reports-moenstret
-- fra privat-beskeder (20261122120000 + 20261122130000) - men her er det
-- rapporterede indhold OFFENTLIGT, saa der er INGEN privatlivs-hensyn: koe-RPC'en
-- beriger bare rapporten med det offentlige indhold.
--
-- Fremtidssikring: kolonnen "kilde" (bruger | ai). P5's AI-flagning lander senere
-- i SAMME koe ved at indsaette rapporter med kilde='ai' (via en security-definer-
-- sti), saa moderatoren har ét sted for "kraever opmaerksomhed".
--
-- Afhaenger af M1 (er_moderator findes allerede fra admin_roles). Idempotent.

-- =========================================================================
-- 1) forum_reports
--    thread_id ELLER post_id (mindst ét) - en rapport peger paa en traad
--    (typisk aabnings-indlaegget) eller et konkret svar.
--    on delete cascade: forum-indhold soft-removes normalt (is_removed, raekken
--    bliver), saa en hard-delete er sjaelden - men sker den, forsvinder dens
--    rapporter med (en rapport uden maal er stoej i koeen).
-- =========================================================================
create table if not exists public.forum_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  thread_id   uuid references public.forum_threads(id) on delete cascade,
  post_id     uuid references public.forum_posts(id) on delete cascade,
  reason      text,                       -- dublet | tone | off-topic | spam | andet
  kilde       text not null default 'bruger' check (kilde in ('bruger', 'ai')),
  handled     boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint forum_reports_maal_check check (thread_id is not null or post_id is not null)
);
-- Koe-opslag: uhaandterede foerst, nyeste foerst.
create index if not exists forum_reports_open_idx
  on public.forum_reports (handled, created_at desc);

-- =========================================================================
-- 2) RLS - som message_reports.
--    insert: enhver indlogget bruger anmelder i eget navn, KUN kilde='bruger'
--            (AI-rapporter kommer ad en security-definer-sti, ikke herfra).
--    select/update: moderator (laes koeen + saet handled).
-- =========================================================================
alter table public.forum_reports enable row level security;

drop policy if exists forum_reports_insert_own on public.forum_reports;
create policy forum_reports_insert_own on public.forum_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and kilde = 'bruger');

drop policy if exists forum_reports_select_mod on public.forum_reports;
create policy forum_reports_select_mod on public.forum_reports
  for select to authenticated using (public.er_moderator());

drop policy if exists forum_reports_update_mod on public.forum_reports;
create policy forum_reports_update_mod on public.forum_reports
  for update to authenticated
  using (public.er_moderator()) with check (public.er_moderator());

-- =========================================================================
-- 3) admin_forum_rapporter() - koeen beriget med det rapporterede indhold.
--    security definer (laeser traad/indlaeg uden at afhaenge af kalderens
--    adgang), men afgraenser selv til moderatorer. "effektiv traad" findes
--    enten direkte (traad-rapport) eller via indlaegget (post-rapport).
-- =========================================================================
create or replace function public.admin_forum_rapporter()
returns table (
  report_id      uuid,
  thread_id      uuid,
  post_id        uuid,
  reason         text,
  kilde          text,
  handled        boolean,
  created_at     timestamptz,
  reporter_id    uuid,
  reporter_navn  text,
  kategori_slug  text,
  traad_slug     text,
  traad_titel    text,
  indhold        text,          -- post-body (post-rapport) ellers aabnings-indlaegget (traad-rapport)
  forfatter_id   uuid,
  forfatter_navn text,
  er_fjernet     boolean        -- er maalet allerede soft-removed?
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id                                                   as report_id,
    r.thread_id,
    r.post_id,
    r.reason,
    r.kilde,
    r.handled,
    r.created_at,
    r.reporter_id,
    coalesce(nullif(trim(rp.display_name), ''), 'En ejer') as reporter_navn,
    c.slug                                                 as kategori_slug,
    th.slug                                                as traad_slug,
    th.title                                               as traad_titel,
    case when r.post_id is not null then po.body else aab.body end as indhold,
    case when r.post_id is not null then po.author_id else th.author_id end as forfatter_id,
    coalesce(nullif(trim(fp.display_name), ''), 'En ejer') as forfatter_navn,
    coalesce(
      (case when r.post_id is not null then po.is_removed else false end) or th.is_removed,
      false
    )                                                      as er_fjernet
  from public.forum_reports r
  left join public.profiles      rp on rp.id = r.reporter_id
  left join public.forum_posts   po on po.id = r.post_id
  -- effektiv traad: direkte (traad-rapport) eller via det rapporterede indlaeg
  left join public.forum_threads th on th.id = coalesce(r.thread_id, po.thread_id)
  left join public.forum_categories c on c.id = th.category_id
  -- aabnings-indlaegget (til traad-rapporter, hvor "indhold" = aabningen)
  left join lateral (
    select body
    from public.forum_posts
    where thread_id = th.id and is_opening = true
    order by created_at asc
    limit 1
  ) aab on true
  -- forfatter: post-forfatter ved post-rapport, ellers traad-forfatter
  left join public.profiles fp
    on fp.id = (case when r.post_id is not null then po.author_id else th.author_id end)
  where public.er_moderator()
  order by r.handled asc, r.created_at desc;
$$;

revoke all on function public.admin_forum_rapporter() from public;
grant execute on function public.admin_forum_rapporter() to authenticated;
