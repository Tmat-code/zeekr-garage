-- U3b: FLERSPROGET FEEDBACK (27-11-2026).
--
-- (a) Kildesprog pr. melding: ny kolonne issues.sprog ('da' | 'sv' | 'en').
--     Udfyldes AUTOMATISK ved INSERT af en BEFORE-trigger med en ren heuristik
--     (public.gaet_tekst_sprog - spejl af lib/kildesprog.ts), så ALLE indgange er
--     dækket: /meld, den natlige bugherrer->garage-sync (n8n) og evt. import.
--     Appen forfiner bagefter med LibreTranslate /detect når heuristikken er
--     usikker (ingen ä/ö/æ/ø og intet tydeligt stopord-flertal). Moderatorer kan
--     rette sproget i Værkstedet (eksisterende issues_update_mod-policy).
--     Eksisterende rækker backfilles én gang her.
-- (c) Cache til titel-oversættelser på boardet: issue_titel_oversaettelser,
--     PRIVAT tabel (RLS uden policies) - kun service-role læser/skriver, som
--     ota_oversaettelser og forum_post_translations.
--
-- Idempotent: create or replace / if not exists / drop trigger if exists.
-- Backfillen kører med issues' bruger-triggere slået fra, så hverken
-- updated_at (touch) eller P32-audit (zz_audit) får en række pr. melding.

-- ===========================================================================
-- 1) Heuristikken (SAMME regler og stopord som lib/kildesprog.ts).
-- ===========================================================================
create or replace function public.gaet_tekst_sprog(p_tekst text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  t text := translate(lower(coalesce(p_tekst, '')), 'ÆØÅÄÖ', 'æøåäö');
  v_sv int := 0;
  v_da int := 0;
  v_en int := 0;
  v_ord text;
  stop_sv constant text[] := array[
    'och','inte','jag','att','ett','vid','hur','utan','mycket','bara','sedan',
    'också','från','vara','fungerar','uppdatering','uppdateringen','dock','ibland',
    'alltid','ska','inga','någon','något','eftersom','endast'];
  stop_da constant text[] := array[
    'og','ikke','jeg','et','hvordan','uden','meget','bare','siden','også','fra',
    'bliver','virker','opdatering','opdateringen','af','hvis','når','altid','skal',
    'nogle','noget','lige','kun'];
  stop_en constant text[] := array[
    'the','and','is','are','was','were','not','with','this','that','have','of',
    'when','after','it','my','your','doesn','works','update','car','screen','does',
    'always','never','should','some'];
begin
  if t ~ '[äö]' then return 'sv'; end if;
  if t ~ '[æø]' then return 'da'; end if;
  for v_ord in select x from regexp_split_to_table(t, '[^a-z0-9å]+') as x loop
    if v_ord = '' then continue; end if;
    if v_ord = any(stop_sv) then v_sv := v_sv + 1;
    elsif v_ord = any(stop_da) then v_da := v_da + 1;
    elsif v_ord = any(stop_en) then v_en := v_en + 1;
    end if;
  end loop;
  -- Højeste score vinder; uafgjort i toppen (eller 0) -> dansk.
  if v_sv > v_da and v_sv > v_en then return 'sv'; end if;
  if v_en > v_da and v_en > v_sv then return 'en'; end if;
  return 'da';
end;
$$;

-- ===========================================================================
-- 2) Kolonnen + trigger.
-- ===========================================================================
alter table public.issues add column if not exists sprog text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'issues_sprog_gyldigt') then
    alter table public.issues add constraint issues_sprog_gyldigt
      check (sprog in ('da', 'sv', 'en'));
  end if;
end $$;

create or replace function public.issues_saet_sprog()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sprog is null then
    new.sprog := public.gaet_tekst_sprog(coalesce(new.title, '') || E'\n' || coalesce(new.description, ''));
  end if;
  return new;
end;
$$;

-- Navnet starter med 'a' => kører før de øvrige BEFORE INSERT-triggere.
drop trigger if exists a_issues_saet_sprog on public.issues;
create trigger a_issues_saet_sprog
  before insert on public.issues
  for each row execute function public.issues_saet_sprog();

-- ===========================================================================
-- 3) Backfill (én gang) - uden touch/audit-støj.
-- ===========================================================================
alter table public.issues disable trigger user;
update public.issues
   set sprog = public.gaet_tekst_sprog(title || E'\n' || description)
 where sprog is null;
alter table public.issues enable trigger user;

alter table public.issues alter column sprog set not null;

-- ===========================================================================
-- 4) P32-revert: en moderators sprog-rettelse er en almindelig felt-ændring.
--    Samme liste som U1b + ('issues','sprog').
-- ===========================================================================
create or replace function public.revert_kolonne_ok(p_tabel text, p_kol text)
returns boolean
language sql
immutable
as $$
  select (p_tabel, p_kol) in (
    ('issues','status'), ('issues','severity'), ('issues','title'),
    ('issues','description'), ('issues','category'), ('issues','sprog'),
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

-- ===========================================================================
-- 5) Titel-oversættelses-cache (boardet + søgningen, U3b c).
-- ===========================================================================
create table if not exists public.issue_titel_oversaettelser (
  issue_id   uuid not null references public.issues(id) on delete cascade,
  sprog      text not null check (sprog in ('da', 'sv', 'en')),
  kilde_hash text not null,
  titel      text not null,
  updated_at timestamptz not null default now(),
  primary key (issue_id, sprog)
);

alter table public.issue_titel_oversaettelser enable row level security;
revoke all on public.issue_titel_oversaettelser from anon, authenticated;
grant select, insert, update, delete on public.issue_titel_oversaettelser to service_role;

-- Kontrol (valgfri): fordelingen efter backfill.
-- select sprog, count(*) from public.issues group by sprog order by 1;
