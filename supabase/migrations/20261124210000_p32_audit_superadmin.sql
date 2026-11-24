-- Zeekr Garage - P32: audit-log + revert + superadmin (DESIGN LAAST 24-11)
-- ---------------------------------------------------------------------------
-- Formaal: superadmin (Torben alene) kan foelge HVAD moderatorer/admins piller i
-- - isaer ved et brud med en ekstern admin - og rydde op (revert af en sikker
-- delmaengde). En oversigts-log med integritet, usynlig for de admins den
-- overvaager.
--
-- DENNE FIL = HELE P32's DB-del i EEN all-or-nothing paste (Studio 8002):
--   1) rolle-model: profiles.role faar vaerdien 'superadmin'; er_admin() bliver
--      et aegte superset (admin + superadmin), ny er_superadmin(), er_moderator()
--      daekker alle tre.
--   2) BOOTSTRAP: den nuvaerende enlige admin promoveres til superadmin i SAMME
--      transaktion som rollestyringen flyttes - saa der ALDRIG er et vindue uden
--      en superadmin (ingen lockout). Er der flere end een admin, ABORTER hele
--      migrationen med en instruktion (intet anvendes); se noten nederst.
--   3) admin_audit (append-only) + generiske triggers paa scope-tabellerne, der
--      KUN logger naar aktoeren er stab (er_moderator()).
--   4) rolle-governance flyttes fra er_admin() til er_superadmin(); sanktions-
--      RPC'erne haerdes saa en superadmin heller ikke kan rammes.
--   5) moderation_log-SELECT strammes fra moderator til superadmin.
--   6) revert-RPC + audit-laese-RPC'er (superadmin-gatede).
--
-- ⚠️ DEPLOY-RAEKKEFOELGE (undtagelse fra normal "migration foer kode"):
--    Push/deploy KODEN FOER du koerer denne migration. Den gamle deployede kode
--    kender ikke 'superadmin' og vil sende dig (som ny superadmin) vaek fra
--    /admin. Naar superset-koden er live foerst, beholder du admin + faar
--    Audit-fladen. (Ingen superadmin findes foer bootstrap, saa den nye kode
--    aendrer intet for nogen foer migrationen koeres.)
--
-- Idempotent: drop-if-exists / create-or-replace hele vejen.

-- ===========================================================================
-- 1) Rolle-model: tillad 'superadmin'
-- ===========================================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'moderator', 'superadmin'));

-- er_admin() = AEGTE superset: true for baade admin og superadmin, saa Torben
-- beholder PRAECIS alle admin-rettigheder (alle eksisterende er_admin()-policies
-- og -RPC'er gaelder uaendret for superadmin).
create or replace function public.er_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'superadmin')
  );
$$;

-- er_superadmin() = kun superadmin (Torben alene). DB-only rolle.
create or replace function public.er_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  );
$$;

-- er_moderator() daekker nu alle tre stab-roller.
create or replace function public.er_moderator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'moderator', 'superadmin')
  );
$$;

-- ===========================================================================
-- 2) BOOTSTRAP + no-lockout-vaern (koeres i SAMME transaktion som governance-
--    flytningen nedenfor). Promover den ENLIGE admin til superadmin. Sikkert +
--    idempotent: koerer kun naar der er praecis EEN admin og ingen superadmin.
-- ===========================================================================
update public.profiles
set role = 'superadmin'
where role = 'admin'
  and (select count(*) from public.profiles where role = 'admin') = 1
  and not exists (select 1 from public.profiles where role = 'superadmin');

-- Vaern: naegt at committe en tilstand hvor rollestyringen er superadmin-only
-- men INGEN superadmin findes (= lockout). Ruller hele migrationen tilbage.
do $$
begin
  if not exists (select 1 from public.profiles where role = 'superadmin') then
    raise exception
      'P32 bootstrap: ingen superadmin efter auto-promote (flere end een admin?). Koer FOERST den eksplicitte e-mail-bootstrap (se noten nederst i filen / HANDOVER), og koer saa denne migration igen.';
  end if;
end $$;

-- ===========================================================================
-- 3) admin_audit - append-only oversigts-log
-- ===========================================================================
create table if not exists public.admin_audit (
  id         bigint generated always as identity primary key,
  op         text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  tabel      text not null,
  raekke_id  text,                    -- r/raekkens id som tekst (join-tabeller: null)
  old_data   jsonb,                   -- null ved INSERT
  new_data   jsonb,                   -- null ved DELETE
  aktoer     uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_aktoer_idx
  on public.admin_audit (aktoer, created_at desc);
create index if not exists admin_audit_created_idx
  on public.admin_audit (created_at desc);
create index if not exists admin_audit_tabel_idx
  on public.admin_audit (tabel, raekke_id);

-- RLS: KUN superadmin laeser. INGEN insert/update/delete-policy => ingen klient
-- (heller ikke superadmin) kan skrive/aendre/slette raekker. Kun trigger-
-- funktionen (security definer => bypasser RLS) indsaetter. = append-only.
alter table public.admin_audit enable row level security;
drop policy if exists admin_audit_select_super on public.admin_audit;
create policy admin_audit_select_super on public.admin_audit
  for select to authenticated using (public.er_superadmin());

-- Trigger-funktion: generisk capture. Logger KUN naar aktoeren er stab, saa
-- almindelig bruger-aktivitet paa de samme tabeller ikke stoejer.
create or replace function public.audit_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id  text;
begin
  -- Stab-filter: kun moderator/admin/superadmin-handlinger logges.
  if not public.er_moderator() then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD); v_new := null;
  elsif TG_OP = 'INSERT' then
    v_old := null; v_new := to_jsonb(NEW);
  else
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
  end if;

  v_id := coalesce(v_new->>'id', v_old->>'id');

  insert into public.admin_audit (op, tabel, raekke_id, old_data, new_data, aktoer)
  values (TG_OP, TG_TABLE_NAME, v_id, v_old, v_new, auth.uid());

  return coalesce(NEW, OLD);
end;
$$;

-- Triggers paa scope-tabellerne (B2). Navn 'zz_audit' => sorterer efter de
-- oevrige AFTER-triggers (fx *_notify), saa NEW afspejler slut-tilstanden.
-- IKKE paa log-/historik-tabellerne selv (admin_audit, moderation_log,
-- user_sanctions).
do $$
declare t text;
begin
  foreach t in array array[
    'issues',
    'forum_threads',
    'forum_posts',
    'forum_categories',
    'software_updates',
    'software_update_models',
    'links',
    'link_groups',
    'profiles',
    'forum_reports',
    'site_announcement',
    'messages'
  ]
  loop
    execute format('drop trigger if exists zz_audit on public.%I', t);
    execute format(
      'create trigger zz_audit after insert or update or delete on public.%I '
      || 'for each row execute function public.audit_capture()', t);
  end loop;
end $$;

-- ===========================================================================
-- 4) Rolle-governance -> superadmin-only. Admins beholder bruger-sanktioner +
--    alt andet; KUN superadmin giver/fjerner admin- og moderator-rettigheder.
-- ===========================================================================

-- pending_invitations: laesning strammes til superadmin (fodrer AdgangePanel).
drop policy if exists pending_inv_read_admin on public.pending_invitations;
create policy pending_inv_read_super on public.pending_invitations
  for select to authenticated using (public.er_superadmin());

-- admin_brugere: listen i AdgangePanel -> superadmin.
create or replace function public.admin_brugere()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  sidst_logget timestamptz,
  oprettet timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, u.email, p.display_name, p.role, u.last_sign_in_at, u.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.er_superadmin() and p.role is not null
  order by p.role, u.email;
$$;

-- admin_saet_rolle: superadmin-only. Kan IKKE saette 'superadmin' (DB-only) og
-- kan ikke aendre en superadmins rolle (beskyt den enlige superadmin).
create or replace function public.admin_saet_rolle(p_bruger uuid, p_rolle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_maal_rolle text;
begin
  if not public.er_superadmin() then raise exception 'Kun superadmin.'; end if;
  if p_rolle is not null and p_rolle not in ('admin', 'moderator') then
    raise exception 'Ugyldig rolle.';
  end if;
  select role into v_maal_rolle from public.profiles where id = p_bruger;
  if v_maal_rolle = 'superadmin' then
    raise exception 'En superadmins rolle kan ikke aendres her.';
  end if;
  update public.profiles set role = p_rolle where id = p_bruger;
end;
$$;

-- admin_inviter: superadmin-only.
create or replace function public.admin_inviter(p_email text, p_rolle text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_id uuid;
begin
  if not public.er_superadmin() then raise exception 'Kun superadmin.'; end if;
  if p_rolle not in ('admin', 'moderator') then raise exception 'Ugyldig rolle.'; end if;

  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is not null then
    update public.profiles set role = p_rolle where id = v_id;
    return 'sat';
  else
    insert into public.pending_invitations (email, role, invited_by)
    values (lower(p_email), p_rolle, auth.uid())
    on conflict (email) do update set role = excluded.role, invited_by = excluded.invited_by;
    return 'inviteret';
  end if;
end;
$$;

-- admin_fjern_invitation: superadmin-only.
create or replace function public.admin_fjern_invitation(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.er_superadmin() then raise exception 'Kun superadmin.'; end if;
  delete from public.pending_invitations where lower(email) = lower(p_email);
end;
$$;

-- ---------------------------------------------------------------------------
-- Haerd sanktions-RPC'erne (M4): en superadmin kan heller ikke rammes (foer
-- kun 'admin' blev afvist; superadmin slap igennem = en rogue admin kunne banne
-- /anonymisere superadmin). Kun maal-rolle-tjekket aendres (in ('admin',
-- 'superadmin')); logik ellers uaendret.
-- ---------------------------------------------------------------------------
create or replace function public.mod_suspender_bruger(
  p_user_id  uuid,
  p_dage     int,
  p_grund    text,
  p_fritekst text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_navn  text;
  v_rolle text;
  v_mig   uuid := auth.uid();
  v_til   timestamptz;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderator/admin.';
  end if;
  if not public.mod_gyldig_grund(p_grund) then
    raise exception 'Ugyldig grund.';
  end if;
  if p_dage is null or p_dage < 1 or p_dage > 3650 then
    raise exception 'Antal dage skal vaere mellem 1 og 3650.';
  end if;
  if p_user_id = v_mig then
    raise exception 'Du kan ikke suspendere din egen konto.';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Ejer'), role
    into v_navn, v_rolle
    from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Brugeren findes ikke.';
  end if;
  if v_rolle in ('admin', 'superadmin') then
    raise exception 'En admin/superadmin kan ikke suspenderes - fjern rollen foerst.';
  end if;

  v_til := now() + make_interval(days => p_dage);

  update public.profiles set spaerret_til = v_til where id = p_user_id;

  insert into public.user_sanctions
    (bruger_id, type, grund, fritekst, udloeber_at, udfoert_af)
  values
    (p_user_id, 'suspender', p_grund, p_fritekst, v_til, v_mig);

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('suspender', 'user', p_user_id, p_grund, p_fritekst, v_navn, v_mig);

  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
  values (
    p_user_id, 'moderation', v_mig, p_user_id,
    'Din konto er suspenderet til '
      || to_char(v_til at time zone 'Europe/Copenhagen', 'DD-MM-YYYY "kl." HH24:MI')
      || ' - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst)
      || '. Du kan stadig laese, men ikke bidrage, indtil da.',
    '/forum/regler'
  );
end;
$$;

create or replace function public.admin_ban_bruger(
  p_user_id  uuid,
  p_grund    text,
  p_fritekst text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_navn  text;
  v_rolle text;
  v_mig   uuid := auth.uid();
begin
  if not public.er_admin() then
    raise exception 'Kun admin.';
  end if;
  if not public.mod_gyldig_grund(p_grund) then
    raise exception 'Ugyldig grund.';
  end if;
  if p_user_id = v_mig then
    raise exception 'Du kan ikke banne din egen konto.';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Ejer'), role
    into v_navn, v_rolle
    from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Brugeren findes ikke.';
  end if;
  if v_rolle in ('admin', 'superadmin') then
    raise exception 'En admin/superadmin kan ikke bannes - fjern rollen foerst.';
  end if;

  update public.profiles set spaerret_til = 'infinity' where id = p_user_id;

  insert into public.user_sanctions
    (bruger_id, type, grund, fritekst, udloeber_at, udfoert_af)
  values
    (p_user_id, 'ban', p_grund, p_fritekst, null, v_mig);

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('ban', 'user', p_user_id, p_grund, p_fritekst, v_navn, v_mig);

  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
  values (
    p_user_id, 'moderation', v_mig, p_user_id,
    'Din konto er permanent spaerret - grund: '
      || public.mod_grund_tekst(p_grund, p_fritekst)
      || '. Du kan stadig laese, men ikke laengere bidrage.',
    '/forum/regler'
  );
end;
$$;

create or replace function public.admin_anonymiser(
  p_user_id  uuid,
  p_grund    text default 'andet',
  p_fritekst text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_navn  text;
  v_rolle text;
  v_mig   uuid := auth.uid();
begin
  if not public.er_admin() then
    raise exception 'Kun admin.';
  end if;
  if not public.mod_gyldig_grund(p_grund) then
    raise exception 'Ugyldig grund.';
  end if;
  if p_user_id = v_mig then
    raise exception 'Du kan ikke anonymisere din egen konto.';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Ejer'), role
    into v_navn, v_rolle
    from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Brugeren findes ikke.';
  end if;
  if v_rolle in ('admin', 'superadmin') then
    raise exception 'En admin/superadmin kan ikke anonymiseres - fjern rollen foerst.';
  end if;

  update public.profiles
    set display_name = null,
        spaerret_til = 'infinity'
    where id = p_user_id;

  update public.car_private cp
    set vin = null, notes = null
    from public.cars c
    where c.id = cp.car_id and c.owner_id = p_user_id;

  update auth.users
    set email = 'anonym-' || p_user_id::text || '@slettet.invalid',
        raw_user_meta_data = '{}'::jsonb
    where id = p_user_id;

  insert into public.user_sanctions
    (bruger_id, type, grund, fritekst, udloeber_at, udfoert_af)
  values
    (p_user_id, 'anonymiser', p_grund, p_fritekst, null, v_mig);

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('anonymiser', 'user', p_user_id, p_grund, p_fritekst, v_navn, v_mig);
end;
$$;

-- ===========================================================================
-- 5) Stram moderation_log-SELECT: moderator -> superadmin-only.
--    (Lukker hullet: hidtil kunne alle mod+admins laese det menneskelige
--    "hvorfor". Det hoerer nu til superadmins oversyn - ved siden af admin_audit.)
-- ===========================================================================
drop policy if exists moderation_log_select_mod on public.moderation_log;
create policy moderation_log_select_super on public.moderation_log
  for select to authenticated using (public.er_superadmin());

-- ===========================================================================
-- 6) Revert - sikker delmaengde + "uroert siden"-guard.
--    Revertibelt = EEN raekkes ikke-destruktive felt-aendring (op=UPDATE) paa en
--    allowlisted kolonne. IKKE: anonymiser (PII bevidst vaek), slet (DELETE),
--    rolle/spaerring paa profiles (brug governance + ophaev), join-tabeller.
-- ===========================================================================

-- Auto-vedligeholdte kolonner der IGNORERES ved revert (ikke en menneskelig
-- aendring): updated_at/updated_by-touch + forum_threads' denormaliserede
-- taellere. De blokerer ikke en revert, restaureres ikke, og indgaar ikke i
-- "uroert siden"-guarden. (updated_at bumpes bare igen af touch-triggeren.)
create or replace function public.revert_ignorer_kolonne(p_tabel text, p_kol text)
returns boolean
language sql
immutable
as $$
  select p_kol in ('updated_at', 'updated_by')
     or (p_tabel = 'forum_threads'
         and p_kol in ('last_post_at', 'reply_count', 'view_count'));
$$;

-- Allowlist pr. tabel+kolonne (det revertible snit).
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
    ('links','display_order'), ('links','group_id'),
    ('link_groups','titel'), ('link_groups','display_order'),
    ('site_announcement','message'), ('site_announcement','active')
  );
$$;

-- Er aendringen (old->new) revertibel? >=1 aendret kolonne OG alle aendrede
-- kolonner er paa allowlisten.
create or replace function public.revert_muligt(p_tabel text, p_old jsonb, p_new jsonb)
returns boolean
language sql
stable
as $$
  with rel as (
    select k from jsonb_object_keys(p_new) k
    where p_old is not null and p_new is not null
      and p_old->k is distinct from p_new->k
      and not public.revert_ignorer_kolonne(p_tabel, k)
  )
  select exists (select 1 from rel)
     and not exists (select 1 from rel where not public.revert_kolonne_ok(p_tabel, k));
$$;

-- Selve revert'en (superadmin). Skriver OLD tilbage paa de aendrede, tilladte
-- kolonner - men KUN hvis raekken er uroert siden (current == loggede NEW).
-- Revert'en logges selv via zz_audit (superadmin-aktoer paa UPDATE'en).
create or replace function public.superadmin_revert(p_audit_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  a    record;
  cur  jsonb;
  v_set text;
begin
  if not public.er_superadmin() then
    raise exception 'Kun superadmin.';
  end if;

  select * into a from public.admin_audit where id = p_audit_id;
  if not found then
    raise exception 'Haendelsen findes ikke.';
  end if;
  if a.op <> 'UPDATE' then
    raise exception 'Kun felt-aendringer kan fortrydes. Oprettelse, sletning, anonymisering og sanktioner fortrydes ikke her.';
  end if;
  if a.raekke_id is null then
    raise exception 'Haendelsen mangler raekke-id og kan ikke fortrydes.';
  end if;
  if not public.revert_muligt(a.tabel, a.old_data, a.new_data) then
    raise exception 'Aendringen omfatter felter der ikke kan fortrydes - goer det manuelt.';
  end if;

  -- Uroert siden? Hent den nuvaerende raekke og sammenlign de aendrede kolonner.
  execute format('select to_jsonb(t) from public.%I t where t.id::text = $1', a.tabel)
    into cur using a.raekke_id;
  if cur is null then
    raise exception 'Raekken findes ikke laengere - kan ikke fortrydes.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(a.new_data) k
    where a.old_data->k is distinct from a.new_data->k
      and not public.revert_ignorer_kolonne(a.tabel, k)
      and cur->k is distinct from a.new_data->k
  ) then
    raise exception 'Raekken er aendret siden - fortryd manuelt.';
  end if;

  -- Byg SET af netop de aendrede kolonner -> tilbage til OLD, type-korrekt via
  -- kolonnens udt_name (tekst/bool/int4/date/uuid/enum er alle castbare fra ->>).
  select string_agg(
           format('%I = ($1 ->> %L)::%s', c.column_name, c.column_name, c.udt_name),
           ', ')
    into v_set
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = a.tabel
    and a.old_data->(c.column_name) is distinct from a.new_data->(c.column_name)
    and not public.revert_ignorer_kolonne(a.tabel, c.column_name);

  if v_set is null then
    raise exception 'Ingen aendring at fortryde.';
  end if;

  execute format('update public.%I set %s where id::text = $2', a.tabel, v_set)
    using a.old_data, a.raekke_id;

  return a.tabel || ' #' || a.raekke_id || ' fortrudt.';
end;
$$;

-- ===========================================================================
-- 7) Audit-laese-RPC'er (superadmin-gatede, security definer => beriget med
--    navne). Non-superadmin faar 0 raekker (where er_superadmin() i basen).
-- ===========================================================================

-- Aktoer-vaelgeren: stab-personer der har et spor, med antal + seneste.
create or replace function public.superadmin_audit_aktoerer()
returns table (
  aktoer uuid,
  navn   text,
  rolle  text,
  antal  bigint,
  seneste timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select a.aktoer,
         coalesce(nullif(trim(p.display_name), ''), u.email, 'Ukendt') as navn,
         p.role,
         count(*) as antal,
         max(a.created_at) as seneste
  from public.admin_audit a
  left join public.profiles p on p.id = a.aktoer
  left join auth.users u      on u.id = a.aktoer
  where public.er_superadmin()
  group by a.aktoer, p.display_name, u.email, p.role
  order by max(a.created_at) desc;
$$;

-- En aktoers fulde spor (paginering). kan_fortrydes = op=UPDATE + revertibelt
-- snit (den endelige "uroert siden"-guard ligger i superadmin_revert).
create or replace function public.superadmin_audit_spor(
  p_aktoer uuid,
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  id          bigint,
  op          text,
  tabel       text,
  raekke_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz,
  kan_fortrydes boolean,
  total       bigint
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.op, a.tabel, a.raekke_id, a.old_data, a.new_data, a.created_at,
         (a.op = 'UPDATE' and public.revert_muligt(a.tabel, a.old_data, a.new_data)) as kan_fortrydes,
         count(*) over () as total
  from public.admin_audit a
  where public.er_superadmin()
    and a.aktoer is not distinct from p_aktoer
  order by a.created_at desc
  limit  greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- Global "seneste"-stroem (ved siden af aktoer-linsen).
create or replace function public.superadmin_audit_seneste(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  id          bigint,
  op          text,
  tabel       text,
  raekke_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz,
  aktoer      uuid,
  aktoer_navn text,
  kan_fortrydes boolean,
  total       bigint
)
language sql
security definer
set search_path = public, auth
as $$
  select a.id, a.op, a.tabel, a.raekke_id, a.old_data, a.new_data, a.created_at,
         a.aktoer,
         coalesce(nullif(trim(p.display_name), ''), u.email, 'Ukendt') as aktoer_navn,
         (a.op = 'UPDATE' and public.revert_muligt(a.tabel, a.old_data, a.new_data)) as kan_fortrydes,
         count(*) over () as total
  from public.admin_audit a
  left join public.profiles p on p.id = a.aktoer
  left join auth.users u      on u.id = a.aktoer
  where public.er_superadmin()
  order by a.created_at desc
  limit  greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- ===========================================================================
-- 8) Grants: ingen public execute paa de nye RPC'er; kun authenticated (de
--    gater selv internt paa er_superadmin). er_superadmin() selv maa alle kalde
--    (afsloerer kun en boolean om kalderen selv) - som er_admin/er_moderator.
-- ===========================================================================
revoke all on function public.superadmin_revert(bigint) from public;
grant execute on function public.superadmin_revert(bigint) to authenticated;

revoke all on function public.superadmin_audit_aktoerer() from public;
grant execute on function public.superadmin_audit_aktoerer() to authenticated;

revoke all on function public.superadmin_audit_spor(uuid, int, int) from public;
grant execute on function public.superadmin_audit_spor(uuid, int, int) to authenticated;

revoke all on function public.superadmin_audit_seneste(int, int) from public;
grant execute on function public.superadmin_audit_seneste(int, int) to authenticated;

-- ===========================================================================
-- NODE: eksplicit e-mail-bootstrap (KUN hvis migrationen aborterer paa vaernet
-- ovenfor, dvs. der er FLERE end een admin). Koer FOERST dette (saetter
-- 'superadmin' paa din konto), koer SAA migrationen igen - den auto-promoverer
-- da ingen (superadmin findes allerede) og vaernet passerer:
--
--   alter table public.profiles drop constraint if exists profiles_role_check;
--   alter table public.profiles add constraint profiles_role_check
--     check (role in ('admin','moderator','superadmin'));
--   update public.profiles set role = 'superadmin'
--   where id = (select id from auth.users where lower(email) = lower('DIN-EMAIL-HER'));
-- ===========================================================================
