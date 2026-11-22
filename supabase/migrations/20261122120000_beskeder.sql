-- Zeekr Garage - Private beskeder (PB / chat mellem brugere)
-- ---------------------------------------------------------------------------
-- Bygger oven på notifikations-kernen (20261122100000): en ny besked giver en
-- 'pb_besked'-notifikation i samme indbakke/klokke.
--
-- Beslutninger (aftalt med Torben): alle indloggede kan skrive til alle, med
-- blokér + anmeld. Realtime på beskeder (samme setAuth-mønster som klokken).
--
-- RLS uden rekursion: conversation_participants-policies ville kalde sig selv,
-- så adgang tjekkes via SECURITY DEFINER-helpere (er_deltager/er_blokeret), der
-- bypasser RLS internt. Samme mønster som er_admin()/er_moderator().
--
-- Idempotent: if-not-exists + drop-if-exists.

-- =========================================================================
-- 1) Tabeller
-- =========================================================================

-- En samtale (pt. altid 1:1, men modellen holder til flere deltagere).
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

-- Deltagere + hver deltagers "sidst læst" (til ulæst-markering pr. samtale).
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conv_part_user_idx
  on public.conversation_participants (user_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx
  on public.messages (conversation_id, created_at);

-- Blokering: A blokerer B => ingen af dem kan skrive til hinanden (begge veje).
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Anmeldelser (moderering genbruger admin/moderator-roller).
create table if not exists public.message_reports (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid references public.messages(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reporter_id     uuid references public.profiles(id) on delete set null,
  reason          text,
  handled         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- =========================================================================
-- 2) Hjælpere (security definer => bypasser RLS internt, undgår rekursion)
-- =========================================================================
create or replace function public.er_deltager(p_conv uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conv and user_id = auth.uid()
  );
$$;

-- Er der en blokering mellem mig og en anden deltager i samtalen (begge veje)?
create or replace function public.er_blokeret(p_conv uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.user_blocks ub
      on (ub.blocker_id = auth.uid() and ub.blocked_id = cp.user_id)
      or (ub.blocker_id = cp.user_id and ub.blocked_id = auth.uid())
    where cp.conversation_id = p_conv and cp.user_id <> auth.uid()
  );
$$;

-- =========================================================================
-- 3) RPC: find-eller-opret en 1:1-samtale (security definer)
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

  -- Eksisterende 1:1-samtale mellem netop de to?
  select c.id into v_conv
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = p_other
  where (select count(*) from public.conversation_participants p where p.conversation_id = c.id) = 2
  limit 1;
  if v_conv is not null then return v_conv; end if;

  insert into public.conversations default values returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv, v_me), (v_conv, p_other);
  return v_conv;
end;
$$;

-- =========================================================================
-- 4) Trigger: ny besked -> bump samtale + pb_besked-notifikation til modtager
--    (én ulæst notifikation pr. samtale pr. modtager - opdateres i stedet for
--    at spamme én pr. besked).
-- =========================================================================
create or replace function public.message_after_insert()
returns trigger language plpgsql security definer
set search_path = public as $$
declare v_navn text; v_href text; v_tekst text; r record;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;

  select coalesce(nullif(trim(display_name), ''), 'En ejer') into v_navn
    from public.profiles where id = new.sender_id;
  v_navn  := coalesce(v_navn, 'En ejer');
  v_href  := '/beskeder/' || new.conversation_id;
  v_tekst := v_navn || ' sendte dig en besked';

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

-- =========================================================================
-- 5) Row Level Security
-- =========================================================================
alter table public.conversations            enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;
alter table public.user_blocks               enable row level security;
alter table public.message_reports           enable row level security;

-- conversations: kun deltagere ser dem. (Opret sker via start_samtale, sec.def.)
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated using (public.er_deltager(id));

-- deltagere: se alle deltager-rækker i samtaler jeg er med i; opdatér egen
-- (last_read_at). Indsættelse sker kun via start_samtale (security definer).
drop policy if exists conv_part_select on public.conversation_participants;
create policy conv_part_select on public.conversation_participants
  for select to authenticated using (public.er_deltager(conversation_id));

drop policy if exists conv_part_update_own on public.conversation_participants;
create policy conv_part_update_own on public.conversation_participants
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- beskeder: deltagere læser; send = egen afsender + deltager + ikke blokeret.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.er_deltager(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.er_deltager(conversation_id)
    and not public.er_blokeret(conversation_id)
  );

-- moderator må fjerne beskeder (oprydning efter anmeldelse)
drop policy if exists messages_delete_mod on public.messages;
create policy messages_delete_mod on public.messages
  for delete to authenticated using (public.er_moderator());

-- blokeringer: jeg styrer mine egne.
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- anmeldelser: enhver indlogget kan anmelde (egen reporter_id); moderator læser/opdaterer.
drop policy if exists reports_insert_own on public.message_reports;
create policy reports_insert_own on public.message_reports
  for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists reports_select_mod on public.message_reports;
create policy reports_select_mod on public.message_reports
  for select to authenticated using (public.er_moderator());
drop policy if exists reports_update_mod on public.message_reports;
create policy reports_update_mod on public.message_reports
  for update to authenticated using (public.er_moderator()) with check (public.er_moderator());

-- =========================================================================
-- 6) Realtime: live beskeder i den åbne samtale.
-- =========================================================================
alter table public.messages replica identity full;

do $REALTIME$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
  end if;
end $REALTIME$;
