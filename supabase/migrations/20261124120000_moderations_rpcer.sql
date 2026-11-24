-- Zeekr Garage - Moderations-RPC'er (M3, del af P21)
-- ---------------------------------------------------------------------------
-- Goer hver moderations-handling til en handling-MED-GRUND der notificerer den
-- beroerte bruger - i stedet for dagens stumme traad-CRUD. Hver RPC goer tre
-- ting ATOMISK (samme transaktion): udfoerer handlingen, skriver audit-loggen
-- (moderation_log, M1) og indsaetter en officiel notifikation til forfatteren.
--
-- Besked-kanal v1 (laast med Torben 24-11): REN notifikation (envejs, officiel).
-- Grunden baeres i teksten; der er ingen kvitterbar/svarbar peer-DM. Et evt.
-- anke-flow bygges dedikeret senere, ikke som genbrug af messages.
--
-- Notif-typer: 'moderation' (traad/indlaeg fjernet) og 'advarsel' (kontakt/advar
-- en bruger). NotifBell faar eget ikon for dem i UI. notifications har bevidst
-- INGEN klient-insert-policy - kun security-definer skriver, saa disse RPC'er
-- (security definer) er den eneste vej ind.
--
-- Afhaenger af M1 (moderation_log, er_moderator) + M2 (forum_reports). Idempotent.

-- =========================================================================
-- Hjaelper: frys en laesbar grund-saetning til notifikations-teksten.
--    immutable - ren strengbygning, ingen tabel-opslag.
-- =========================================================================
create or replace function public.mod_grund_tekst(p_grund text, p_fritekst text)
returns text
language sql
immutable
as $$
  select
    case p_grund
      when 'dublet'    then 'dublet'
      when 'tone'      then 'tone'
      when 'off-topic' then 'off-topic'
      when 'spam'      then 'spam'
      else 'andet'
    end
    || case
         when coalesce(nullif(trim(p_fritekst), ''), '') <> ''
         then ' (' || trim(p_fritekst) || ')'
         else ''
       end;
$$;

-- =========================================================================
-- mod_fjern_traad - soft-remove en traad + log + notifikation til forfatteren.
--    p_report_id (valgfri): markér den udloesende forum-rapport haandteret i
--    samme transaktion (fra koeen i Vaerkstedet).
-- =========================================================================
create or replace function public.mod_fjern_traad(
  p_thread_id uuid,
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
  v_title  text;
  v_author uuid;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderator/admin.';
  end if;
  if p_grund is null or p_grund not in ('dublet', 'tone', 'off-topic', 'spam', 'andet') then
    raise exception 'Ugyldig grund.';
  end if;

  select title, author_id into v_title, v_author
    from public.forum_threads where id = p_thread_id;
  if not found then
    raise exception 'Tråden findes ikke.';
  end if;

  update public.forum_threads set is_removed = true where id = p_thread_id;

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('fjern_traad', 'thread', p_thread_id, p_grund, p_fritekst, v_title, auth.uid());

  -- Officiel notifikation (ikke til mig selv, ikke til en forfatterloes traad).
  if v_author is not null and v_author <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (
      v_author, 'moderation', auth.uid(), p_thread_id,
      'Din tråd "' || v_title || '" blev fjernet - grund: '
        || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/regler'
    );
  end if;

  if p_report_id is not null then
    update public.forum_reports set handled = true where id = p_report_id;
  end if;
end;
$$;

-- =========================================================================
-- mod_fjern_indlaeg - soft-remove et indlaeg + log + notifikation.
--    Traaden bestaar, saa notifikationen linker til traaden.
-- =========================================================================
create or replace function public.mod_fjern_indlaeg(
  p_post_id   uuid,
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
  v_author   uuid;
  v_title    text;
  v_tslug    text;
  v_cslug    text;
  v_snapshot text;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderator/admin.';
  end if;
  if p_grund is null or p_grund not in ('dublet', 'tone', 'off-topic', 'spam', 'andet') then
    raise exception 'Ugyldig grund.';
  end if;

  select po.author_id, th.title, th.slug, c.slug, left(po.body, 140)
    into v_author, v_title, v_tslug, v_cslug, v_snapshot
    from public.forum_posts po
    join public.forum_threads th on th.id = po.thread_id
    join public.forum_categories c on c.id = th.category_id
    where po.id = p_post_id;
  if not found then
    raise exception 'Indlægget findes ikke.';
  end if;

  update public.forum_posts set is_removed = true where id = p_post_id;

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('fjern_indlaeg', 'post', p_post_id, p_grund, p_fritekst, v_snapshot, auth.uid());

  if v_author is not null and v_author <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (
      v_author, 'moderation', auth.uid(), p_post_id,
      'Dit indlæg i "' || v_title || '" blev fjernet - grund: '
        || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/' || v_cslug || '/' || v_tslug
    );
  end if;

  if p_report_id is not null then
    update public.forum_reports set handled = true where id = p_report_id;
  end if;
end;
$$;

-- =========================================================================
-- mod_advar_bruger - advar/kontakt en bruger (uafhaengigt af en konkret traad).
--    Ingen indholds-aendring; kun log + notifikation. Deles med P20.
-- =========================================================================
create or replace function public.mod_advar_bruger(
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
  v_navn text;
begin
  if not public.er_moderator() then
    raise exception 'Kun moderator/admin.';
  end if;
  if p_grund is null or p_grund not in ('dublet', 'tone', 'off-topic', 'spam', 'andet') then
    raise exception 'Ugyldig grund.';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Ejer') into v_navn
    from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Brugeren findes ikke.';
  end if;

  insert into public.moderation_log
    (handling, maal_type, maal_id, grund, fritekst, snapshot, udfoert_af)
  values
    ('advar', 'user', p_user_id, p_grund, p_fritekst, v_navn, auth.uid());

  if p_user_id <> auth.uid() then
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (
      p_user_id, 'advarsel', auth.uid(), p_user_id,
      'Du har fået en advarsel fra moderationen - grund: '
        || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/regler'
    );
  end if;

  if p_report_id is not null then
    update public.forum_reports set handled = true where id = p_report_id;
  end if;
end;
$$;

-- =========================================================================
-- Grants: ingen public execute; kun authenticated (RPC'erne gater selv paa
-- er_moderator internt).
-- =========================================================================
revoke all on function public.mod_grund_tekst(text, text) from public;
grant execute on function public.mod_grund_tekst(text, text) to authenticated;

revoke all on function public.mod_fjern_traad(uuid, text, text, uuid) from public;
grant execute on function public.mod_fjern_traad(uuid, text, text, uuid) to authenticated;

revoke all on function public.mod_fjern_indlaeg(uuid, text, text, uuid) from public;
grant execute on function public.mod_fjern_indlaeg(uuid, text, text, uuid) to authenticated;

revoke all on function public.mod_advar_bruger(uuid, text, text, uuid) from public;
grant execute on function public.mod_advar_bruger(uuid, text, text, uuid) to authenticated;
