-- Zeekr Garage - Notifikationer (ét samlet system)
-- ---------------------------------------------------------------------------
-- Facebook-agtig klokke i nav'en med ulaest-tal. ALLE features skriver til
-- samme "indbakke" (notifications). Foerste kilde: forum-svar. Senere:
-- pb_besked (chat), mention, event.
--
-- Design-beslutninger (aftalt med Torben 22-11-2026):
--  - Man foelger KUN traade man selv har skrevet i (opret ELLER svar), IKKE
--    hele model-fora (ville stoeje). Registreres i traad_foelgere.
--  - Et nyt SVAR notificerer alle foelgere UNDTAGEN forfatteren selv.
--  - Indsaettelse af notifikationer sker KUN via trigger (security definer),
--    aldrig direkte fra klienten. Ejer laeser/markerer kun egne.
--  - Realtime paa notifications -> badge opdaterer live (samme mekanik driver
--    senere live-beskeder i chatten).
--
-- Idempotent: if-not-exists + drop-if-exists foran policies/triggers.

-- =========================================================================
-- 1) Tabeller
-- =========================================================================

-- Én indbakke for alle notifikationstyper. tekst/href er denormaliseret, saa
-- visning er ét hurtigt select uden joins (teksten fryses ved hændelsen).
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  modtager_id  uuid not null references public.profiles(id) on delete cascade,
  type         text not null,                 -- forum_svar | pb_besked | mention | event ...
  aktoer_id    uuid references public.profiles(id) on delete set null, -- hvem udloeste
  reference    uuid,                           -- traad-/samtale-id (kontekst)
  tekst        text not null,                  -- kort denormaliseret visningstekst
  href         text not null,                  -- hvor klik foerer hen
  er_laest     boolean not null default false,
  created_at   timestamptz not null default now()
);
-- Hurtig "mine nyeste" + ulaest-optaelling.
create index if not exists notifications_modtager_idx
  on public.notifications (modtager_id, created_at desc);
create index if not exists notifications_ulaest_idx
  on public.notifications (modtager_id) where er_laest = false;

-- Én raekke pr. bruger pr. traad man foelger. muted = behold raekken men stop
-- notifikationer (saa man kan gen-aktivere uden at miste historik).
create table if not exists public.traad_foelgere (
  thread_id  uuid not null references public.forum_threads(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  muted      boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create index if not exists traad_foelgere_thread_idx
  on public.traad_foelgere (thread_id);

-- =========================================================================
-- 2) Trigger: nyt forum-indlaeg
--    security definer => bypasser RLS internt (den der svarer ejer hverken
--    traad_foelgere-raekkerne eller notifications-raekkerne, men skal kunne
--    oprette begge). Dækker BAADE opret (aabnings-indlaeg) OG svar.
-- =========================================================================
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
  v_navn    text;
  v_href    text;
  v_tekst   text;
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

  v_href := '/forum/' || v_cat || '/' || v_tslug;

  -- Et SVAR (ikke aabnings-indlaegget) notificerer alle AKTIVE foelgere
  -- undtagen forfatteren selv.
  if not new.is_opening then
    select coalesce(nullif(trim(p.display_name), ''), 'En ejer')
      into v_navn
      from public.profiles p
     where p.id = new.author_id;
    v_navn := coalesce(v_navn, 'En ejer');
    v_tekst := v_navn || ' svarede i "' || v_title || '"';

    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    select f.user_id, 'forum_svar', new.author_id, new.thread_id, v_tekst, v_href
      from public.traad_foelgere f
     where f.thread_id = new.thread_id
       and f.muted = false
       and f.user_id <> new.author_id;
  end if;

  -- Forfatteren foelger nu traaden (opret ELLER svar). Idempotent.
  insert into public.traad_foelgere (thread_id, user_id)
  values (new.thread_id, new.author_id)
  on conflict (thread_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists forum_posts_notify on public.forum_posts;
create trigger forum_posts_notify
  after insert on public.forum_posts
  for each row execute function public.forum_post_notify();

-- =========================================================================
-- 3) Row Level Security
-- =========================================================================
alter table public.notifications  enable row level security;
alter table public.traad_foelgere enable row level security;

-- ---- notifications: ejer laeser/markerer/sletter KUN egne. Ingen insert-policy
--      => klienten kan ALDRIG oprette (kun trigger via security definer). ----
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (modtager_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (modtager_id = auth.uid()) with check (modtager_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (modtager_id = auth.uid());

-- ---- traad_foelgere: ejer ser/styrer egne raekker (mute/unfollow). Trigger
--      (security definer) staar for auto-indsaettelse ved opret/svar. ----
drop policy if exists traad_foelgere_select_own on public.traad_foelgere;
create policy traad_foelgere_select_own on public.traad_foelgere
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists traad_foelgere_insert_own on public.traad_foelgere;
create policy traad_foelgere_insert_own on public.traad_foelgere
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists traad_foelgere_update_own on public.traad_foelgere;
create policy traad_foelgere_update_own on public.traad_foelgere
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists traad_foelgere_delete_own on public.traad_foelgere;
create policy traad_foelgere_delete_own on public.traad_foelgere
  for delete to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- 4) Realtime: badge opdaterer live uden refresh.
--    replica identity full => UPDATE-payloads baerer hele raekken (markér læst).
-- =========================================================================
alter table public.notifications replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;
  end if;
end $$;
