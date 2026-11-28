-- Zeekr Garage - UI-i18n skive U8: notifikationer paa laeserens sprog (28-11-2026)
-- ---------------------------------------------------------------------------
-- Notifikationerne bygges i dag som FAERDIG dansk tekst i triggere/RPC'er og
-- gemmes i notifications.tekst. Nu faar hver ny raekke ogsaa `params jsonb` med
-- de raa byggesten (navn, titel, grund, ...), og klokken + /notifikationer
-- renderer teksten paa LAESERENS sprog ud fra type + params
-- (lib/notif-tekst.ts). `tekst` skrives fortsat (dansk) og er fallback:
-- gamle raekker uden params vises som foer.
--
-- Params pr. type (null-felter strippes; navn mangler => ordbogens fallback):
--   forum_svar     {navn, titel, direkte:bool}
--   pb_besked      {navn, gruppe:bool, gruppenavn}
--   nyt_event      {navn, titel}
--   moderation     {v:'fjern_traad'|'fjern_indlaeg'|'fjern_avatar'|'suspender'|'ban'|'ophaev',
--                   titel, grund, fritekst, til}
--   advarsel       {grund, fritekst}
--   forum_rapport  {navn, hvad:'indlaeg'|'traad', titel, grund}
--   kontakt        {emne}
--   ota            {version}
-- Moderatorens fritekst, traad-/event-titler, kontakt-emnet og gruppenavnet er
-- INDHOLD og gemmes ordret (oversaettes ikke). 'mention' har ingen udsender
-- (der findes ingen omtale-trigger) - rendereren kender typen, saa en senere
-- trigger kun skal fylde {navn, titel}.
--
-- Funktionerne er ordret de seneste definitioner (kilde-migration noteret ved
-- hver), med to aendringer: (1) params i insert'en, (2) stavning i den danske
-- tekst rettet (spaerret/laese/laengere/ophaevet -> spærret/læse/længere/ophævet).
-- Signaturer, triggere og grants er uaendrede (create or replace beholder dem).
--
-- Desuden ny RPC event_deltager_modtagere(e_id) -> (email, sprog), saa event-
-- mailen kan sendes pr. modtagerens sprog. Den gamle event_deltager_emails
-- beholdes urørt (gammel kode virker til deploy).
--
-- Idempotent: add column if not exists, constraint-tjek, create or replace.

-- ===========================================================================
-- 1) Kolonne + check (null eller et json-objekt).
-- ===========================================================================
alter table public.notifications
  add column if not exists params jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'notifications_params_objekt'
       and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_params_objekt
      check (params is null or jsonb_typeof(params) = 'object');
  end if;
end $$;

-- ===========================================================================
-- 2) Forum: svar + direkte svar (fra 20261125100000_forum_direkte_svar_notif.sql)
-- ===========================================================================
create or replace function public.forum_post_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title   text;
  v_cat     text;      -- kategori-slug
  v_tslug   text;      -- traad-slug
  v_raa     text;      -- visningsnavnet som det er (null hvis tomt) -> params
  v_navn    text;
  v_href    text;
  v_tekst   text;
  v_direkte uuid;      -- den DIREKTE besvarede forfatter (til direkte-svar-notif)
  v_dtekst  text;
begin
  -- Ingen forfatter (kan ske pga. on delete set null) -> intet at goere.
  if new.author_id is null then
    return new;
  end if;

  select th.title, th.slug, c.slug
    into v_title, v_tslug, v_cat
    from public.forum_threads th
    join public.forum_categories c on c.id = th.category_id
   where th.id = new.thread_id;
  if v_title is null then
    return new; -- traaden findes ikke (burde ikke ske)
  end if;

  -- Deep-link: peg paa det KONKRETE indlaeg (#post-<id>), ikke bare traad-toppen.
  v_href := '/forum/' || v_cat || '/' || v_tslug || '#post-' || new.id::text;

  -- Et SVAR (ikke aabnings-indlaegget) notificerer foelgere + evt. den direkte besvarede.
  if not new.is_opening then
    select nullif(trim(p.display_name), '')
      into v_raa
      from public.profiles p
     where p.id = new.author_id;
    v_navn := coalesce(v_raa, 'En ejer');
    v_tekst := v_navn || ' svarede i "' || v_title || '"';

    -- Hvem svarer man DIREKTE paa?
    --   reply_to_author sat (svar paa et undersvar) -> den person
    --   ellers parent_id sat (svar paa aabning/top-svar) -> parent-indlaeggets forfatter
    --   ingen af delene (top-svar uden maal) -> ingen direkte besvaret
    v_direkte := new.reply_to_author;
    if v_direkte is null and new.parent_id is not null then
      select author_id
        into v_direkte
        from public.forum_posts
       where id = new.parent_id;
    end if;
    -- Aldrig dig selv.
    if v_direkte = new.author_id then
      v_direkte := null;
    end if;

    -- Foelger-notifikationer: alle AKTIVE foelgere undtagen forfatteren OG den
    -- direkte besvarede (dedup: den direkte besvarede faar KUN den direkte notif).
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
    select f.user_id, 'forum_svar', new.author_id, new.thread_id, v_tekst, v_href,
           jsonb_strip_nulls(jsonb_build_object('navn', v_raa, 'titel', v_title, 'direkte', false))
      from public.traad_foelgere f
     where f.thread_id = new.thread_id
       and f.muted = false
       and f.user_id <> new.author_id
       and (v_direkte is null or f.user_id <> v_direkte);

    -- Direkte-svar-notifikation: den man svarer direkte paa (ud over foelgerne).
    -- Uafhaengig af follow/mute - et direkte svar skal naa frem. Samme deep-link.
    if v_direkte is not null then
      v_dtekst := v_navn || ' svarede på dit indlæg i "' || v_title || '"';
      insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
      values (v_direkte, 'forum_svar', new.author_id, new.thread_id, v_dtekst, v_href,
              jsonb_strip_nulls(jsonb_build_object('navn', v_raa, 'titel', v_title, 'direkte', true)));
    end if;
  end if;

  -- Forfatteren foelger nu traaden (opret ELLER svar). Idempotent.
  insert into public.traad_foelgere (thread_id, user_id)
  values (new.thread_id, new.author_id)
  on conflict (thread_id, user_id) do nothing;

  return new;
end;
$$;

-- ===========================================================================
-- 3) Beskeder: 1:1 + gruppe (fra 20261123180000_gruppe_samtaler.sql)
--    En ulaest pb_besked-notif pr. samtale genbruges (opdateres) - params med.
-- ===========================================================================
create or replace function public.message_after_insert()
returns trigger language plpgsql security definer
set search_path = public as $$
declare v_raa text; v_navn text; v_href text; v_tekst text; v_is_group boolean; v_title text;
        v_gnavn text; v_params jsonb; r record;
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id
   returning is_group, title into v_is_group, v_title;

  select nullif(trim(display_name), '') into v_raa
    from public.profiles where id = new.sender_id;
  v_navn := coalesce(v_raa, 'En ejer');
  v_href := '/beskeder/' || new.conversation_id;
  v_gnavn := nullif(btrim(coalesce(v_title, '')), '');
  if coalesce(v_is_group, false) then
    v_tekst := v_navn || ' skrev i ' || coalesce(v_gnavn, 'en gruppe');
  else
    v_tekst := v_navn || ' sendte dig en besked';
  end if;
  v_params := jsonb_strip_nulls(jsonb_build_object(
    'navn', v_raa,
    'gruppe', coalesce(v_is_group, false),
    'gruppenavn', case when coalesce(v_is_group, false) then v_gnavn end
  ));

  for r in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    update public.notifications
       set tekst = v_tekst, params = v_params, created_at = new.created_at, aktoer_id = new.sender_id
     where modtager_id = r.user_id and type = 'pb_besked'
       and reference = new.conversation_id and er_laest = false;
    if not found then
      insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
      values (r.user_id, 'pb_besked', new.sender_id, new.conversation_id, v_tekst, v_href, v_params);
    end if;
  end loop;
  return new;
end;
$$;

-- ===========================================================================
-- 4) Nyt event (fra 20261123190000_nyt_event_notif.sql)
-- ===========================================================================
create or replace function public.event_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raa   text;
  v_navn  text;
  v_href  text;
  v_tekst text;
begin
  v_href := '/events/' || new.slug;

  -- Opretter-navn (bedst-effort) til teksten; falder tilbage til "Holdet".
  if new.created_by is not null then
    select nullif(trim(p.display_name), '')
      into v_raa
      from public.profiles p
     where p.id = new.created_by;
  end if;
  v_navn := coalesce(v_raa, 'Holdet');

  v_tekst := v_navn || ' oprettede et nyt event: "' || new.title || '"';

  -- Én notifikation pr. bruger - undtagen opretteren selv.
  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
  select p.id, 'nyt_event', new.created_by, new.id, v_tekst, v_href,
         jsonb_strip_nulls(jsonb_build_object('navn', v_raa, 'titel', new.title))
    from public.profiles p
   where new.created_by is null or p.id <> new.created_by;

  return new;
end;
$$;

-- ===========================================================================
-- 5) Forum-rapport til staben (fra 20261124130000_rapport_notif.sql)
-- ===========================================================================
create or replace function public.forum_rapport_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raa      text;
  v_reporter text;
  v_titel    text;
  v_hvad     text;
  v_hvad_k   text;  -- 'indlaeg' | 'traad' -> params
  v_grund    text;
begin
  if new.kilde is distinct from 'bruger' then
    return new;
  end if;

  select nullif(trim(display_name), '')
    into v_raa from public.profiles where id = new.reporter_id;
  v_reporter := coalesce(v_raa, 'En ejer');

  if new.post_id is not null then
    v_hvad := 'et indlæg';
    v_hvad_k := 'indlaeg';
    select th.title into v_titel
      from public.forum_posts po
      join public.forum_threads th on th.id = po.thread_id
      where po.id = new.post_id;
  else
    v_hvad := 'en tråd';
    v_hvad_k := 'traad';
    select title into v_titel from public.forum_threads where id = new.thread_id;
  end if;

  v_grund := coalesce(new.reason, 'andet');

  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
  select
    p.id,
    'forum_rapport',
    new.reporter_id,
    coalesce(new.post_id, new.thread_id),
    v_reporter || ' rapporterede ' || v_hvad
      || coalesce(' i "' || v_titel || '"', '')
      || ' - grund: ' || public.mod_grund_tekst(v_grund, null),
    '/admin/forum',
    jsonb_strip_nulls(jsonb_build_object(
      'navn', v_raa, 'hvad', v_hvad_k, 'titel', v_titel, 'grund', v_grund))
  from public.profiles p
  where p.role in ('admin', 'moderator')
    and p.id is distinct from new.reporter_id;

  return new;
end;
$$;

-- ===========================================================================
-- 6) Kontakt-henvendelse til staben (fra 20261126130000_kontakt_beskeder.sql)
-- ===========================================================================
create or replace function public.kontakt_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
  select
    p.id,
    'kontakt',
    new.user_id,
    new.id,
    'Ny henvendelse via Kontakt: "' || left(new.emne, 80) || '"',
    '/admin/kontakt',
    jsonb_build_object('emne', left(new.emne, 80))
  from public.profiles p
  where p.role in ('admin', 'moderator', 'superadmin')
    and p.id is distinct from new.user_id;
  return new;
end;
$$;

-- ===========================================================================
-- 7) OTA-opslag (fra 20261124200000_ota_notif.sql)
-- ===========================================================================
create or replace function public.admin_opret_ota(
  p_version     text,
  p_released_at date,
  p_changelog   text,
  p_note        text,
  p_model_ids   uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_version text; v_changelog text; v_id uuid; n_modeller int;
begin
  if not public.er_admin() then raise exception 'Kun admin kan oprette OTA-opslag.'; end if;
  v_version   := btrim(p_version);
  v_changelog := btrim(p_changelog);
  if v_version   = '' then raise exception 'Giv opslaget en version.'; end if;
  if v_changelog = '' then raise exception 'Changeloggen maa ikke vaere tom.'; end if;
  -- Mindst een eksisterende model (0 = usynligt opslag).
  select count(*) into n_modeller
  from unnest(coalesce(p_model_ids, '{}'::uuid[])) as mid
  where exists (select 1 from public.models m where m.id = mid);
  if n_modeller = 0 then raise exception 'Vaelg mindst een model.'; end if;

  insert into public.software_updates (version, released_at, changelog, note, created_by)
  values (
    v_version,
    coalesce(p_released_at, current_date),
    v_changelog,
    nullif(btrim(p_note), ''),
    auth.uid()
  )
  returning id into v_id;
  perform public.saet_ota_modeller(v_id, p_model_ids);

  -- Klokke-notif til ejere af de ramte modeller (en pr. ejer, opretteren undtaget).
  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
  select distinct c.owner_id, 'ota', auth.uid(), v_id,
         'Ny software til din Zeekr: ' || v_version,
         '/software',
         jsonb_build_object('version', v_version)
    from public.cars c
    join public.software_update_models sum on sum.model_id = c.model_id
   where sum.update_id = v_id
     and c.owner_id is not null
     and c.owner_id <> auth.uid();

  return v_id;
end;
$$;

-- ===========================================================================
-- 8) Moderation: fjern traad / fjern indlaeg / advar (fra 20261124130000_rapport_notif.sql)
-- ===========================================================================
create or replace function public.mod_fjern_traad(
  p_thread_id uuid, p_grund text, p_fritekst text default null, p_report_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_title text; v_author uuid;
begin
  if not public.er_moderator() then raise exception 'Kun moderator/admin.'; end if;
  if p_grund is null or p_grund not in ('dublet','tone','off-topic','spam','andet') then
    raise exception 'Ugyldig grund.'; end if;
  select title, author_id into v_title, v_author from public.forum_threads where id = p_thread_id;
  if not found then raise exception 'Tråden findes ikke.'; end if;
  update public.forum_threads set is_removed = true where id = p_thread_id;
  insert into public.moderation_log (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values ('fjern_traad', 'thread', p_thread_id, p_grund, p_fritekst, v_title, auth.uid());
  if v_author is not null and v_author <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
    values (v_author, 'moderation', auth.uid(), p_thread_id,
      'Din tråd "' || v_title || '" blev fjernet - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/regler',
      jsonb_strip_nulls(jsonb_build_object('v', 'fjern_traad', 'titel', v_title, 'grund', p_grund,
        'fritekst', nullif(trim(p_fritekst), ''))));
  end if;
  if p_report_id is not null then update public.forum_reports set handled = true where id = p_report_id; end if;
end; $$;

create or replace function public.mod_fjern_indlaeg(
  p_post_id uuid, p_grund text, p_fritekst text default null, p_report_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_title text; v_tslug text; v_cslug text; v_snapshot text;
begin
  if not public.er_moderator() then raise exception 'Kun moderator/admin.'; end if;
  if p_grund is null or p_grund not in ('dublet','tone','off-topic','spam','andet') then
    raise exception 'Ugyldig grund.'; end if;
  select po.author_id, th.title, th.slug, c.slug, left(po.body, 140)
    into v_author, v_title, v_tslug, v_cslug, v_snapshot
    from public.forum_posts po
    join public.forum_threads th on th.id = po.thread_id
    join public.forum_categories c on c.id = th.category_id
    where po.id = p_post_id;
  if not found then raise exception 'Indlægget findes ikke.'; end if;
  update public.forum_posts set is_removed = true where id = p_post_id;
  insert into public.moderation_log (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values ('fjern_indlaeg', 'post', p_post_id, p_grund, p_fritekst, v_snapshot, auth.uid());
  if v_author is not null and v_author <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
    values (v_author, 'moderation', auth.uid(), p_post_id,
      'Dit indlæg i "' || v_title || '" blev fjernet - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/' || v_cslug || '/' || v_tslug,
      jsonb_strip_nulls(jsonb_build_object('v', 'fjern_indlaeg', 'titel', v_title, 'grund', p_grund,
        'fritekst', nullif(trim(p_fritekst), ''))));
  end if;
  if p_report_id is not null then update public.forum_reports set handled = true where id = p_report_id; end if;
end; $$;

create or replace function public.mod_advar_bruger(
  p_user_id uuid, p_grund text, p_fritekst text default null, p_report_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_navn text;
begin
  if not public.er_moderator() then raise exception 'Kun moderator/admin.'; end if;
  if p_grund is null or p_grund not in ('dublet','tone','off-topic','spam','andet') then
    raise exception 'Ugyldig grund.'; end if;
  select coalesce(nullif(trim(display_name), ''), 'Ejer') into v_navn from public.profiles where id = p_user_id;
  if not found then raise exception 'Brugeren findes ikke.'; end if;
  insert into public.moderation_log (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values ('advar', 'user', p_user_id, p_grund, p_fritekst, v_navn, auth.uid());
  if p_user_id <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
    values (p_user_id, 'advarsel', auth.uid(), p_user_id,
      'Du har fået en advarsel fra moderationen - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/regler',
      jsonb_strip_nulls(jsonb_build_object('grund', p_grund, 'fritekst', nullif(trim(p_fritekst), ''))));
  end if;
  if p_report_id is not null then update public.forum_reports set handled = true where id = p_report_id; end if;
end; $$;

-- ===========================================================================
-- 9) Moderation: fjern profilbillede (fra 20261124150000_avatar.sql)
-- ===========================================================================
create or replace function public.mod_fjern_avatar(
  p_user_id   uuid,
  p_grund     text,
  p_fritekst  text default null,
  p_report_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_navn   text;
  v_avatar text;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderator/admin.';
  end if;
  if p_grund is null or p_grund not in ('dublet', 'tone', 'off-topic', 'spam', 'andet') then
    raise exception 'Ugyldig grund.';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Ejer'), avatar_path
    into v_navn, v_avatar
    from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Brugeren findes ikke.';
  end if;
  if v_avatar is null then
    raise exception 'Brugeren har intet profilbillede.';
  end if;

  update public.profiles set avatar_path = null where id = p_user_id;

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('fjern_avatar', 'user', p_user_id, p_grund, p_fritekst, v_navn, auth.uid());

  -- Officiel notifikation (ikke til mig selv). href -> garagen, hvor man selv
  -- styrer sit billede og kan laegge et nyt op.
  if p_user_id <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
    values (
      p_user_id, 'moderation', auth.uid(), p_user_id,
      'Dit profilbillede blev fjernet - grund: '
        || public.mod_grund_tekst(p_grund, p_fritekst),
      '/garage',
      jsonb_strip_nulls(jsonb_build_object('v', 'fjern_avatar', 'grund', p_grund,
        'fritekst', nullif(trim(p_fritekst), '')))
    );
  end if;

  if p_report_id is not null then
    update public.forum_reports set handled = true where id = p_report_id;
  end if;
end;
$$;

-- ===========================================================================
-- 10) Sanktioner: suspender + ban (fra 20261124210000_p32_audit_superadmin.sql)
--     og ophaev (fra 20261124140000_bruger_sanktioner.sql)
-- ===========================================================================
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

  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
  values (
    p_user_id, 'moderation', v_mig, p_user_id,
    'Din konto er suspenderet til '
      || to_char(v_til at time zone 'Europe/Copenhagen', 'DD-MM-YYYY "kl." HH24:MI')
      || ' - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst)
      || '. Du kan stadig læse, men ikke bidrage, indtil da.',
    '/forum/regler',
    jsonb_strip_nulls(jsonb_build_object('v', 'suspender', 'til', v_til, 'grund', p_grund,
      'fritekst', nullif(trim(p_fritekst), '')))
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

  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
  values (
    p_user_id, 'moderation', v_mig, p_user_id,
    'Din konto er permanent spærret - grund: '
      || public.mod_grund_tekst(p_grund, p_fritekst)
      || '. Du kan stadig læse, men ikke længere bidrage.',
    '/forum/regler',
    jsonb_strip_nulls(jsonb_build_object('v', 'ban', 'grund', p_grund,
      'fritekst', nullif(trim(p_fritekst), '')))
  );
end;
$$;

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
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href, params)
    values (
      p_user_id, 'moderation', v_mig, p_user_id,
      'Din spærring er ophævet. Du kan bidrage igen.',
      '/forum',
      jsonb_build_object('v', 'ophaev')
    );
  end if;
end;
$$;

-- ===========================================================================
-- 11) Event-mail pr. sprog: de tilmeldtes mail + sprog.
--     Sprog: profilens valg > user_metadata.sprog (sat ved signup/sprogvalg) > da.
--     Samme gate som event_deltager_emails (er_moderator i WHERE -> ikke-
--     moderator faar tom liste, ingen laek).
-- ===========================================================================
create or replace function public.event_deltager_modtagere(e_id uuid)
returns table (email text, sprog text)
language sql
security definer
set search_path = public
as $$
  select u.email::text,
         coalesce(
           p.sprog,
           case when u.raw_user_meta_data->>'sprog' in ('da', 'sv', 'en')
                then u.raw_user_meta_data->>'sprog' end,
           'da'
         )
  from public.event_signups s
  join auth.users u on u.id = s.user_id
  left join public.profiles p on p.id = s.user_id
  where s.event_id = e_id
    and u.email is not null
    and public.er_moderator();
$$;

revoke all on function public.event_deltager_modtagere(uuid) from public;
grant execute on function public.event_deltager_modtagere(uuid) to authenticated;
