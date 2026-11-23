-- Zeekr Garage - Admin-styrede links paa links-siden (P19)
-- ---------------------------------------------------------------------------
-- Links-siden (app/links/page.tsx) var fuldt hardcodet i konstanten
-- LINK_GRUPPER. Torben kunne ikke tilfoeje/redigere/omsortere links uden en
-- kodeaendring. Dette flytter links + grupper i DB med admin-CRUD i Vaerkstedet,
-- paa linje med kategori-editoren (P7) og Modeller-panelet (P17/P18).
--
-- STRUKTUR (valgt med Torben 23-11): emne-grupper som i dag (Officielt, Specs &
-- test, Koeb/pris/leasing, Tilbehoer, Praktisk) + VALGFRIE model-tags pr. link.
-- Et link kan baere 0..n modeller (link_models-kobling): 0 = "gaelder alle",
-- 1 = model-specifik side, n = en samlet side der daekker flere modeller (fx en
-- forhandler/webshop der foerer udvalgte modeller - de faar et badge hver, og
-- linket staar kun EEN gang i stedet for en raekke pr. model). Et model-filter
-- paa /links taendes naar >= 2 modeller er repraesenteret - uden ny migration.
-- Samme logik som forum-IA'en (emne = gruppe, model = filter); vi undgaar
-- model x emne-nestning ("tomme rum"), som forummet bevidst fravalgte.
--
-- MOENSTER (som P17/P18): offentlig laesning (RLS select using(true)); ALLE
-- skrivninger gaar gennem security-definer RPC'er der er er_admin()-gated, saa
-- tabellerne beholder ren laese-RLS (ingen insert/update/delete-policy).
--
-- Idempotent: create table if not exists + create or replace function. Seed'en
-- koerer kun naar tabellerne er TOMME (where not exists), saa gentaget koersel
-- ikke dubler.

-- ===========================================================================
-- 1) Skema: link_groups + links + link_models (mange-til-mange mod models).
--    link_models ON DELETE CASCADE begge veje => sletter man en model, falder
--    dens tag af linkene (de bliver "gaelder alle" hvis det var det sidste tag),
--    men linket forsvinder ikke.
-- ===========================================================================
create table if not exists public.link_groups (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null,
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.links (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.link_groups(id) on delete cascade,
  navn          text not null,
  kilde         text,
  url           text not null,
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists links_group_idx on public.links(group_id);

create table if not exists public.link_models (
  link_id  uuid not null references public.links(id)  on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  primary key (link_id, model_id)
);
create index if not exists link_models_model_idx on public.link_models(model_id);

-- ===========================================================================
-- 2) RLS: offentlig laesning (som resten af sitet). Ingen skrive-policy =>
--    skrivning kun via security-definer RPC'erne nedenfor.
-- ===========================================================================
alter table public.link_groups enable row level security;
alter table public.links        enable row level security;
alter table public.link_models  enable row level security;

drop policy if exists link_groups_laes on public.link_groups;
create policy link_groups_laes on public.link_groups for select using (true);
drop policy if exists links_laes on public.links;
create policy links_laes on public.links for select using (true);
drop policy if exists link_models_laes on public.link_models;
create policy link_models_laes on public.link_models for select using (true);

-- ===========================================================================
-- 3) RPC'er: GRUPPER (admin-only). Opret / rediger / slet (kun tom) / flyt.
-- ===========================================================================
create or replace function public.admin_opret_link_gruppe(p_titel text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_titel text; v_ord int; v_id uuid;
begin
  if not public.er_admin() then raise exception 'Kun admin kan oprette link-grupper.'; end if;
  v_titel := btrim(p_titel);
  if v_titel = '' then raise exception 'Giv gruppen en titel.'; end if;
  select coalesce(max(display_order), 0) + 10 into v_ord from public.link_groups;
  insert into public.link_groups (titel, display_order) values (v_titel, v_ord) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_rediger_link_gruppe(p_id uuid, p_titel text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_titel text;
begin
  if not public.er_admin() then raise exception 'Kun admin kan redigere link-grupper.'; end if;
  v_titel := btrim(p_titel);
  if v_titel = '' then raise exception 'Titlen maa ikke vaere tom.'; end if;
  update public.link_groups set titel = v_titel where id = p_id;
end;
$$;

create or replace function public.admin_slet_link_gruppe(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare n_links bigint;
begin
  if not public.er_admin() then raise exception 'Kun admin kan slette link-grupper.'; end if;
  select count(*) into n_links from public.links where group_id = p_id;
  if n_links > 0 then raise exception 'Gruppen har % link(s) - flyt eller slet dem foerst.', n_links; end if;
  delete from public.link_groups where id = p_id;
end;
$$;

create or replace function public.admin_flyt_link_gruppe(p_id uuid, p_op boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_ord int; v_nabo_id uuid; v_nabo_ord int;
begin
  if not public.er_admin() then raise exception 'Kun admin kan omsortere link-grupper.'; end if;
  select display_order into v_ord from public.link_groups where id = p_id;
  if v_ord is null then raise exception 'Gruppen findes ikke.'; end if;
  if p_op then
    select id, display_order into v_nabo_id, v_nabo_ord from public.link_groups
      where display_order < v_ord order by display_order desc limit 1;
  else
    select id, display_order into v_nabo_id, v_nabo_ord from public.link_groups
      where display_order > v_ord order by display_order asc limit 1;
  end if;
  if v_nabo_id is null then return; end if;
  update public.link_groups set display_order = v_nabo_ord where id = p_id;
  update public.link_groups set display_order = v_ord      where id = v_nabo_id;
end;
$$;

-- ===========================================================================
-- 4) RPC'er: LINKS (admin-only). model-tags gives som uuid[] (0..n modeller).
--    Intern helper saetter link_models = netop de givne (eksisterende) modeller.
-- ===========================================================================
create or replace function public.saet_link_modeller(p_link_id uuid, p_model_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.link_models where link_id = p_link_id;
  if p_model_ids is not null and array_length(p_model_ids, 1) is not null then
    -- Kun eksisterende model-id'er (ukendte ignoreres i stedet for FK-fejl).
    insert into public.link_models (link_id, model_id)
    select p_link_id, mid
    from unnest(p_model_ids) as mid
    where exists (select 1 from public.models m where m.id = mid)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.admin_opret_link(
  p_group_id uuid,
  p_navn     text,
  p_kilde    text,
  p_url      text,
  p_model_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_navn text; v_url text; v_ord int; v_id uuid;
begin
  if not public.er_admin() then raise exception 'Kun admin kan oprette links.'; end if;
  v_navn := btrim(p_navn); v_url := btrim(p_url);
  if v_navn = '' then raise exception 'Giv linket et navn.'; end if;
  if v_url  = '' then raise exception 'Giv linket en URL.'; end if;
  if not exists (select 1 from public.link_groups where id = p_group_id) then
    raise exception 'Gruppen findes ikke.';
  end if;
  select coalesce(max(display_order), 0) + 10 into v_ord from public.links where group_id = p_group_id;
  insert into public.links (group_id, navn, kilde, url, display_order)
  values (p_group_id, v_navn, nullif(btrim(p_kilde), ''), v_url, v_ord)
  returning id into v_id;
  perform public.saet_link_modeller(v_id, p_model_ids);
  return v_id;
end;
$$;

create or replace function public.admin_rediger_link(
  p_id       uuid,
  p_navn     text,
  p_kilde    text,
  p_url      text,
  p_model_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_navn text; v_url text;
begin
  if not public.er_admin() then raise exception 'Kun admin kan redigere links.'; end if;
  v_navn := btrim(p_navn); v_url := btrim(p_url);
  if v_navn = '' then raise exception 'Giv linket et navn.'; end if;
  if v_url  = '' then raise exception 'Giv linket en URL.'; end if;
  update public.links
     set navn = v_navn, kilde = nullif(btrim(p_kilde), ''), url = v_url
   where id = p_id;
  perform public.saet_link_modeller(p_id, p_model_ids);
end;
$$;

create or replace function public.admin_slet_link(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.er_admin() then raise exception 'Kun admin kan slette links.'; end if;
  delete from public.links where id = p_id;  -- link_models cascader
end;
$$;

create or replace function public.admin_flyt_link(p_id uuid, p_op boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_group uuid; v_ord int; v_nabo_id uuid; v_nabo_ord int;
begin
  if not public.er_admin() then raise exception 'Kun admin kan omsortere links.'; end if;
  select group_id, display_order into v_group, v_ord from public.links where id = p_id;
  if v_group is null then raise exception 'Linket findes ikke.'; end if;
  if p_op then
    select id, display_order into v_nabo_id, v_nabo_ord from public.links
      where group_id = v_group and display_order < v_ord order by display_order desc limit 1;
  else
    select id, display_order into v_nabo_id, v_nabo_ord from public.links
      where group_id = v_group and display_order > v_ord order by display_order asc limit 1;
  end if;
  if v_nabo_id is null then return; end if;
  update public.links set display_order = v_nabo_ord where id = p_id;
  update public.links set display_order = v_ord      where id = v_nabo_id;
end;
$$;

create or replace function public.admin_flyt_link_til_gruppe(p_id uuid, p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_ord int;
begin
  if not public.er_admin() then raise exception 'Kun admin kan flytte links.'; end if;
  if not exists (select 1 from public.links where id = p_id) then raise exception 'Linket findes ikke.'; end if;
  if not exists (select 1 from public.link_groups where id = p_group_id) then raise exception 'Gruppen findes ikke.'; end if;
  select coalesce(max(display_order), 0) + 10 into v_ord from public.links where group_id = p_group_id;
  update public.links set group_id = p_group_id, display_order = v_ord where id = p_id;
end;
$$;

-- Rettigheder: kun authenticated kan kalde (og kun admin slipper forbi
-- er_admin()-tjekket indeni). saet_link_modeller er en intern helper - ingen
-- grant (kaldes kun af de to definer-funktioner).
revoke all on function public.saet_link_modeller(uuid, uuid[])              from public;
revoke all on function public.admin_opret_link_gruppe(text)                 from public;
revoke all on function public.admin_rediger_link_gruppe(uuid, text)         from public;
revoke all on function public.admin_slet_link_gruppe(uuid)                  from public;
revoke all on function public.admin_flyt_link_gruppe(uuid, boolean)         from public;
revoke all on function public.admin_opret_link(uuid, text, text, text, uuid[])    from public;
revoke all on function public.admin_rediger_link(uuid, text, text, text, uuid[])  from public;
revoke all on function public.admin_slet_link(uuid)                         from public;
revoke all on function public.admin_flyt_link(uuid, boolean)                from public;
revoke all on function public.admin_flyt_link_til_gruppe(uuid, uuid)        from public;

grant execute on function public.admin_opret_link_gruppe(text)                 to authenticated;
grant execute on function public.admin_rediger_link_gruppe(uuid, text)         to authenticated;
grant execute on function public.admin_slet_link_gruppe(uuid)                  to authenticated;
grant execute on function public.admin_flyt_link_gruppe(uuid, boolean)         to authenticated;
grant execute on function public.admin_opret_link(uuid, text, text, text, uuid[])    to authenticated;
grant execute on function public.admin_rediger_link(uuid, text, text, text, uuid[])  to authenticated;
grant execute on function public.admin_slet_link(uuid)                         to authenticated;
grant execute on function public.admin_flyt_link(uuid, boolean)                to authenticated;
grant execute on function public.admin_flyt_link_til_gruppe(uuid, uuid)        to authenticated;

-- ===========================================================================
-- 5a) Seed-grupper (kun naar tabellen er tom).
-- ===========================================================================
insert into public.link_groups (titel, display_order)
select v.titel, v.display_order
from (values
  ('Officielt fra Zeekr',   10),
  ('Specs & test',          20),
  ('Køb, pris & leasing',   30),
  ('Tilbehør & dele',       40),
  ('Praktisk & fællesskab', 50)
) as v(titel, display_order)
where not exists (select 1 from public.link_groups);

-- ===========================================================================
-- 5b) Seed-links (kun naar tabellen er tom). url er unik i seed'en og bruges
--     som noegle til at haenge model-tags paa i 5c.
-- ===========================================================================
insert into public.links (group_id, navn, kilde, url, display_order)
select g.id, d.navn, d.kilde, d.url, d.display_order
from (values
  ('Officielt fra Zeekr', 'Officiel modelside',       'zeekr.eu',                 'https://www.zeekr.eu/da-dk/models/9x',  10),
  ('Officielt fra Zeekr', 'Officiel modelside',       'zeekr.eu',                 'https://www.zeekr.eu/da-dk/models/7x',  20),
  ('Officielt fra Zeekr', 'Officiel modelside',       'zeekr.eu',                 'https://www.zeekr.eu/da-dk/models/7gt', 30),
  ('Officielt fra Zeekr', 'Officiel modelside',       'zeekr.eu',                 'https://www.zeekr.eu/da-dk/models/x',   40),
  ('Officielt fra Zeekr', 'Officiel modelside',       'zeekr.eu',                 'https://www.zeekr.eu/da-dk/models/001', 50),
  ('Officielt fra Zeekr', 'Connected Services',       'zeekr.eu',                 'https://www.zeekr.eu/da-dk/connected',  60),
  ('Officielt fra Zeekr', 'Brugermanualer & kontakt', 'zeekr.eu · alle modeller', 'https://www.zeekr.eu/da-dk/contact',    70),

  ('Specs & test', 'Tekniske detaljer', 'evkx.net',         'https://evkx.net/da/models/zeekr/7gt/7gt_privilege_awd/specifications/',                10),
  ('Specs & test', 'Anmeldelse & test', 'blog.bilbasen.dk', 'https://blog.bilbasen.dk/test-zeekr-7gt-kan-noget-kinesiske-elbiler-sjaeldent-mestrer', 20),
  ('Specs & test', 'Test & anmeldelse', 'fdm.dk',           'https://fdm.dk/tests/biltest/zeekr-7x-europaeisk-dna-kinesisk-elbil',                   30),
  ('Specs & test', 'Test & anmeldelse', 'fdm.dk',           'https://fdm.dk/tests/proevekoersel/2023-11-zeekr-x-vild-snusfornuftig-suv',             40),
  ('Specs & test', 'Test & anmeldelse', 'fdm.dk',           'https://fdm.dk/tests/biltest/zeekr-001-mere-komfort-end-teknik',                        50),

  ('Køb, pris & leasing', 'Pris & info',       'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/7gt/',                          10),
  ('Køb, pris & leasing', 'Pris & info',       'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/7x/',                           20),
  ('Køb, pris & leasing', 'Pris & info',       'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/x/',                            30),
  ('Køb, pris & leasing', 'Pris & info',       'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/001/',                          40),
  ('Køb, pris & leasing', 'Pris & info',       'viabiler.dk', 'https://www.viabiler.dk/zeekr/nye-biler/9x/',                           50),
  ('Køb, pris & leasing', 'Erhverv & leasing', 'viabiler.dk', 'https://www.viabiler.dk/fleet-info/zeekr-fleet/zeekr-7gt/',             60),
  ('Køb, pris & leasing', 'Privatleasing',     'autohus.dk',  'https://www.autohus.dk/vi-tilbyder/privatleasing/zeekr-privatleasing/', 70),
  ('Køb, pris & leasing', 'Nye biler',         'autohus.dk',  'https://www.autohus.dk/nye-biler/zeekr/#nye',                           80),
  ('Køb, pris & leasing', 'Biler på markedet', 'bilbasen.dk', 'https://www.bilbasen.dk/brugt/bil/zeekr',                               90),

  ('Tilbehør & dele', 'Eftermarkedsudstyr',           'evstitan.com',    'https://www.evstitan.com/collections/zeekr-accessories',      10),
  ('Tilbehør & dele', 'Eftermarkedsudstyr (globalt)', 'niceevs.com',     'https://niceevs.com/collections/zeekr-7gt-accessories',       20),
  ('Tilbehør & dele', 'Fælge & dæk',                  'keratech.dk',     'https://keratech.dk/',                                        30),
  ('Tilbehør & dele', 'Vinduesviskere',               'viskerbladet.dk', 'https://www.viskerbladet.dk/a620s-bosch-aerotwin-viskerblade-fladblade-vinduesvisker-saet', 40),

  ('Praktisk & fællesskab', 'Fragt- & biltracking',    'hoeghautoliners.com', 'https://www.hoeghautoliners.com/my-cargo',                    10),
  ('Praktisk & fællesskab', 'Fællesskab & erfaringer', 'Facebook-gruppe',     'https://www.facebook.com/share/g/1DVmwAa8hR/?mibextid=wwXIfr', 20)
) as d(gruppe, navn, kilde, url, display_order)
join public.link_groups g on g.titel = d.gruppe
where not exists (select 1 from public.links);

-- ===========================================================================
-- 5c) Seed-model-tags: (url, model_slug). Et link kan optraede flere gange
--     (evstitan daekker 4 modeller => 4 badges, EEN raekke paa siden). Links
--     uden en raekke her = "gaelder alle".
-- ===========================================================================
insert into public.link_models (link_id, model_id)
select l.id, m.id
from (values
  ('https://www.zeekr.eu/da-dk/models/9x',  'zeekr-9x'),
  ('https://www.zeekr.eu/da-dk/models/7x',  'zeekr-7x'),
  ('https://www.zeekr.eu/da-dk/models/7gt', 'zeekr-7gt'),
  ('https://www.zeekr.eu/da-dk/models/x',   'zeekr-x'),
  ('https://www.zeekr.eu/da-dk/models/001', 'zeekr-001'),

  ('https://evkx.net/da/models/zeekr/7gt/7gt_privilege_awd/specifications/', 'zeekr-7gt'),
  ('https://blog.bilbasen.dk/test-zeekr-7gt-kan-noget-kinesiske-elbiler-sjaeldent-mestrer', 'zeekr-7gt'),
  ('https://fdm.dk/tests/biltest/zeekr-7x-europaeisk-dna-kinesisk-elbil',       'zeekr-7x'),
  ('https://fdm.dk/tests/proevekoersel/2023-11-zeekr-x-vild-snusfornuftig-suv', 'zeekr-x'),
  ('https://fdm.dk/tests/biltest/zeekr-001-mere-komfort-end-teknik',            'zeekr-001'),

  ('https://www.viabiler.dk/zeekr/nye-biler/7gt/', 'zeekr-7gt'),
  ('https://www.viabiler.dk/zeekr/nye-biler/7x/',  'zeekr-7x'),
  ('https://www.viabiler.dk/zeekr/nye-biler/x/',   'zeekr-x'),
  ('https://www.viabiler.dk/zeekr/nye-biler/001/', 'zeekr-001'),
  ('https://www.viabiler.dk/zeekr/nye-biler/9x/',  'zeekr-9x'),
  ('https://www.viabiler.dk/fleet-info/zeekr-fleet/zeekr-7gt/', 'zeekr-7gt'),

  -- Samlet evstitan-side: badges for de modeller de foerer.
  ('https://www.evstitan.com/collections/zeekr-accessories', 'zeekr-7gt'),
  ('https://www.evstitan.com/collections/zeekr-accessories', 'zeekr-7x'),
  ('https://www.evstitan.com/collections/zeekr-accessories', 'zeekr-x'),
  ('https://www.evstitan.com/collections/zeekr-accessories', 'zeekr-001'),

  ('https://niceevs.com/collections/zeekr-7gt-accessories', 'zeekr-7gt'),
  ('https://www.viskerbladet.dk/a620s-bosch-aerotwin-viskerblade-fladblade-vinduesvisker-saet', 'zeekr-7gt')
) as d(url, model_slug)
join public.links  l on l.url = d.url
join public.models m on m.slug = d.model_slug
where not exists (select 1 from public.link_models);
