-- Zeekr Garage - Forum-moderering: paginering + filter (M5, P16)
-- ---------------------------------------------------------------------------
-- Vaerkstedets forum-modererings-liste (/admin/forum) viste hidtil kun de 25
-- nyeste traade + 25 nyeste indlaeg (getAdminForum(25)) uden paginering eller
-- filter - vokser forummet forbi det, falder aeldre indhold ud af overblikket.
-- Denne migration giver to moderator-laesbare RPC'er med samme afkortnings-vej
-- som admin_alle_brugere (P20): fritekst-soeg + "kraever opmaerksomhed"-filter
-- + limit/offset ("vis flere") + total (saa UI kan vise "viser X af Y").
--
-- "Kraever opmaerksomhed" (laast med Torben 24-11) = en traad/et indlaeg der
-- ENTEN har en aaben rapport (forum_reports.handled=false) ELLER er skrevet af
-- en bruger der lige nu er spaerret (profiles.spaerret_til > now()). Det
-- komplementerer rapport-koen ovenover: rapporterede ting set i kontekst blandt
-- naboerne + en sanktioneret brugers resterende fodaftryk (som koen aldrig viser
-- med mindre hvert indlaeg er rapporteret for sig). Begge flag returneres ogsaa
-- raat, saa UI kan saette et maerke paa raekken selv i "Alle"-visningen.
--
-- Moderator-gated som admin_alle_brugere: security definer + "where
-- er_moderator()" i basen, saa en ikke-moderator faar 0 raekker (RLS-aegte -
-- funktionen laekker intet selv om execute er grantet til authenticated).
--
-- En thread-rapport baeres paa thread_id, et svar-rapport paa post_id (jf. P21:
-- aabnings-indlaeg rapporterer TRAADEN) - derfor kobler traad-flagget paa
-- thread_id og indlaeg-flagget paa post_id.
--
-- Afhaenger af: forum_threads/forum_posts/forum_categories (init-forum),
-- forum_reports (M2), profiles.spaerret_til + er_moderator (M1 + admin_roles).
-- Ingen skemaaendring - kun to funktioner. Idempotent (drop-if-exists + create).

-- =========================================================================
-- admin_forum_mod_traade - traad-kolonnen i moderings-listen.
--    Base: ikke-fjernede traade. Soeg paa titel ELLER forfatter-navn. Filter
--    "kun opmaerksomhed" = har aaben rapport ELLER spaerret forfatter.
--    Sorteret nyest aktive foerst (last_post_at desc), som den gamle liste.
-- =========================================================================
drop function if exists public.admin_forum_mod_traade(text, boolean, int, int);

create function public.admin_forum_mod_traade(
  p_soeg    text    default '',
  p_kun_opm boolean default false,
  p_limit   int     default 25,
  p_offset  int     default 0
)
returns table (
  id                 uuid,
  slug               text,
  title              text,
  last_post_at       timestamptz,
  reply_count        int,
  view_count         int,
  is_pinned          boolean,
  is_locked          boolean,
  kategori_slug      text,
  kategori_navn      text,
  forfatter          text,
  har_rapport        boolean,
  forfatter_spaerret boolean,
  total              bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      t.id,
      t.slug,
      t.title,
      t.last_post_at,
      t.reply_count,
      t.view_count,
      t.is_pinned,
      t.is_locked,
      c.slug as kategori_slug,
      c.name as kategori_navn,
      pf.display_name as forfatter,
      exists (
        select 1 from public.forum_reports r
        where r.thread_id = t.id and not r.handled
      ) as har_rapport,
      (pf.spaerret_til is not null and pf.spaerret_til > now()) as forfatter_spaerret
    from public.forum_threads t
    join public.forum_categories c on c.id = t.category_id
    left join public.profiles pf on pf.id = t.author_id
    where public.er_moderator()
      and t.is_removed = false
      and (
        coalesce(btrim(p_soeg), '') = ''
        or t.title ilike '%' || p_soeg || '%'
        or coalesce(pf.display_name, '') ilike '%' || p_soeg || '%'
      )
  ),
  filtreret as (
    select * from base
    where (not p_kun_opm) or har_rapport or forfatter_spaerret
  )
  select
    f.id, f.slug, f.title, f.last_post_at, f.reply_count, f.view_count,
    f.is_pinned, f.is_locked, f.kategori_slug, f.kategori_navn, f.forfatter,
    f.har_rapport, f.forfatter_spaerret,
    count(*) over () as total
  from filtreret f
  order by f.last_post_at desc
  limit  greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- =========================================================================
-- admin_forum_mod_indlaeg - indlaeg-kolonnen i moderings-listen.
--    Base: ikke-fjernede indlaeg i ikke-fjernede traade. Soeg paa traad-titel
--    ELLER forfatter-navn. Samme opmaerksomheds-filter (rapport paa post_id
--    ELLER spaerret forfatter). Sorteret nyest foerst (created_at desc).
-- =========================================================================
drop function if exists public.admin_forum_mod_indlaeg(text, boolean, int, int);

create function public.admin_forum_mod_indlaeg(
  p_soeg    text    default '',
  p_kun_opm boolean default false,
  p_limit   int     default 25,
  p_offset  int     default 0
)
returns table (
  id                 uuid,
  body               text,
  created_at         timestamptz,
  is_opening         boolean,
  forfatter          text,
  traad_titel        text,
  traad_slug         text,
  kategori_slug      text,
  har_rapport        boolean,
  forfatter_spaerret boolean,
  total              bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      p.id,
      p.body,
      p.created_at,
      p.is_opening,
      pf.display_name as forfatter,
      t.title as traad_titel,
      t.slug  as traad_slug,
      c.slug  as kategori_slug,
      exists (
        select 1 from public.forum_reports r
        where r.post_id = p.id and not r.handled
      ) as har_rapport,
      (pf.spaerret_til is not null and pf.spaerret_til > now()) as forfatter_spaerret
    from public.forum_posts p
    join public.forum_threads t on t.id = p.thread_id
    join public.forum_categories c on c.id = t.category_id
    left join public.profiles pf on pf.id = p.author_id
    where public.er_moderator()
      and p.is_removed = false
      and t.is_removed = false
      and (
        coalesce(btrim(p_soeg), '') = ''
        or t.title ilike '%' || p_soeg || '%'
        or coalesce(pf.display_name, '') ilike '%' || p_soeg || '%'
      )
  ),
  filtreret as (
    select * from base
    where (not p_kun_opm) or har_rapport or forfatter_spaerret
  )
  select
    f.id, f.body, f.created_at, f.is_opening, f.forfatter, f.traad_titel,
    f.traad_slug, f.kategori_slug, f.har_rapport, f.forfatter_spaerret,
    count(*) over () as total
  from filtreret f
  order by f.created_at desc
  limit  greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- =========================================================================
-- Grants: ingen public execute; kun authenticated (funktionerne gater selv
-- internt paa er_moderator - en ikke-moderator faar 0 raekker).
-- =========================================================================
revoke all on function public.admin_forum_mod_traade(text, boolean, int, int) from public;
grant execute on function public.admin_forum_mod_traade(text, boolean, int, int) to authenticated;

revoke all on function public.admin_forum_mod_indlaeg(text, boolean, int, int) from public;
grant execute on function public.admin_forum_mod_indlaeg(text, boolean, int, int) to authenticated;
