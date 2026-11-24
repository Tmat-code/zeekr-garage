-- Zeekr Garage - Defensivt loft paa rapport-koen (P24)
-- ---------------------------------------------------------------------------
-- admin_forum_rapporter() (M2, P21) hentede ALLE aabne forum-rapporter paa én
-- gang; /admin/forum rendrede et kort pr. stk. Ved lav trafik fint, men en
-- daarlig dag med mange rapporter bliver koen en mur - og en ren JS-slice ville
-- kun afkorte renderingen, ikke selve hentningen (RPC'en ville stadig sende hver
-- aaben raekke over traaden ved hvert kald). Denne migration lofter ved kilden:
-- samme afkortnings-vej som rapport-moderingen fik i M5/P16 og bruger-overblikket
-- i P20 - limit/offset ("vis flere") + total ("viser X af Y") via count(*) over ().
--
-- Ingen skemaaendring - kun selve funktionen omdefineres (fra 0-arg til
-- limit/offset-arg). Begge parametre har defaults, saa et kald UDEN argumenter
-- (gammel kode der stadig koerer under deploy-vinduet) stadig resolver mod den
-- nye funktion og bare faar foerste side - harmloest. Koen viser kun AABNE
-- (handled=false), saa filtreringen er nu flyttet fra JS ind i basen; dermed
-- taeller total netop de aabne.
--
-- Afhaenger af: forum_reports (M2) + forum_threads/forum_posts/forum_categories
-- (init-forum) + profiles. er_moderator (M1 + admin_roles). Idempotent
-- (drop baade 0-arg og limit/offset-signaturen foer create).

-- =========================================================================
-- admin_forum_rapporter(p_limit, p_offset) - den indgaaende koe, afkortet.
--    Samme berigelse som M2 (reporter-, traad-, forfatter-navn + "effektiv
--    traad" + aabnings-indlaeg), men KUN aabne rapporter, pagineret, med total.
--    security definer, moderator-gatet som foer ("where er_moderator()").
-- =========================================================================
drop function if exists public.admin_forum_rapporter();
drop function if exists public.admin_forum_rapporter(int, int);

create function public.admin_forum_rapporter(
  p_limit  int default 20,
  p_offset int default 0
)
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
  er_fjernet     boolean,       -- er maalet allerede soft-removed?
  total          bigint         -- antal aabne rapporter i alt (hele filtreringen)
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
    )                                                      as er_fjernet,
    count(*) over ()                                       as total
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
    and not r.handled
  order by r.created_at desc
  limit  greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.admin_forum_rapporter(int, int) from public;
grant execute on function public.admin_forum_rapporter(int, int) to authenticated;
