-- Zeekr Garage - Legacy-import fra bugherrer
-- ---------------------------------------------------------------------------
-- Bugherrer har ingen brugerkonti (stemmer er browser-baserede), så importerede
-- stemmer kan ikke blive til per-bruger-bekræftelser. I stedet gemmes de som et
-- legacy-baseline-tal pr. melding (+ variant-fordeling), som live-stemmer lægges
-- oveni ved visning. Kommentar-forfattere importeres som navne-tekst.

alter table public.issues
  add column if not exists legacy_stemmer     int   not null default 0,
  add column if not exists legacy_biler       jsonb not null default '[]'::jsonb,
  -- bugherrer-fejlens id. Gør importen idempotent: re-import opdaterer samme
  -- række (upsert på denne) i stedet for at lave dubletter. NULL = født i garage.
  add column if not exists legacy_bugherrer_id int;

create unique index if not exists issues_legacy_bugherrer_id_key
  on public.issues (legacy_bugherrer_id) where legacy_bugherrer_id is not null;

-- Importerede kommentarer har et navn, men ingen konto.
alter table public.comments
  add column if not exists author_navn text;

-- =========================================================================
-- Opdatér rapport_fejl: stemmer + variant-fordeling = live + legacy
-- =========================================================================
create or replace function public.rapport_fejl(
  p_type text,
  p_kun_aendrede boolean,
  p_antal int
)
returns table (
  id uuid, title text, description text, type text, severity text, status text,
  software_version text, phone_model text, phone_os text, created_at timestamptz,
  modeller text, stemmer bigint, antal_svar bigint,
  sidst_sendt_stemmer int, sidst_sendt_dato timestamptz, variant_fordeling jsonb
)
language sql security definer stable set search_path = public as $$
  select
    i.id, i.title, i.description, i.type::text, i.severity::text, i.status::text,
    i.software_version, i.phone_model, i.phone_os, i.created_at,
    coalesce((
      select string_agg(m.name, ', ' order by m.display_order)
      from public.issue_models im join public.models m on m.id = im.model_id
      where im.issue_id = i.id
    ), '') as modeller,
    ((select count(*) from public.confirmations c where c.issue_id = i.id)
      + coalesce(i.legacy_stemmer, 0))::bigint as stemmer,
    (select count(*) from public.comments k where k.issue_id = i.id) as antal_svar,
    i.sidst_sendt_stemmer, i.sidst_sendt_dato,
    coalesce((
      select jsonb_agg(jsonb_build_object('variant', u.variant, 'n', u.n) order by u.n desc)
      from (
        select variant, sum(n)::int as n from (
          select v.name as variant, count(*)::int as n
          from public.confirmations c join public.variants v on v.id = c.variant_id
          where c.issue_id = i.id group by v.name
          union all
          select (b->>'variant')::text, (b->>'n')::int
          from jsonb_array_elements(i.legacy_biler) b
        ) kombi group by variant
      ) u
    ), '[]'::jsonb) as variant_fordeling
  from public.issues i
  where (p_type = 'begge' or i.type::text = p_type)
    and (
      not p_kun_aendrede
      or i.sidst_sendt_dato is null
      or ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer, 0))
         > coalesce(i.sidst_sendt_stemmer, 0)
    )
  order by ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer, 0)) desc,
           i.created_at desc
  limit greatest(1, p_antal);
$$;

-- Og markeringen/overblikket skal tælle legacy med, så delta bliver rigtigt.
create or replace function public.dan_rapport_markering(p_type text, p_kun_aendrede boolean, p_antal int)
returns int language plpgsql security definer set search_path = public as $$
declare v_ids uuid[]; v_snapshot jsonb; v_navn text;
begin
  if not public.er_admin() then raise exception 'Kun admin kan danne rapporten'; end if;
  select array_agg(x.id), jsonb_agg(jsonb_build_object('id', x.id, 'ps', x.sidst_sendt_stemmer, 'pd', x.sidst_sendt_dato))
  into v_ids, v_snapshot from (
    select i.id, i.sidst_sendt_stemmer, i.sidst_sendt_dato from public.issues i
    where (p_type = 'begge' or i.type::text = p_type)
      and (not p_kun_aendrede or i.sidst_sendt_dato is null
        or ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0)) > coalesce(i.sidst_sendt_stemmer, 0))
    order by ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0)) desc, i.created_at desc
    limit greatest(1, p_antal)) x;
  if v_ids is null then return 0; end if;
  update public.issues i set sidst_sendt_stemmer = (select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0),
    sidst_sendt_dato = now() where i.id = any(v_ids);
  select coalesce(display_name, 'admin') into v_navn from public.profiles where id = auth.uid();
  insert into public.rapport_markering (navn, rolle, antal, data)
  values (coalesce(v_navn, 'admin'), 'admin', array_length(v_ids, 1), v_snapshot);
  return array_length(v_ids, 1);
end; $$;

create or replace function public.rapport_overblik()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'sidst', (select jsonb_build_object('navn', navn, 'antal', antal, 'dato', created_at)
      from public.rapport_markering where not fortrudt order by created_at desc, id desc limit 1),
    'nye', (select count(*) from public.issues i where i.sidst_sendt_dato is null),
    'eskaleret', (select count(*) from public.issues i where i.sidst_sendt_dato is not null
      and ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0)) > coalesce(i.sidst_sendt_stemmer, 0)),
    'ekstra_stemmer', (select coalesce(sum(greatest(0,
      ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0)) - coalesce(i.sidst_sendt_stemmer, 0))), 0)
      from public.issues i where i.sidst_sendt_dato is not null));
$$;
