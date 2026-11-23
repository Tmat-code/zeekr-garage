-- Zeekr Garage - Gruppe-samtaler i beskeder (P12)
-- ---------------------------------------------------------------------------
-- Udvider private beskeder fra 1:1 til N deltagere. Skemaet holdt allerede til
-- flere deltagere (conversation_participants er en ren join-tabel med PK
-- (conversation_id, user_id)); det der manglede var at SKELNE gruppe fra 1:1,
-- OPRETTELSE, ADMINISTRATION og afsender-navn i UI.
--
-- Beslutninger (aftalt med Torben 23-11-2026):
--  - is_group-FLAG (ikke afledt af deltager-antal). Afledte man "gruppe = >2
--    deltagere", ville en gruppe kollapse til en genbrugelig 1:1 i det oejeblik
--    nogen forlod den, og start_samtale kunne ramme den. Eksplicit flag = robust.
--  - Oprettelse: alle indloggede; 2+ modtagere => gruppe (1 => 1:1 som foer).
--  - Administration: KUN opretteren tilfoejer/fjerner/omdoeber; ALLE kan forlade.
--  - Navn valgfrit (afledes af deltagernavne i UI naar det mangler).
--  - Al medlems-mutation via SECURITY DEFINER-RPC'er (som start_samtale), saa
--    RLS forbliver stram: ingen bred insert/delete-policy paa deltager-tabellen.
--    Kun den eksisterende conv_part_update_own (egen last_read_at/hidden_at).
--
-- Uaendret paa grupper (bevidst, verificeret):
--  - P10 billeder: serve-ruten + er_besked_deltager/er_besked_afsender tjekker
--    "deltager i samtalen" antals-uafhaengigt => holder for N deltagere.
--  - P15 skjul-for-mig: saetter egen hidden_at pr. deltager => uaendret.
--  - Anmeldelser: message_reports + admin-RPC'en er samtale-/besked-baseret.
--  - Notifikationer: message_after_insert looper allerede over ALLE deltagere
--    undtagen afsender (her kun finpudset tekst for grupper).
--
-- Idempotent: if-not-exists + create-or-replace.

-- =========================================================================
-- 1) Udvid conversations
-- =========================================================================
alter table public.conversations
  add column if not exists is_group   boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists title      text;

-- =========================================================================
-- 2) start_samtale: is_group=false-vaern i genbrugs-opslaget
--    (saa en 2-mands-gruppe aldrig fejlagtigt genbruges som 1:1). Ellers uaendret.
-- =========================================================================
create or replace function public.start_samtale(p_other uuid)
returns uuid language plpgsql security definer
set search_path = public as $$
declare v_me uuid := auth.uid(); v_conv uuid;
begin
  if v_me is null then raise exception 'Log ind for at skrive beskeder.'; end if;
  if p_other = v_me then raise exception 'Du kan ikke skrive til dig selv.'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'Brugeren findes ikke.';
  end if;
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_me and blocked_id = p_other)
       or (blocker_id = p_other and blocked_id = v_me)
  ) then
    raise exception 'Samtale ikke mulig (blokeret).';
  end if;

  -- Eksisterende 1:1-samtale mellem netop de to (aldrig en gruppe)?
  select c.id into v_conv
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = p_other
  where c.is_group = false
    and (select count(*) from public.conversation_participants p where p.conversation_id = c.id) = 2
  limit 1;
  if v_conv is not null then return v_conv; end if;

  insert into public.conversations default values returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv, v_me), (v_conv, p_other);
  return v_conv;
end;
$$;

-- =========================================================================
-- 3) RPC: opret en gruppe-samtale (security definer)
--    p_others = de OEVRIGE deltagere (mig selv tilfoejes automatisk).
--    Mindst 2 andre (ellers er det en 1:1 - brug start_samtale).
-- =========================================================================
create or replace function public.start_gruppe(p_others uuid[], p_title text default null)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_conv   uuid;
  v_others uuid[];
  v_title  text;
begin
  if v_me is null then raise exception 'Log ind for at skrive beskeder.'; end if;

  -- Rens modtager-listen: fjern mig selv, dubletter og null.
  select array_agg(distinct x) into v_others
  from unnest(coalesce(p_others, '{}'::uuid[])) as x
  where x is not null and x <> v_me;

  if v_others is null or array_length(v_others, 1) < 2 then
    raise exception 'En gruppe kraever mindst to andre deltagere.';
  end if;
  if array_length(v_others, 1) > 50 then
    raise exception 'For mange deltagere i gruppen (maks 50).';
  end if;

  -- Alle modtagere skal findes.
  if (select count(*) from public.profiles where id = any(v_others))
     <> array_length(v_others, 1) then
    raise exception 'En eller flere brugere findes ikke.';
  end if;

  -- Ingen blokering mellem mig (opretter) og nogen af modtagerne (begge veje).
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_me and blocked_id = any(v_others))
       or (blocked_id = v_me and blocker_id = any(v_others))
  ) then
    raise exception 'Samtale ikke mulig (en af deltagerne er blokeret).';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  if v_title is not null and char_length(v_title) > 80 then
    v_title := left(v_title, 80);
  end if;

  insert into public.conversations (is_group, created_by, title)
  values (true, v_me, v_title)
  returning id into v_conv;

  insert into public.conversation_participants (conversation_id, user_id)
  select v_conv, v_me
  union
  select v_conv, unnest(v_others);

  return v_conv;
end;
$$;

-- =========================================================================
-- 4) RPC: tilfoej en deltager (KUN opretteren)
-- =========================================================================
create or replace function public.gruppe_tilfoej_deltager(p_conv uuid, p_user uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Log ind.'; end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conv and is_group = true and created_by = v_me
  ) then
    raise exception 'Kun gruppens opretter kan tilfoeje deltagere.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Brugeren findes ikke.';
  end if;
  -- Ingen blokering mellem opretter og den nye (begge veje).
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_me and blocked_id = p_user)
       or (blocker_id = p_user and blocked_id = v_me)
  ) then
    raise exception 'Kan ikke tilfoeje (blokeret).';
  end if;
  insert into public.conversation_participants (conversation_id, user_id)
  values (p_conv, p_user)
  on conflict (conversation_id, user_id) do nothing;
end;
$$;

-- =========================================================================
-- 5) RPC: fjern en deltager (KUN opretteren; ikke sig selv - brug forlad)
-- =========================================================================
create or replace function public.gruppe_fjern_deltager(p_conv uuid, p_user uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Log ind.'; end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conv and is_group = true and created_by = v_me
  ) then
    raise exception 'Kun gruppens opretter kan fjerne deltagere.';
  end if;
  if p_user = v_me then
    raise exception 'Brug "Forlad gruppe" for at fjerne dig selv.';
  end if;
  delete from public.conversation_participants
  where conversation_id = p_conv and user_id = p_user;
end;
$$;

-- =========================================================================
-- 6) RPC: forlad en gruppe ( enhver deltager, fjerner sig selv)
-- =========================================================================
create or replace function public.gruppe_forlad(p_conv uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Log ind.'; end if;
  if not exists (
    select 1 from public.conversations where id = p_conv and is_group = true
  ) then
    raise exception 'Kun gruppe-samtaler kan forlades.';
  end if;
  delete from public.conversation_participants
  where conversation_id = p_conv and user_id = v_me;
end;
$$;

-- =========================================================================
-- 7) RPC: omdoeb en gruppe (KUN opretteren; tom => afled af navne i UI)
-- =========================================================================
create or replace function public.gruppe_omdoeb(p_conv uuid, p_title text)
returns void language plpgsql security definer
set search_path = public as $$
declare v_me uuid := auth.uid(); v_title text;
begin
  if v_me is null then raise exception 'Log ind.'; end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conv and is_group = true and created_by = v_me
  ) then
    raise exception 'Kun gruppens opretter kan omdoebe gruppen.';
  end if;
  v_title := nullif(btrim(coalesce(p_title, '')), '');
  if v_title is not null and char_length(v_title) > 80 then
    v_title := left(v_title, 80);
  end if;
  update public.conversations set title = v_title where id = p_conv;
end;
$$;

-- Grants: ingen public, kun authenticated (RLS/gating i selve funktionerne).
revoke all on function public.start_gruppe(uuid[], text)            from public;
revoke all on function public.gruppe_tilfoej_deltager(uuid, uuid)   from public;
revoke all on function public.gruppe_fjern_deltager(uuid, uuid)     from public;
revoke all on function public.gruppe_forlad(uuid)                   from public;
revoke all on function public.gruppe_omdoeb(uuid, text)             from public;
grant execute on function public.start_gruppe(uuid[], text)          to authenticated;
grant execute on function public.gruppe_tilfoej_deltager(uuid, uuid) to authenticated;
grant execute on function public.gruppe_fjern_deltager(uuid, uuid)   to authenticated;
grant execute on function public.gruppe_forlad(uuid)                 to authenticated;
grant execute on function public.gruppe_omdoeb(uuid, text)           to authenticated;

-- =========================================================================
-- 8) Trigger-tekst: gruppe-bevidst notifikation ("X skrev i <gruppe>").
--    Looper stadig over ALLE deltagere undtagen afsender; én ulaest pr. samtale.
-- =========================================================================
create or replace function public.message_after_insert()
returns trigger language plpgsql security definer
set search_path = public as $$
declare v_navn text; v_href text; v_tekst text; v_is_group boolean; v_title text; r record;
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id
   returning is_group, title into v_is_group, v_title;

  select coalesce(nullif(trim(display_name), ''), 'En ejer') into v_navn
    from public.profiles where id = new.sender_id;
  v_navn := coalesce(v_navn, 'En ejer');
  v_href := '/beskeder/' || new.conversation_id;
  if coalesce(v_is_group, false) then
    v_tekst := v_navn || ' skrev i ' || coalesce(nullif(btrim(coalesce(v_title, '')), ''), 'en gruppe');
  else
    v_tekst := v_navn || ' sendte dig en besked';
  end if;

  for r in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    update public.notifications
       set tekst = v_tekst, created_at = new.created_at, aktoer_id = new.sender_id
     where modtager_id = r.user_id and type = 'pb_besked'
       and reference = new.conversation_id and er_laest = false;
    if not found then
      insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
      values (r.user_id, 'pb_besked', new.sender_id, new.conversation_id, v_tekst, v_href);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.message_after_insert();
