-- Zeekr Garage - Bruger-sanktioner (M4, del af P20)
-- ---------------------------------------------------------------------------
-- Bygger oven paa den delte moderings-kerne (M1): sanktions-RPC'er der saetter
-- profiles.spaerret_til, skriver user_sanctions (historik) + moderation_log
-- (audit) og - hvor det giver mening - en officiel notifikation til brugeren,
-- ALT i EN transaktion (plpgsql = atomisk). Plus admin_alle_brugere udvidet med
-- status + paginering/filtre, saa Adgange kan vise et egentligt bruger-overblik
-- i stedet for den rene soegeliste.
--
-- Designvalg (laast med Torben 24-11):
--  - "Ban" = permanent skrive-spaerre (spaerret_til = 'infinity'); suspender =
--    samme, tidsbegraenset. Begge soft/reversible (ophaev nulstiller). M1
--    haandhaever allerede spaerringen i de 8 bruger-insert-policies.
--  - "Fjern personen" = ANONYMISER (ryd PII, behold cars/confirmations +
--    forum-indhold = QA-signalet mod Zeekr). Der er BEVIDST ingen hard-delete:
--    en cascade paa profiles river cars+confirmations med sig, og en irreversibel
--    slet-knap i UI er en fodfejl der draeber praecis det bevis vi bygger. Den
--    sjaeldne aegte spam-/testkonto ryddes manuelt i Studio ved behov.
--  - Gating: moderator maa advare (M3) + suspendere (dagligt/reversibelt);
--    admin maa banne, ophaeve og anonymisere (permanent/destruktivt). Samme snit
--    som P18 (model-slet) + rolle-aendringer.
--  - Notif-kanal = ren envejs-notifikation (type 'moderation', M3's 🛡-ikon).
--    Anonymiser notificerer IKKE (personen fjernes).
--
-- Afhaenger af M1 (user_sanctions, moderation_log, profiles.spaerret_til,
-- er_moderator/er_admin). Idempotent (create or replace / drop-if-exists).

-- =========================================================================
-- Faelles grund-validering: samme fem grunde som M3 (dublet|tone|off-topic|
-- spam|andet). Holdt som en simpel helper saa RPC'erne ikke gentager listen.
-- =========================================================================
create or replace function public.mod_gyldig_grund(p_grund text)
returns boolean
language sql
immutable
as $$
  select p_grund is not null
     and p_grund in ('dublet', 'tone', 'off-topic', 'spam', 'andet');
$$;

-- =========================================================================
-- mod_suspender_bruger - tidsbegraenset skrive-spaerre (MODERATOR).
--    Saetter spaerret_til = now() + p_dage doegn, skriver sanktion + log +
--    officiel notifikation med udloebsdatoen.
-- =========================================================================
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
  if v_rolle = 'admin' then
    raise exception 'En admin kan ikke suspenderes - fjern admin-rollen foerst.';
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

-- =========================================================================
-- admin_ban_bruger - permanent skrive-spaerre (ADMIN).
--    spaerret_til = 'infinity'. Reversibel via admin_ophaev.
-- =========================================================================
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
  if v_rolle = 'admin' then
    raise exception 'En admin kan ikke bannes - fjern admin-rollen foerst.';
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

-- =========================================================================
-- admin_ophaev - ophaev en suspension/ban (ADMIN). Nulstiller spaerret_til.
--    Ingen grund noedvendig (neutral handling). Notificerer brugeren.
-- =========================================================================
create or replace function public.admin_ophaev(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_navn text;
  v_mig  uuid := auth.uid();
begin
  if not public.er_admin() then
    raise exception 'Kun admin.';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Ejer')
    into v_navn
    from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Brugeren findes ikke.';
  end if;

  update public.profiles set spaerret_til = null where id = p_user_id;

  insert into public.user_sanctions
    (bruger_id, type, grund, fritekst, udloeber_at, udfoert_af)
  values
    (p_user_id, 'ophaev', null, null, null, v_mig);

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('ophaev', 'user', p_user_id, null, null, v_navn, v_mig);

  if p_user_id <> v_mig then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (
      p_user_id, 'moderation', v_mig, p_user_id,
      'Din spaerring er ophaevet. Du kan bidrage igen.',
      '/forum'
    );
  end if;
end;
$$;

-- =========================================================================
-- admin_anonymiser - "fjern personen" uden at dræbe QA-signalet (ADMIN).
--    Rydder PII (display_name, auth-mail + metadata, car_private VIN/noter) og
--    spaerrer permanent, men BEHOLDER cars + confirmations + forum-indhold
--    (author_id/created_by/user_id bevares; indholdet bliver bare forfatterloest
--    i visningen via fallback-navnet). Ingen notifikation - personen fjernes.
--    search_path inkluderer auth, saa vi kan scramble auth.users (selvhostet
--    Postgres: funktions-ejeren er superuser).
-- =========================================================================
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
  if v_rolle = 'admin' then
    raise exception 'En admin kan ikke anonymiseres - fjern admin-rollen foerst.';
  end if;

  -- 1) Ryd profil-PII + spaer permanent.
  update public.profiles
    set display_name = null,
        spaerret_til = 'infinity'
    where id = p_user_id;

  -- 2) Ryd garage-PII (VIN + noter) - men BEHOLD selve bilerne (QA-signal).
  update public.car_private cp
    set vin = null, notes = null
    from public.cars c
    where c.id = cp.car_id and c.owner_id = p_user_id;

  -- 3) Ryd auth-PII: scramble mailen (unik via fuld uuid) + toem metadata, saa
  --    personen hverken kan kontaktes eller logge meningsfuldt ind.
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
  -- Ingen notifikation: personen fjernes.
end;
$$;

-- =========================================================================
-- admin_alle_brugere - UDVIDET: status + paginering/filtre.
--    Afloeser den tidligere (p_soeg)-only signatur. Nu moderator-laesbar (saa
--    moderatorer kan finde en bruger at advare/suspendere), med:
--      - fritekst-soeg (mail/navn),
--      - filtre: rolle ('admin'|'moderator'|'ingen') + status,
--      - sortering ('nyeste'|'aktiv'=sidst logget|'navn'),
--      - limit/offset ("vis flere" - samme afkortnings-vej som P16),
--      - status udledt af spaerret_til (aktiv|suspenderet|bannet),
--      - total (count over hele filtreringen) saa UI kan vise "viser X af Y".
--    Rolle-tildelingen i Adgange forbliver admin-only (admin_saet_rolle gater
--    selv); denne funktion leverer bare listen.
-- =========================================================================
drop function if exists public.admin_alle_brugere(text);
drop function if exists public.admin_alle_brugere(text, text, text, text, int, int);

create function public.admin_alle_brugere(
  p_soeg   text default '',
  p_rolle  text default null,
  p_status text default null,
  p_sort   text default 'nyeste',
  p_limit  int  default 25,
  p_offset int  default 0
)
returns table (
  id            uuid,
  email         text,
  display_name  text,
  role          text,
  sidst_logget  timestamptz,
  oprettet      timestamptz,
  spaerret_til  timestamptz,
  status        text,
  total         bigint
)
language sql
security definer
set search_path = public, auth
as $$
  with base as (
    select
      p.id,
      u.email,
      p.display_name,
      p.role,
      u.last_sign_in_at as sidst_logget,
      u.created_at      as oprettet,
      p.spaerret_til,
      case
        when p.spaerret_til is null        then 'aktiv'
        when p.spaerret_til <= now()       then 'aktiv'        -- udloebet suspension = fri
        when p.spaerret_til = 'infinity'   then 'bannet'
        else                                    'suspenderet'
      end as status
    from public.profiles p
    join auth.users u on u.id = p.id
    where public.er_moderator()
      and (
        coalesce(btrim(p_soeg), '') = ''
        or u.email ilike '%' || p_soeg || '%'
        or coalesce(p.display_name, '') ilike '%' || p_soeg || '%'
      )
      and (
        p_rolle is null
        or (p_rolle = 'ingen' and p.role is null)
        or p.role = p_rolle
      )
  ),
  filtreret as (
    select * from base
    where p_status is null or status = p_status
  )
  select
    f.id, f.email, f.display_name, f.role, f.sidst_logget, f.oprettet,
    f.spaerret_til, f.status,
    count(*) over () as total
  from filtreret f
  order by
    case when p_sort = 'navn'  then lower(coalesce(f.display_name, f.email)) end asc,
    case when p_sort = 'aktiv' then f.sidst_logget end desc nulls last,
    f.oprettet desc
  limit  greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- =========================================================================
-- Grants: ingen public execute; kun authenticated (RPC'erne gater selv
-- internt paa er_moderator/er_admin).
-- =========================================================================
revoke all on function public.mod_gyldig_grund(text) from public;
grant execute on function public.mod_gyldig_grund(text) to authenticated;

revoke all on function public.mod_suspender_bruger(uuid, int, text, text) from public;
grant execute on function public.mod_suspender_bruger(uuid, int, text, text) to authenticated;

revoke all on function public.admin_ban_bruger(uuid, text, text) from public;
grant execute on function public.admin_ban_bruger(uuid, text, text) to authenticated;

revoke all on function public.admin_ophaev(uuid) from public;
grant execute on function public.admin_ophaev(uuid) to authenticated;

revoke all on function public.admin_anonymiser(uuid, text, text) from public;
grant execute on function public.admin_anonymiser(uuid, text, text) to authenticated;

revoke all on function public.admin_alle_brugere(text, text, text, text, int, int) from public;
grant execute on function public.admin_alle_brugere(text, text, text, text, int, int) to authenticated;
