-- Zeekr Garage - Live moderator-praj ved forum-rapport (+ tekst-polish)
-- ---------------------------------------------------------------------------
-- Follow-up til P21: en indgaaende rapport var kun synlig via badget (taelt ved
-- sideindlaesning). Her faar moderatorer en RIGTIG notifikation i klokken naar en
-- bruger rapporterer - live, fordi notifications allerede er i realtime-
-- publication. "Koe, ikke patrulje" holder stadig: det er et praj, ikke en auto-
-- handling; moderatoren handler selv fra koeen.
--
-- Bonus: proper-ificerer M3's bruger-synlige notifikations-tekster (ASCII-digrafer
-- "traad"/"indlaeg"/"faaet" -> rigtige aeoeaa), jf. stave-konventionen. Kun
-- `tekst`-strengene aendres; logikken er identisk med M3.
--
-- Afhaenger af M2 (forum_reports) + M3 (mod_grund_tekst). Idempotent (create or
-- replace + drop trigger if exists).

-- =========================================================================
-- 1) Tekst-polish paa M3's tre RPC'er (kun notifikations-teksten aendres).
-- =========================================================================
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
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (v_author, 'moderation', auth.uid(), p_thread_id,
      'Din tråd "' || v_title || '" blev fjernet - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/regler');
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
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (v_author, 'moderation', auth.uid(), p_post_id,
      'Dit indlæg i "' || v_title || '" blev fjernet - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/' || v_cslug || '/' || v_tslug);
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
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (p_user_id, 'advarsel', auth.uid(), p_user_id,
      'Du har fået en advarsel fra moderationen - grund: ' || public.mod_grund_tekst(p_grund, p_fritekst),
      '/forum/regler');
  end if;
  if p_report_id is not null then update public.forum_reports set handled = true where id = p_report_id; end if;
end; $$;

-- =========================================================================
-- 2) forum_rapport_notify - ét praj pr. moderator ved en ny BRUGER-rapport.
--    security definer (klienten har ingen insert-policy paa notifications).
--    AI-flag (kilde='ai', P5) giver bevidst INTET praj her - de kan have egen
--    haandtering senere. Rapportoeren selv undtages (hvis denne skulle vaere mod).
-- =========================================================================
create or replace function public.forum_rapport_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter text;
  v_titel    text;
  v_hvad     text;
begin
  if new.kilde is distinct from 'bruger' then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'En ejer')
    into v_reporter from public.profiles where id = new.reporter_id;

  if new.post_id is not null then
    v_hvad := 'et indlæg';
    select th.title into v_titel
      from public.forum_posts po
      join public.forum_threads th on th.id = po.thread_id
      where po.id = new.post_id;
  else
    v_hvad := 'en tråd';
    select title into v_titel from public.forum_threads where id = new.thread_id;
  end if;

  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
  select
    p.id,
    'forum_rapport',
    new.reporter_id,
    coalesce(new.post_id, new.thread_id),
    v_reporter || ' rapporterede ' || v_hvad
      || coalesce(' i "' || v_titel || '"', '')
      || ' - grund: ' || public.mod_grund_tekst(coalesce(new.reason, 'andet'), null),
    '/admin/forum'
  from public.profiles p
  where p.role in ('admin', 'moderator')
    and p.id is distinct from new.reporter_id;

  return new;
end;
$$;

drop trigger if exists forum_reports_notify on public.forum_reports;
create trigger forum_reports_notify
  after insert on public.forum_reports
  for each row execute function public.forum_rapport_notify();
