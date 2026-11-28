-- P43: SAMMENLÆG DUBLET-MELDINGER (moderator) (28-11-2026).
--
-- Hvorfor: med svensk UI kan samme fejl blive meldt to gange (fx dansk
-- "bremser" og svensk "bromsar"), så stemmerne deles og fejlen ser mindre ud
-- over for Zeekr. En moderator lægger nu dubletten ind under originalen fra
-- Værkstedet -> Feedback.
--
-- Hvad sker der (feedback_saml_dublet):
--   * Stemmer (confirmations) flyttes til originalen, DEDUPE PR. BIL: har
--     originalen allerede en stemme fra samme bil (car_id), droppes dublettens.
--     Gamle rækker uden bil (car_id null) dedupes på (bruger, model). De
--     droppede rækker gemmes i sammenlægnings-rækken, så et fortryd lægger dem
--     tilbage.
--   * Kommentarer + billeder flyttes (billederne lægges efter originalens).
--   * Originalen arver dublettens modeller (kun dem den manglede).
--   * Dubletten får issues.sammenlagt_i = original og er derefter SKJULT
--     overalt (board, forside, søgning, dublet-tjek, rapport). Dens status,
--     titel, sprog og titel-oversættelser røres ikke - et fortryd giver
--     præcis den tilbage.
--   * Én række i issue_sammenlaegninger husker HVAD der blev flyttet.
--
-- Afklaret med Torben 28-11: (1) en importeret bugherrer-melding kan IKKE være
-- dubletten før cutover (den natlige sync overskriver/genindsætter den) -
-- originalen må gerne være importeret; (2) dubletten skjules overalt; (3) alle
-- moderatorer kan fortryde; (4) originalen arver dublettens modeller.
--
-- Audit (P32): issue_sammenlaegninger får zz_audit-triggeren, så både
-- sammenlægningen (INSERT med hele flytte-listen) og fortrydelsen (UPDATE af
-- fortrudt_at) står i superadmins audit-log. Dublettens sammenlagt_i-ændring
-- logges desuden af issues' egen zz_audit. sammenlagt_i er IKKE på revert-
-- allowlisten - fortryd går via feedback_fortryd_sammenlaegning, som også
-- flytter stemmer/kommentarer/billeder tilbage.
--
-- Idempotent: if not exists / create or replace / drop ... if exists.

-- ===========================================================================
-- 1) issues.sammenlagt_i
-- ===========================================================================
alter table public.issues
  add column if not exists sammenlagt_i uuid references public.issues(id) on delete set null;

create index if not exists issues_sammenlagt_i_idx
  on public.issues (sammenlagt_i) where sammenlagt_i is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'issues_sammenlagt_ikke_selv') then
    alter table public.issues
      add constraint issues_sammenlagt_ikke_selv check (sammenlagt_i is null or sammenlagt_i <> id);
  end if;
end $$;

-- Værn: sammenlagt_i må KUN ændres af RPC'erne nedenfor. Uden det kunne en
-- melders egen update-policy (issues_update_own) "af-skjule" sin dublet, eller
-- en insert skjule en ny melding. RPC'erne sætter et transaktions-lokalt flag.
create or replace function public.issues_vaern_sammenlagt()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('p43.rpc', true), '') = '1' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.sammenlagt_i is not null then
      raise exception 'sammenlagt_i saettes kun via feedback_saml_dublet.';
    end if;
  elsif new.sammenlagt_i is distinct from old.sammenlagt_i then
    raise exception 'sammenlagt_i saettes kun via feedback_saml_dublet.';
  end if;
  return new;
end;
$$;

drop trigger if exists a_issues_vaern_sammenlagt on public.issues;
create trigger a_issues_vaern_sammenlagt
  before insert or update on public.issues
  for each row execute function public.issues_vaern_sammenlagt();

-- ===========================================================================
-- 2) issue_sammenlaegninger - hvad der blev flyttet (til visning + fortryd)
-- ===========================================================================
create table if not exists public.issue_sammenlaegninger (
  id          bigint generated always as identity primary key,
  dublet_id   uuid not null references public.issues(id) on delete cascade,
  original_id uuid not null references public.issues(id) on delete cascade,
  aktoer      uuid references public.profiles(id) on delete set null,
  -- {stemmer:[uuid], droppede_stemmer:[række-snapshot], kommentarer:[uuid],
  --  billeder:[{id, order}], modeller:[uuid]}
  flyttet     jsonb not null,
  created_at  timestamptz not null default now(),
  fortrudt_at timestamptz,
  fortrudt_af uuid references public.profiles(id) on delete set null
);

-- Højst én aktiv sammenlægning pr. dublet.
create unique index if not exists issue_sammenlaegninger_aktiv_dublet
  on public.issue_sammenlaegninger (dublet_id) where fortrudt_at is null;
create index if not exists issue_sammenlaegninger_original_idx
  on public.issue_sammenlaegninger (original_id) where fortrudt_at is null;

-- RLS: stab læser; INGEN skrive-policies -> kun de security-definer RPC'er skriver.
alter table public.issue_sammenlaegninger enable row level security;
drop policy if exists issue_sammenlaegninger_select_mod on public.issue_sammenlaegninger;
create policy issue_sammenlaegninger_select_mod on public.issue_sammenlaegninger
  for select to authenticated using (public.er_moderator());

-- P32-audit på den nye tabel.
drop trigger if exists zz_audit on public.issue_sammenlaegninger;
create trigger zz_audit after insert or update or delete on public.issue_sammenlaegninger
  for each row execute function public.audit_capture();

-- ===========================================================================
-- 3) Læg sammen
-- ===========================================================================
create or replace function public.feedback_saml_dublet(p_dublet uuid, p_original uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.issues%rowtype;
  o public.issues%rowtype;
  v_droppede jsonb;
  v_stemmer  jsonb;
  v_komm     jsonb;
  v_bill     jsonb;
  v_mod      jsonb;
  v_max      int;
  v_id       bigint;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderatorer kan laegge meldinger sammen.';
  end if;
  if p_dublet is null or p_original is null then
    raise exception 'Meldingen findes ikke.';
  end if;
  if p_dublet = p_original then
    raise exception 'En melding kan ikke laegges sammen med sig selv.';
  end if;

  -- Lås begge rækker i fast orden (undgår deadlock ved to samtidige).
  perform 1 from public.issues where id in (p_dublet, p_original) order by id for update;
  select * into d from public.issues where id = p_dublet;
  select * into o from public.issues where id = p_original;
  if d.id is null or o.id is null then
    raise exception 'Meldingen findes ikke.';
  end if;
  if d.legacy_bugherrer_id is not null then
    raise exception 'En importeret bugherrer-melding kan ikke vaere dubletten (foer cutover).';
  end if;
  if d.sammenlagt_i is not null then
    raise exception 'Dubletten er allerede lagt sammen.';
  end if;
  if o.sammenlagt_i is not null then
    raise exception 'Originalen er selv lagt sammen med en anden melding.';
  end if;
  if exists (select 1 from public.issues x where x.sammenlagt_i = d.id) then
    raise exception 'Dubletten har selv faaet meldinger lagt ind - fortryd dem foerst.';
  end if;
  if d.type is distinct from o.type then
    raise exception 'En fejl og et oenske kan ikke laegges sammen.';
  end if;

  perform set_config('p43.rpc', '1', true);

  -- a) Stemmer: drop dem originalen allerede har fra samme bil (eller, for
  --    rækker uden bil, samme bruger + model). Snapshot gemmes til fortryd.
  with drop_raekker as (
    delete from public.confirmations c
    where c.issue_id = d.id
      and exists (
        select 1 from public.confirmations x
        where x.issue_id = o.id
          and (
            (c.car_id is not null and x.car_id = c.car_id)
            or ((c.car_id is null or x.car_id is null)
                and x.user_id = c.user_id and x.model_id = c.model_id)
          )
      )
    returning to_jsonb(c.*) as r
  )
  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_droppede from drop_raekker;

  with flyt as (
    update public.confirmations set issue_id = o.id
    where issue_id = d.id
    returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_stemmer from flyt;

  -- b) Kommentarer.
  with flyt as (
    update public.comments set issue_id = o.id
    where issue_id = d.id
    returning id
  )
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_komm from flyt;

  -- c) Billeder - efter originalens egne.
  select coalesce(max(display_order), -1) into v_max from public.issue_images where issue_id = o.id;
  with gamle as (
    select id, display_order from public.issue_images where issue_id = d.id
  ), flyt as (
    update public.issue_images b
    set issue_id = o.id, display_order = v_max + 1 + g.display_order
    from gamle g
    where b.id = g.id
    returning b.id, g.display_order
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'order', display_order)), '[]'::jsonb)
  into v_bill from flyt;

  -- d) Modeller originalen manglede.
  with ny as (
    insert into public.issue_models (issue_id, model_id)
    select o.id, im.model_id from public.issue_models im where im.issue_id = d.id
    on conflict do nothing
    returning model_id
  )
  select coalesce(jsonb_agg(model_id), '[]'::jsonb) into v_mod from ny;

  -- e) Skjul dubletten.
  update public.issues set sammenlagt_i = o.id where id = d.id;

  insert into public.issue_sammenlaegninger (dublet_id, original_id, aktoer, flyttet)
  values (
    d.id, o.id, auth.uid(),
    jsonb_build_object(
      'stemmer', v_stemmer,
      'droppede_stemmer', v_droppede,
      'kommentarer', v_komm,
      'billeder', v_bill,
      'modeller', v_mod
    )
  )
  returning id into v_id;

  perform set_config('p43.rpc', '', true);
  return v_id;
end;
$$;

revoke all on function public.feedback_saml_dublet(uuid, uuid) from public, anon;
grant execute on function public.feedback_saml_dublet(uuid, uuid) to authenticated;

-- ===========================================================================
-- 4) Fortryd
-- ===========================================================================
create or replace function public.feedback_fortryd_sammenlaegning(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.issue_sammenlaegninger%rowtype;
  v_d uuid;
  v_o uuid;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderatorer kan fortryde en sammenlaegning.';
  end if;

  select * into s from public.issue_sammenlaegninger where id = p_id for update;
  if s.id is null then
    raise exception 'Sammenlaegningen findes ikke.';
  end if;
  if s.fortrudt_at is not null then
    raise exception 'Sammenlaegningen er allerede fortrudt.';
  end if;
  v_d := s.dublet_id;
  v_o := s.original_id;

  perform 1 from public.issues where id in (v_d, v_o) order by id for update;
  if not exists (select 1 from public.issues where id = v_d and sammenlagt_i = v_o) then
    raise exception 'Dubletten peger ikke laengere paa originalen - fortryd manuelt.';
  end if;

  perform set_config('p43.rpc', '1', true);

  -- a) Flyttede stemmer tilbage (dem der stadig ligger på originalen; har
  --    bilen i mellemtiden stemt på den skjulte dublet, bliver rækken).
  update public.confirmations c set issue_id = v_d
  where c.issue_id = v_o
    and c.id in (select (x #>> '{}')::uuid from jsonb_array_elements(s.flyttet->'stemmer') x)
    and not exists (
      select 1 from public.confirmations y
      where y.issue_id = v_d and c.car_id is not null and y.car_id = c.car_id
    );

  -- b) Droppede (dedupe) stemmer genskabes på dubletten, hvis bruger/bil findes.
  insert into public.confirmations
  select (jsonb_populate_record(null::public.confirmations, r)).*
  from jsonb_array_elements(s.flyttet->'droppede_stemmer') r
  where exists (select 1 from public.profiles p where p.id = (r->>'user_id')::uuid)
    and exists (select 1 from public.models m where m.id = (r->>'model_id')::uuid)
    and (r->>'car_id' is null or exists (select 1 from public.cars ca where ca.id = (r->>'car_id')::uuid))
    and (r->>'variant_id' is null or exists (select 1 from public.variants v where v.id = (r->>'variant_id')::uuid))
    and (r->>'software_version_id' is null
         or exists (select 1 from public.software_versions sv where sv.id = (r->>'software_version_id')::uuid))
  on conflict do nothing;

  -- c) Kommentarer.
  update public.comments set issue_id = v_d
  where issue_id = v_o
    and id in (select (x #>> '{}')::uuid from jsonb_array_elements(s.flyttet->'kommentarer') x);

  -- d) Billeder med deres oprindelige rækkefølge.
  update public.issue_images b
  set issue_id = v_d, display_order = (x->>'order')::int
  from jsonb_array_elements(s.flyttet->'billeder') x
  where b.id = (x->>'id')::uuid and b.issue_id = v_o;

  -- e) Arvede modeller fjernes igen - medmindre originalen stadig har en
  --    stemme fra den model.
  delete from public.issue_models im
  where im.issue_id = v_o
    and im.model_id in (select (x #>> '{}')::uuid from jsonb_array_elements(s.flyttet->'modeller') x)
    and not exists (
      select 1 from public.confirmations c where c.issue_id = v_o and c.model_id = im.model_id
    );

  -- f) Vis dubletten igen.
  update public.issues set sammenlagt_i = null where id = v_d;

  update public.issue_sammenlaegninger
  set fortrudt_at = now(), fortrudt_af = auth.uid()
  where id = s.id;

  perform set_config('p43.rpc', '', true);
end;
$$;

revoke all on function public.feedback_fortryd_sammenlaegning(bigint) from public, anon;
grant execute on function public.feedback_fortryd_sammenlaegning(bigint) to authenticated;

-- ===========================================================================
-- 5) Liste til Værkstedet (aktive sammenlægninger, nyeste først)
-- ===========================================================================
create or replace function public.feedback_sammenlaegninger(p_limit int default 50)
returns table (
  id bigint,
  created_at timestamptz,
  aktoer_navn text,
  dublet_id uuid,
  dublet_titel text,
  original_id uuid,
  original_titel text,
  antal_stemmer int,
  antal_droppede int,
  antal_kommentarer int,
  antal_billeder int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id, s.created_at, p.display_name,
    s.dublet_id, d.title, s.original_id, o.title,
    jsonb_array_length(s.flyttet->'stemmer'),
    jsonb_array_length(s.flyttet->'droppede_stemmer'),
    jsonb_array_length(s.flyttet->'kommentarer'),
    jsonb_array_length(s.flyttet->'billeder')
  from public.issue_sammenlaegninger s
  join public.issues d on d.id = s.dublet_id
  join public.issues o on o.id = s.original_id
  left join public.profiles p on p.id = s.aktoer
  where s.fortrudt_at is null
    and public.er_moderator()
  order by s.created_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke all on function public.feedback_sammenlaegninger(int) from public, anon;
grant execute on function public.feedback_sammenlaegninger(int) to authenticated;

-- ===========================================================================
-- 6) Rapporten tæller ikke skjulte dubletter (definitionerne er kopieret
--    ordret fra 20261120210000_legacy_import.sql + "sammenlagt_i is null").
-- ===========================================================================
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
  where i.sammenlagt_i is null
    and (p_type = 'begge' or i.type::text = p_type)
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

create or replace function public.dan_rapport_markering(p_type text, p_kun_aendrede boolean, p_antal int)
returns int language plpgsql security definer set search_path = public as $$
declare v_ids uuid[]; v_snapshot jsonb; v_navn text;
begin
  if not public.er_admin() then raise exception 'Kun admin kan danne rapporten'; end if;
  select array_agg(x.id), jsonb_agg(jsonb_build_object('id', x.id, 'ps', x.sidst_sendt_stemmer, 'pd', x.sidst_sendt_dato))
  into v_ids, v_snapshot from (
    select i.id, i.sidst_sendt_stemmer, i.sidst_sendt_dato from public.issues i
    where i.sammenlagt_i is null
      and (p_type = 'begge' or i.type::text = p_type)
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
    'nye', (select count(*) from public.issues i where i.sammenlagt_i is null and i.sidst_sendt_dato is null),
    'eskaleret', (select count(*) from public.issues i where i.sammenlagt_i is null and i.sidst_sendt_dato is not null
      and ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0)) > coalesce(i.sidst_sendt_stemmer, 0)),
    'ekstra_stemmer', (select coalesce(sum(greatest(0,
      ((select count(*) from public.confirmations c where c.issue_id = i.id) + coalesce(i.legacy_stemmer,0)) - coalesce(i.sidst_sendt_stemmer, 0))), 0)
      from public.issues i where i.sammenlagt_i is null and i.sidst_sendt_dato is not null));
$$;

-- ===========================================================================
-- 7) Bugherrer-synken: en importeret ORIGINAL kan have fået kommentarer lagt
--    ind (også en slettet brugers, author_id null). Synkens "ryd importerede
--    kommentarer og genindsæt" må ikke slette dem. Funktionen er kopieret
--    ordret fra 20261121090000_sync_import.sql - kun delete-linjen er ændret.
-- ===========================================================================
create or replace function public.sync_import_bugherrer(p_data jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb;
  k jsonb;
  v_issue uuid;
  v_model uuid;
  n int := 0;
begin
  for m in select * from jsonb_array_elements(p_data) loop
    insert into public.issues (
      legacy_bugherrer_id, type, title, description, status,
      software_version, phone_model, phone_os, created_at,
      legacy_stemmer, legacy_biler, sidst_sendt_stemmer, sidst_sendt_dato
    )
    values (
      (m->>'legacy_bugherrer_id')::int,
      (m->>'type')::public.issue_type,
      m->>'title', m->>'description',
      (m->>'status')::public.issue_status,
      m->>'software_version', m->>'phone_model', m->>'phone_os',
      (m->>'created_at')::timestamptz,
      coalesce((m->>'legacy_stemmer')::int, 0),
      coalesce(m->'legacy_biler', '[]'::jsonb),
      nullif(m->>'sidst_sendt_stemmer', '')::int,
      nullif(m->>'sidst_sendt_dato', '')::timestamptz
    )
    on conflict (legacy_bugherrer_id) where legacy_bugherrer_id is not null do update set
      type = excluded.type, title = excluded.title, description = excluded.description,
      status = excluded.status, software_version = excluded.software_version,
      phone_model = excluded.phone_model, phone_os = excluded.phone_os,
      legacy_stemmer = excluded.legacy_stemmer, legacy_biler = excluded.legacy_biler,
      sidst_sendt_stemmer = excluded.sidst_sendt_stemmer, sidst_sendt_dato = excluded.sidst_sendt_dato
    returning id into v_issue;

    -- model-kobling
    select id into v_model from public.models where slug = m->>'model_slug';
    if v_model is not null then
      insert into public.issue_models (issue_id, model_id)
      values (v_issue, v_model) on conflict do nothing;
    end if;

    -- kommentarer: ryd tidligere importerede (author_id null) og genindsæt.
    -- P43: undtagen kommentarer der er lagt ind fra en sammenlagt dublet.
    delete from public.comments c
    where c.author_id is null and c.issue_id = v_issue
      and not exists (
        select 1 from public.issue_sammenlaegninger s
        where s.original_id = v_issue and s.fortrudt_at is null
          and s.flyttet->'kommentarer' ? c.id::text
      );
    for k in select * from jsonb_array_elements(coalesce(m->'comments', '[]'::jsonb)) loop
      insert into public.comments (issue_id, author_navn, body, is_solution, created_at)
      values (
        v_issue, k->>'navn', k->>'tekst',
        coalesce((k->>'is_solution')::boolean, false),
        coalesce((k->>'created_at')::timestamptz, now())
      );
    end loop;

    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.sync_import_bugherrer(jsonb) from public;
grant execute on function public.sync_import_bugherrer(jsonb) to service_role;

-- Kontrol (valgfri):
-- select count(*) filter (where sammenlagt_i is not null) as skjulte, count(*) from public.issues;
-- select * from public.issue_sammenlaegninger order by id desc limit 5;
