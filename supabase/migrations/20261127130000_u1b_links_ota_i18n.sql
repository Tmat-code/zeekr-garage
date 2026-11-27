-- Zeekr Garage - UI-i18n skive U1b: DB-indhold paa /links + /software (27-11-2026)
-- ---------------------------------------------------------------------------
-- Live-tjekket af U1 (27-11) viste at /links og /software stod danske paa sv/en,
-- fordi indholdet ligger i DB. To dele:
--
-- (a) LINKS = felter pr. sprog (manuelt, pro-kvalitet). Korte etiketter som
--     "Pris & info" maskinoversaettes daarligt, saa staben skriver dem selv.
--     `oversaettelser jsonb` paa link_groups (titel) og links (navn, kilde):
--       {"sv": {"navn": "...", "kilde": "..."}, "en": {...}}
--     Manglende/tomt felt = dansk fallback. Samme jsonb-moenster som U7 (kategorier,
--     regler, forside-besked) skal genbruge. Seed af sv+en for ALLE nuvaerende
--     grupper/links, matchet paa den DANSKE tekst - og KUN paa raekker hvis
--     oversaettelser stadig er tom ('{}'), saa en genkoersel (eller en raekke staben
--     allerede har oversat i editoren) aldrig overskrives.
--
-- (b) OTA-NOTER = maskinoversat (rapportens da->en/sv-pipeline med ordliste/term-
--     beskyttelse) + "Vis original". Cache-tabel `ota_oversaettelser` keyet paa
--     (update_id, sprog) + kilde_hash (fanger redigering + motor-skift). PRIVAT
--     tabel (RLS uden policies) - kun service-role laeser/skriver server-side, som
--     forum_post_translations (trin 3): laeseren af /software er ofte anonym.
--
-- Idempotent: add column if not exists, create table if not exists, create or
-- replace function, drop function if exists (signatur-skift), seed kun paa '{}'.

-- ===========================================================================
-- 1) Kolonner. not null default '{}' => eksisterende raekker faar '{}' straks.
--    Check: altid et json-objekt (aldrig array/streng/null).
-- ===========================================================================
alter table public.link_groups
  add column if not exists oversaettelser jsonb not null default '{}'::jsonb;
alter table public.links
  add column if not exists oversaettelser jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'link_groups_oversaettelser_objekt') then
    alter table public.link_groups add constraint link_groups_oversaettelser_objekt
      check (jsonb_typeof(oversaettelser) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'links_oversaettelser_objekt') then
    alter table public.links add constraint links_oversaettelser_objekt
      check (jsonb_typeof(oversaettelser) = 'object');
  end if;
end $$;

-- ===========================================================================
-- 2) Rensning (genbrugelig til U7): behold KUN sprogene sv/en og de navngivne
--    felter; hver vaerdi trimmes, tomme droppes, max 300 tegn. Et sprog uden
--    felter udelades helt. Alt andet (ukendte noegler, ikke-strenge) smides vaek.
-- ===========================================================================
create or replace function public.rens_oversaettelser(p jsonb, p_felter text[])
returns jsonb
language plpgsql
immutable
as $$
declare
  ud jsonb := '{}'::jsonb;
  s text;
  f text;
  v text;
  sprog_obj jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return '{}'::jsonb;
  end if;
  foreach s in array array['sv', 'en'] loop
    sprog_obj := '{}'::jsonb;
    if jsonb_typeof(p -> s) = 'object' then
      foreach f in array p_felter loop
        if jsonb_typeof(p -> s -> f) = 'string' then
          v := left(btrim(p -> s ->> f), 300);
          if v <> '' then
            sprog_obj := sprog_obj || jsonb_build_object(f, v);
          end if;
        end if;
      end loop;
    end if;
    if sprog_obj <> '{}'::jsonb then
      ud := ud || jsonb_build_object(s, sprog_obj);
    end if;
  end loop;
  return ud;
end;
$$;

-- ===========================================================================
-- 3) RPC'er med oversaettelser. Signaturen aendres (ny parameter), saa de gamle
--    droppes foerst - ellers ville PostgREST se to overloads. Den nye parameter
--    har default null, saa kode der endnu ikke sender den virker uaendret:
--      opret: null => '{}'      rediger: null => oversaettelser roeres ikke.
--    Gating (er_admin) og validering er de samme som i P19.
-- ===========================================================================
drop function if exists public.admin_opret_link_gruppe(text);
create or replace function public.admin_opret_link_gruppe(
  p_titel          text,
  p_oversaettelser jsonb default null
)
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
  insert into public.link_groups (titel, display_order, oversaettelser)
  values (v_titel, v_ord, public.rens_oversaettelser(p_oversaettelser, array['titel']))
  returning id into v_id;
  return v_id;
end;
$$;

drop function if exists public.admin_rediger_link_gruppe(uuid, text);
create or replace function public.admin_rediger_link_gruppe(
  p_id             uuid,
  p_titel          text,
  p_oversaettelser jsonb default null
)
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
  update public.link_groups
     set titel = v_titel,
         oversaettelser = case when p_oversaettelser is null then oversaettelser
                               else public.rens_oversaettelser(p_oversaettelser, array['titel']) end
   where id = p_id;
end;
$$;

drop function if exists public.admin_opret_link(uuid, text, text, text, uuid[]);
create or replace function public.admin_opret_link(
  p_group_id       uuid,
  p_navn           text,
  p_kilde          text,
  p_url            text,
  p_model_ids      uuid[] default '{}',
  p_oversaettelser jsonb  default null
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
  insert into public.links (group_id, navn, kilde, url, display_order, oversaettelser)
  values (p_group_id, v_navn, nullif(btrim(p_kilde), ''), v_url, v_ord,
          public.rens_oversaettelser(p_oversaettelser, array['navn', 'kilde']))
  returning id into v_id;
  perform public.saet_link_modeller(v_id, p_model_ids);
  return v_id;
end;
$$;

drop function if exists public.admin_rediger_link(uuid, text, text, text, uuid[]);
create or replace function public.admin_rediger_link(
  p_id             uuid,
  p_navn           text,
  p_kilde          text,
  p_url            text,
  p_model_ids      uuid[] default '{}',
  p_oversaettelser jsonb  default null
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
     set navn = v_navn,
         kilde = nullif(btrim(p_kilde), ''),
         url = v_url,
         oversaettelser = case when p_oversaettelser is null then oversaettelser
                               else public.rens_oversaettelser(p_oversaettelser, array['navn', 'kilde']) end
   where id = p_id;
  perform public.saet_link_modeller(p_id, p_model_ids);
end;
$$;

-- RPC'erne kaldes af indloggede (admin) - samme grants som P19 (authenticated).
revoke all on function public.admin_opret_link_gruppe(text, jsonb)                         from public, anon;
revoke all on function public.admin_rediger_link_gruppe(uuid, text, jsonb)                 from public, anon;
revoke all on function public.admin_opret_link(uuid, text, text, text, uuid[], jsonb)      from public, anon;
revoke all on function public.admin_rediger_link(uuid, text, text, text, uuid[], jsonb)    from public, anon;
grant execute on function public.admin_opret_link_gruppe(text, jsonb)                      to authenticated;
grant execute on function public.admin_rediger_link_gruppe(uuid, text, jsonb)              to authenticated;
grant execute on function public.admin_opret_link(uuid, text, text, text, uuid[], jsonb)   to authenticated;
grant execute on function public.admin_rediger_link(uuid, text, text, text, uuid[], jsonb) to authenticated;

-- ===========================================================================
-- 4) Seed sv+en for de nuvaerende grupper/links, matchet paa DANSK tekst (samme
--    tabel som kode-fallbacken i lib/links-oversaettelser.ts - holdes ens, det
--    tjekker scripts/i18n-test.mjs). KUN raekker med oversaettelser = '{}'.
--    Domaene-kilder (zeekr.eu, fdm.dk ...) har ingen oversaettelse => dansk
--    fallback = samme tekst.
-- ===========================================================================
with t(da, sv, en) as (
  values
    ('Officielt fra Zeekr',   'Officiellt från Zeekr',    'Official from Zeekr'),
    ('Specs & test',          'Specifikationer & tester', 'Specs & tests'),
    ('Køb, pris & leasing',   'Köp, pris & leasing',      'Buying, prices & leasing'),
    ('Tilbehør & dele',       'Tillbehör & delar',        'Accessories & parts'),
    ('Praktisk & fællesskab', 'Praktiskt & gemenskap',    'Practical & community')
)
update public.link_groups g
   set oversaettelser = jsonb_build_object('sv', jsonb_build_object('titel', t.sv),
                                           'en', jsonb_build_object('titel', t.en))
  from t
 where g.titel = t.da
   and g.oversaettelser = '{}'::jsonb;

with n(da, sv, en) as (
  values
    ('Officiel modelside',           'Officiell modellsida',             'Official model page'),
    ('Connected Services',           'Connected Services',               'Connected Services'),
    ('Brugermanualer & kontakt',     'Instruktionsböcker & kontakt',     'Owner''s manuals & contact'),
    ('Tekniske detaljer',            'Tekniska detaljer',                'Technical details'),
    ('Anmeldelse & test',            'Recension & test',                 'Review & test'),
    ('Test & anmeldelse',            'Test & recension',                 'Test & review'),
    ('Pris & info',                  'Pris & info',                      'Price & info'),
    ('Erhverv & leasing',            'Företag & leasing',                'Business & leasing'),
    ('Privatleasing',                'Privatleasing',                    'Private leasing'),
    ('Nye biler',                    'Nya bilar',                        'New cars'),
    ('Biler på markedet',            'Bilar till salu',                  'Cars for sale'),
    ('Eftermarkedsudstyr',           'Eftermarknadstillbehör',           'Aftermarket accessories'),
    ('Eftermarkedsudstyr (globalt)', 'Eftermarknadstillbehör (globalt)', 'Aftermarket accessories (global)'),
    ('Fælge & dæk',                  'Fälgar & däck',                    'Wheels & tyres'),
    ('Vinduesviskere',               'Torkarblad',                       'Wiper blades'),
    ('Fragt- & biltracking',         'Frakt- & bilspårning',             'Shipping & car tracking'),
    ('Fællesskab & erfaringer',      'Gemenskap & erfarenheter',         'Community & experiences')
),
k(da, sv, en) as (
  values
    ('zeekr.eu · alle modeller', 'zeekr.eu · alla modeller', 'zeekr.eu · all models'),
    ('Facebook-gruppe',          'Facebook-grupp',           'Facebook group')
)
update public.links l
   set oversaettelser = jsonb_strip_nulls(jsonb_build_object(
         'sv', jsonb_strip_nulls(jsonb_build_object('navn', n.sv, 'kilde', k.sv)),
         'en', jsonb_strip_nulls(jsonb_build_object('navn', n.en, 'kilde', k.en))))
  from public.links l2
  left join n on n.da = l2.navn
  left join k on k.da = l2.kilde
 where l.id = l2.id
   and l.oversaettelser = '{}'::jsonb
   and (n.da is not null or k.da is not null);

-- ===========================================================================
-- 5) OTA-oversaettelses-cache (maskinoversat changelog + note pr. sprog).
--    punkter = json-array af oversatte changelog-punkter (samme orden som
--    kildens linjer); note = oversat note eller null. kilde_hash = sha1 af
--    MOTOR_ID + changelog + note (app-side) => redigering ELLER motor-skift giver
--    cache-miss -> gen-oversaettes. Slettes opslaget, cascader cachen.
-- ===========================================================================
create table if not exists public.ota_oversaettelser (
  update_id  uuid not null references public.software_updates(id) on delete cascade,
  sprog      text not null check (sprog in ('sv', 'en')),
  kilde_hash text not null,
  punkter    jsonb not null check (jsonb_typeof(punkter) = 'array'),
  note       text,
  updated_at timestamptz not null default now(),
  primary key (update_id, sprog)
);

-- Privat: RLS uden policies => anon/authenticated kan hverken laese eller skrive.
-- Kun service-role (gaar uden om RLS) roerer tabellen, server-side i
-- lib/ota-oversaet.ts. Revoke er baelte+seler; eksplicit grant til service_role,
-- saa cachen virker uanset instansens default-privileges (som trin 3).
alter table public.ota_oversaettelser enable row level security;
revoke all on public.ota_oversaettelser from anon, authenticated;
grant select, insert, update, delete on public.ota_oversaettelser to service_role;

-- ===========================================================================
-- 6) P32-revert: oversaettelses-felterne er almindelige felt-aendringer og maa
--    fortrydes som titel/navn/kilde. Samme funktion som P32 + to raekker.
--    (`($1 ->> 'oversaettelser')::jsonb` i superadmin_revert caster rent.)
-- ===========================================================================
create or replace function public.revert_kolonne_ok(p_tabel text, p_kol text)
returns boolean
language sql
immutable
as $$
  select (p_tabel, p_kol) in (
    ('issues','status'), ('issues','severity'), ('issues','title'),
    ('issues','description'), ('issues','category'),
    ('forum_threads','title'), ('forum_threads','is_pinned'),
    ('forum_threads','is_locked'), ('forum_threads','is_removed'),
    ('forum_posts','body'), ('forum_posts','is_removed'),
    ('forum_categories','name'), ('forum_categories','description'),
    ('forum_categories','icon'), ('forum_categories','group_label'),
    ('forum_categories','group_order'), ('forum_categories','display_order'),
    ('forum_categories','is_locked'), ('forum_categories','model_id'),
    ('forum_categories','slug'),
    ('software_updates','version'), ('software_updates','released_at'),
    ('software_updates','changelog'), ('software_updates','note'),
    ('links','navn'), ('links','kilde'), ('links','url'),
    ('links','display_order'), ('links','group_id'), ('links','oversaettelser'),
    ('link_groups','titel'), ('link_groups','display_order'), ('link_groups','oversaettelser'),
    ('site_announcement','message'), ('site_announcement','active')
  );
$$;
