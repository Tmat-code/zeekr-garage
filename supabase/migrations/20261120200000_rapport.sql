-- Zeekr Garage - Zeekr-rapport (eksport PDF/CSV, markér sendt, delta, log)
-- ---------------------------------------------------------------------------
-- Porteret fra bugherrer (SQLite → Postgres). Sendt-sporing pr. melding, snapshot
-- til fortryd, rapport-log, og oversættelses-cache (LibreTranslate i app-laget).

-- =========================================================================
-- 1) Sendt-sporing på meldinger
-- =========================================================================
alter table public.issues
  add column if not exists sidst_sendt_stemmer int,
  add column if not exists sidst_sendt_dato     timestamptz;

-- =========================================================================
-- 2) Rapport-log (hvem downloadede)
-- =========================================================================
create table if not exists public.rapport_log (
  id              bigint generated always as identity primary key,
  navn            text not null,
  rolle           text not null,
  format          text not null,            -- 'pdf' | 'csv'
  type            text not null,            -- 'fejl' | 'oenske' | 'begge'
  antal           text not null,            -- '20' | 'alle'
  kun_aendrede    boolean not null default false,
  med_kommentarer boolean not null default false,
  created_at      timestamptz not null default now()
);
alter table public.rapport_log enable row level security;
drop policy if exists rapport_log_mod on public.rapport_log;
create policy rapport_log_mod on public.rapport_log
  for all to authenticated using (public.er_moderator()) with check (public.er_moderator());

-- =========================================================================
-- 3) Rapport-markering (snapshot pr. "Dan rapport", til fortryd)
-- =========================================================================
create table if not exists public.rapport_markering (
  id         bigint generated always as identity primary key,
  navn       text not null,
  rolle      text not null,
  antal      int  not null,
  data       jsonb not null,                -- [{id, ps (prev stemmer), pd (prev dato)}]
  fortrudt   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.rapport_markering enable row level security;
drop policy if exists rapport_markering_admin on public.rapport_markering;
create policy rapport_markering_admin on public.rapport_markering
  for select to authenticated using (public.er_admin());

-- =========================================================================
-- 4) Oversættelses-cache (titel+beskrivelse pr. melding/sprog)
-- =========================================================================
create table if not exists public.oversaettelser (
  issue_id    uuid not null references public.issues(id) on delete cascade,
  sprog       text not null,
  kilde_hash  text not null,
  titel       text not null,
  beskrivelse text not null,
  updated_at  timestamptz not null default now(),
  primary key (issue_id, sprog)
);
alter table public.oversaettelser enable row level security;
drop policy if exists oversaettelser_mod on public.oversaettelser;
create policy oversaettelser_mod on public.oversaettelser
  for all to authenticated using (public.er_moderator()) with check (public.er_moderator());

-- =========================================================================
-- 5) RPC: rapport-rækker (meldinger m. stemmer, variant-fordeling, delta-felter)
-- =========================================================================
create or replace function public.rapport_fejl(
  p_type text,
  p_kun_aendrede boolean,
  p_antal int
)
returns table (
  id uuid,
  title text,
  description text,
  type text,
  severity text,
  status text,
  software_version text,
  phone_model text,
  phone_os text,
  created_at timestamptz,
  modeller text,
  stemmer bigint,
  antal_svar bigint,
  sidst_sendt_stemmer int,
  sidst_sendt_dato timestamptz,
  variant_fordeling jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    i.id, i.title, i.description, i.type::text, i.severity::text, i.status::text,
    i.software_version, i.phone_model, i.phone_os, i.created_at,
    coalesce((
      select string_agg(m.name, ', ' order by m.display_order)
      from public.issue_models im join public.models m on m.id = im.model_id
      where im.issue_id = i.id
    ), '') as modeller,
    (select count(*) from public.confirmations c where c.issue_id = i.id) as stemmer,
    (select count(*) from public.comments k where k.issue_id = i.id) as antal_svar,
    i.sidst_sendt_stemmer, i.sidst_sendt_dato,
    coalesce((
      select jsonb_agg(jsonb_build_object('variant', t.name, 'n', t.n) order by t.n desc)
      from (
        select v.name, count(*) as n
        from public.confirmations c join public.variants v on v.id = c.variant_id
        where c.issue_id = i.id group by v.name
      ) t
    ), '[]'::jsonb) as variant_fordeling
  from public.issues i
  where (p_type = 'begge' or i.type::text = p_type)
    and (
      not p_kun_aendrede
      or i.sidst_sendt_dato is null
      or (select count(*) from public.confirmations c where c.issue_id = i.id)
         > coalesce(i.sidst_sendt_stemmer, 0)
    )
  order by (select count(*) from public.confirmations c where c.issue_id = i.id) desc,
           i.created_at desc
  limit greatest(1, p_antal);
$$;

-- =========================================================================
-- 6) RPC: dan rapport-markering (markér udvalg som sendt + snapshot) - KUN admin
-- =========================================================================
create or replace function public.dan_rapport_markering(
  p_type text,
  p_kun_aendrede boolean,
  p_antal int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_snapshot jsonb;
  v_navn text;
begin
  if not public.er_admin() then raise exception 'Kun admin kan danne rapporten'; end if;

  select array_agg(x.id),
         jsonb_agg(jsonb_build_object('id', x.id, 'ps', x.sidst_sendt_stemmer, 'pd', x.sidst_sendt_dato))
  into v_ids, v_snapshot
  from (
    select i.id, i.sidst_sendt_stemmer, i.sidst_sendt_dato
    from public.issues i
    where (p_type = 'begge' or i.type::text = p_type)
      and (
        not p_kun_aendrede
        or i.sidst_sendt_dato is null
        or (select count(*) from public.confirmations c where c.issue_id = i.id)
           > coalesce(i.sidst_sendt_stemmer, 0)
      )
    order by (select count(*) from public.confirmations c where c.issue_id = i.id) desc,
             i.created_at desc
    limit greatest(1, p_antal)
  ) x;

  if v_ids is null then return 0; end if;

  update public.issues i
  set sidst_sendt_stemmer = (select count(*) from public.confirmations c where c.issue_id = i.id),
      sidst_sendt_dato = now()
  where i.id = any(v_ids);

  select coalesce(display_name, 'admin') into v_navn from public.profiles where id = auth.uid();
  insert into public.rapport_markering (navn, rolle, antal, data)
  values (coalesce(v_navn, 'admin'), 'admin', array_length(v_ids, 1), v_snapshot);

  return array_length(v_ids, 1);
end;
$$;

-- =========================================================================
-- 7) RPC: fortryd seneste markering - KUN admin
-- =========================================================================
create or replace function public.fortryd_markering()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_data jsonb;
  r jsonb;
begin
  if not public.er_admin() then raise exception 'Kun admin'; end if;

  select id, data into v_id, v_data
  from public.rapport_markering
  where not fortrudt order by created_at desc, id desc limit 1;

  if v_id is null then return 0; end if;

  for r in select * from jsonb_array_elements(v_data) loop
    update public.issues
    set sidst_sendt_stemmer = nullif(r->>'ps', '')::int,
        sidst_sendt_dato    = nullif(r->>'pd', '')::timestamptz
    where id = (r->>'id')::uuid;
  end loop;

  update public.rapport_markering set fortrudt = true where id = v_id;
  return jsonb_array_length(v_data);
end;
$$;

-- =========================================================================
-- 8) RPC: overblik (sidst sendt + "siden sidste rapport")
-- =========================================================================
create or replace function public.rapport_overblik()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'sidst', (
      select jsonb_build_object('navn', navn, 'antal', antal, 'dato', created_at)
      from public.rapport_markering where not fortrudt order by created_at desc, id desc limit 1
    ),
    'nye', (select count(*) from public.issues i where i.sidst_sendt_dato is null),
    'eskaleret', (
      select count(*) from public.issues i
      where i.sidst_sendt_dato is not null
        and (select count(*) from public.confirmations c where c.issue_id = i.id)
            > coalesce(i.sidst_sendt_stemmer, 0)
    ),
    'ekstra_stemmer', (
      select coalesce(sum(greatest(0,
        (select count(*) from public.confirmations c where c.issue_id = i.id)
        - coalesce(i.sidst_sendt_stemmer, 0))), 0)
      from public.issues i where i.sidst_sendt_dato is not null
    )
  );
$$;
