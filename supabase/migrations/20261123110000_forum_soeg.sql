-- Zeekr Garage - Forum: tvaergaaende traad-soegning (P4)
-- ---------------------------------------------------------------------------
-- IA-strategien hviler bevidst paa SOEGNING for findbarhed (ikke perfekt
-- kategorisering) - se "Beslutning - forum-struktur" i HANDOVER. Her bygges
-- selve soegningen: paa tvaers af ALLE kategorier/model-fora, med match i
-- baade traad-titler og indlaegs-tekst (aabnings-indlaeg + svar).
--
-- Metode: Postgres full-text search med DANSK ordbog ('danish' snowball) frem
-- for ILIKE. Giver stemming (soegning/soeger/soege -> samme stamme),
-- relevans-ranking (ts_rank) og highlight-uddrag (ts_headline) - det ILIKE
-- ikke kan, og ILIKE kan ikke bruge indeks paa '%term%'.
--
-- tsvector-kolonnerne er GENERATED ALWAYS ... STORED (ingen trigger at
-- vedligeholde - Postgres holder dem selv ajour ved insert/update). GIN-indeks
-- paa hver. Soegningen koerer i én RPC (forum_soeg) saa ranking + headline sker
-- i databasen.
--
-- Fjernede (is_removed) traade OG indlaeg holdes ude af resultaterne.
-- Adgang som resten af forummet: offentlig (anon + authenticated) - soegning
-- afsloerer intet der ikke allerede er offentligt laesbart.
--
-- Idempotent: add column if not exists + create index if not exists +
-- create or replace function.

-- =========================================================================
-- 1) tsvector-kolonner (genererede, dansk ordbog) + GIN-indeks
-- =========================================================================

-- Traad-titel. Konstant config-literal -> udtrykket er immutable -> tilladt
-- i en genereret kolonne.
alter table public.forum_threads
  add column if not exists tsv tsvector
  generated always as (to_tsvector('danish', coalesce(title, ''))) stored;

create index if not exists forum_threads_tsv_idx
  on public.forum_threads using gin (tsv);

-- Indlaegs-tekst (aabnings-indlaeg + svar - begge er bare posts).
alter table public.forum_posts
  add column if not exists tsv tsvector
  generated always as (to_tsvector('danish', coalesce(body, ''))) stored;

create index if not exists forum_posts_tsv_idx
  on public.forum_posts using gin (tsv);

-- =========================================================================
-- 2) Soege-RPC
--    Returnerer ÉN raekke pr. traad (ikke pr. matchende indlaeg), med:
--    - relevans-rank (titel vejer tungere end indlaegs-tekst)
--    - et highlightet uddrag (ts_headline) fra den bedst matchende tekst
--      i traaden (titel eller et indlaeg).
--    Highlight-markoerer: chr(1)/chr(2) (kontroltegn der aldrig staar i
--    rigtig tekst) -> app-laget splitter paa dem og wrapper i <mark>.
--
--    stable + security definer: laesning er offentlig alligevel (RLS = read
--    all paa forum-tabellerne), og security definer sikrer ens opfoersel
--    uanset kalder. search_path pinnet.
-- =========================================================================
create or replace function public.forum_soeg(p_soegeord text, p_maks int default 50)
returns table (
  thread_id     uuid,
  slug          text,
  title         text,
  kategori_slug text,
  kategori_navn text,
  kategori_icon text,
  model_id      uuid,
  forfatter     text,
  bil_model     text,
  bil_variant   text,
  last_post_at  timestamptz,
  reply_count   int,
  view_count    int,
  is_pinned     boolean,
  is_locked     boolean,
  rank          real,
  uddrag        text
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    -- websearch_to_tsquery: brugervenlig parser (fraser, "or", - minus),
    -- kaster aldrig fejl paa skoer input. Tom/stopord-input -> tom query
    -- -> matcher intet.
    select websearch_to_tsquery('danish', coalesce(p_soegeord, '')) as ts
  ),
  -- Match i traad-titler (vejer x4).
  titel as (
    select t.id as thread_id, ts_rank(t.tsv, q.ts) * 4.0 as rank
    from public.forum_threads t
    cross join q
    where t.is_removed = false
      and t.tsv @@ q.ts
  ),
  -- Match i indlaeg (ekskl. fjernede indlaeg OG indlaeg i fjernede traade).
  -- Bedste indlaegs-rank pr. traad.
  indlaeg as (
    select p.thread_id, max(ts_rank(p.tsv, q.ts)) as rank
    from public.forum_posts p
    join public.forum_threads t on t.id = p.thread_id
    cross join q
    where p.is_removed = false
      and t.is_removed = false
      and p.tsv @@ q.ts
    group by p.thread_id
  ),
  -- Saml til én rank pr. traad.
  samlet as (
    select thread_id, sum(rank) as rank
    from (select * from titel union all select * from indlaeg) u
    group by thread_id
  )
  select
    t.id,
    t.slug,
    t.title,
    c.slug,
    c.name,
    c.icon,
    c.model_id,
    pr.display_name,
    mm.name,
    vv.name,
    t.last_post_at,
    t.reply_count,
    t.view_count,
    t.is_pinned,
    t.is_locked,
    s.rank::real,
    h.uddrag
  from samlet s
  join public.forum_threads t     on t.id = s.thread_id
  join public.forum_categories c  on c.id = t.category_id
  left join public.profiles pr    on pr.id = t.author_id
  left join public.models   mm    on mm.id = pr.car_model_id
  left join public.variants vv    on vv.id = pr.car_variant_id
  cross join q
  -- Uddrag: headline fra den bedst matchende tekst i traaden (titel ELLER et
  -- ikke-fjernet indlaeg). Faldt matchet kun i titlen, headlines titlen.
  left join lateral (
    select ts_headline('danish', kilde.txt, q.ts,
             'StartSel=' || chr(1) || ',StopSel=' || chr(2) ||
             ',MaxWords=30,MinWords=12,ShortWord=2,MaxFragments=1') as uddrag
    from (
      select t.title as txt, ts_rank(t.tsv, q.ts) as r
      union all
      select p.body, ts_rank(p.tsv, q.ts)
      from public.forum_posts p
      where p.thread_id = t.id
        and p.is_removed = false
        and p.tsv @@ q.ts
    ) kilde
    order by kilde.r desc
    limit 1
  ) h on true
  order by s.rank desc, t.last_post_at desc
  limit greatest(1, least(coalesce(p_maks, 50), 100));
$$;

grant execute on function public.forum_soeg(text, int) to anon, authenticated;
