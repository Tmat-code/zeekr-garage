-- Zeekr Garage - Forum (custom, Next.js + Supabase)
-- ---------------------------------------------------------------------------
-- Diskussionsforum ud over Feedback-boardet. UX-forbillede: polestar-forum.com
-- (grupper -> kategori-raekker -> traadliste -> traad). Discourse fravalgt
-- 21-11-2026; Supabase er eneste IdP -> ingen SSO-bro.
--
-- Adgang som resten: alt offentligt laesbart (SSR/SEO); login kun for at skrive.
-- Moderering via er_moderator()/er_admin() paa EGEN session (ingen service_role).
-- Bevidst fravalg: INGEN "Problemer"-kategori -> det ER Feedback-boardet.
--
-- Idempotent: if-not-exists + drop-if-exists foran policies/triggers.

-- =========================================================================
-- 1) Tabeller
-- =========================================================================

-- Kategorier: grupperet (group_label) som hos Polestar. En kategori kan vaere
-- koblet til en model (model_id != null = model-forum) eller tvaergaaende (null).
create table if not exists public.forum_categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  icon          text,                         -- emoji
  group_label   text not null,                -- gruppe-overskrift (Velkommen / Modellerne / ...)
  group_order   int  not null default 0,      -- raekkefoelge MELLEM grupper
  display_order int  not null default 0,      -- raekkefoelge I gruppen
  model_id      uuid references public.models(id) on delete set null,
  is_locked     boolean not null default false, -- true => kun moderator opretter traade (fx regler)
  created_at    timestamptz not null default now()
);
create index if not exists forum_categories_group_idx
  on public.forum_categories (group_order, display_order);

-- Traade. last_post_at + reply_count er denormaliseret (vedligeholdt af triggers)
-- saa traad-/kategorilister er hurtige uden aggregater.
create table if not exists public.forum_threads (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.forum_categories(id) on delete cascade,
  author_id    uuid references public.profiles(id) on delete set null,
  title        text not null,
  slug         text not null,                 -- slugify(titel)-<rand> til pæn URL
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  reply_count  int     not null default 0,    -- antal SVAR (ekskl. aabnings-indlaeg)
  view_count   int     not null default 0,
  is_pinned    boolean not null default false,
  is_locked    boolean not null default false,
  is_removed   boolean not null default false
);
create index if not exists forum_threads_slug_idx on public.forum_threads (slug);
create index if not exists forum_threads_list_idx
  on public.forum_threads (category_id, is_pinned desc, last_post_at desc);

-- Indlaeg. Det foerste indlaeg (is_opening) er selve traadens tekst.
create table if not exists public.forum_posts (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.forum_threads(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null,
  is_opening  boolean not null default false,
  edited      boolean not null default false,
  is_removed  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists forum_posts_thread_idx
  on public.forum_posts (thread_id, created_at);

-- =========================================================================
-- 2) Triggers
--    security definer => bypasser RLS internt. Noedvendigt fordi den der
--    svarer paa en traad (ikke ejer) ellers ikke maa UPDATE'e traad-raekken.
-- =========================================================================

-- updated_at-touch (genbruger den eksisterende funktion fra init)
drop trigger if exists forum_threads_touch on public.forum_threads;
create trigger forum_threads_touch
  before update on public.forum_threads
  for each row execute function public.touch_updated_at();

drop trigger if exists forum_posts_touch on public.forum_posts;
create trigger forum_posts_touch
  before update on public.forum_posts
  for each row execute function public.touch_updated_at();

-- nyt indlaeg -> bump traadens last_post_at + reply_count (ekskl. aabning)
create or replace function public.forum_post_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_threads
     set last_post_at = greatest(last_post_at, new.created_at),
         reply_count  = reply_count + case when new.is_opening then 0 else 1 end
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists forum_posts_after_insert on public.forum_posts;
create trigger forum_posts_after_insert
  after insert on public.forum_posts
  for each row execute function public.forum_post_after_insert();

-- soft-remove/gendan af et SVAR -> hold reply_count korrekt
create or replace function public.forum_post_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_removed is distinct from old.is_removed and not new.is_opening then
    update public.forum_threads
       set reply_count = greatest(0, reply_count + case when new.is_removed then -1 else 1 end)
     where id = new.thread_id;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_posts_after_update on public.forum_posts;
create trigger forum_posts_after_update
  after update on public.forum_posts
  for each row execute function public.forum_post_after_update();

-- visnings-taeller: bumpes fra browseren (rigtige besoeg, ikke SSR/bots).
-- security definer saa anon/auth kan bumpe uden UPDATE-ret paa traaden.
create or replace function public.bump_thread_view(t uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.forum_threads set view_count = view_count + 1
   where id = t and is_removed = false;
$$;
grant execute on function public.bump_thread_view(uuid) to anon, authenticated;

-- =========================================================================
-- 3) Row Level Security
--    Laesning: offentlig. Skrivning: authenticated + egne raekker; moderator alt.
-- =========================================================================
alter table public.forum_categories enable row level security;
alter table public.forum_threads    enable row level security;
alter table public.forum_posts      enable row level security;

-- ---- kategorier: laes alle; kun moderator skriver ----
drop policy if exists forum_categories_read_all on public.forum_categories;
create policy forum_categories_read_all on public.forum_categories
  for select using (true);

drop policy if exists forum_categories_write_mod on public.forum_categories;
create policy forum_categories_write_mod on public.forum_categories
  for all to authenticated
  using (public.er_moderator()) with check (public.er_moderator());

-- ---- traade: laes alle; opret (ikke i laast kategori); ret/slet egne; moderator alt ----
drop policy if exists forum_threads_read_all on public.forum_threads;
create policy forum_threads_read_all on public.forum_threads
  for select using (true);

drop policy if exists forum_threads_insert_auth on public.forum_threads;
create policy forum_threads_insert_auth on public.forum_threads
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (
      select 1 from public.forum_categories c
      where c.id = category_id and c.is_locked
    )
  );

drop policy if exists forum_threads_insert_mod on public.forum_threads;
create policy forum_threads_insert_mod on public.forum_threads
  for insert to authenticated
  with check (public.er_moderator() and author_id = auth.uid());

drop policy if exists forum_threads_update_own on public.forum_threads;
create policy forum_threads_update_own on public.forum_threads
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists forum_threads_update_mod on public.forum_threads;
create policy forum_threads_update_mod on public.forum_threads
  for update to authenticated
  using (public.er_moderator()) with check (public.er_moderator());

drop policy if exists forum_threads_delete_own on public.forum_threads;
create policy forum_threads_delete_own on public.forum_threads
  for delete to authenticated using (author_id = auth.uid());

drop policy if exists forum_threads_delete_mod on public.forum_threads;
create policy forum_threads_delete_mod on public.forum_threads
  for delete to authenticated using (public.er_moderator());

-- ---- indlaeg: laes alle; svar (ikke i laast/fjernet traad); ret/slet egne; moderator alt ----
drop policy if exists forum_posts_read_all on public.forum_posts;
create policy forum_posts_read_all on public.forum_posts
  for select using (true);

drop policy if exists forum_posts_insert_auth on public.forum_posts;
create policy forum_posts_insert_auth on public.forum_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (
      select 1 from public.forum_threads th
      where th.id = thread_id and (th.is_locked or th.is_removed)
    )
  );

drop policy if exists forum_posts_insert_mod on public.forum_posts;
create policy forum_posts_insert_mod on public.forum_posts
  for insert to authenticated
  with check (public.er_moderator() and author_id = auth.uid());

drop policy if exists forum_posts_update_own on public.forum_posts;
create policy forum_posts_update_own on public.forum_posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists forum_posts_update_mod on public.forum_posts;
create policy forum_posts_update_mod on public.forum_posts
  for update to authenticated
  using (public.er_moderator()) with check (public.er_moderator());

drop policy if exists forum_posts_delete_own on public.forum_posts;
create policy forum_posts_delete_own on public.forum_posts
  for delete to authenticated using (author_id = auth.uid());

drop policy if exists forum_posts_delete_mod on public.forum_posts;
create policy forum_posts_delete_mod on public.forum_posts
  for delete to authenticated using (public.er_moderator());

-- =========================================================================
-- 4) Seed: grupper + kategorier (idempotent paa slug)
--    Bevidst INGEN "Problemer & paalidelighed"-kategori -> Feedback-boardet.
-- =========================================================================

-- Faste (ikke-model) kategorier
insert into public.forum_categories
  (slug, name, description, icon, group_label, group_order, display_order, is_locked)
values
  ('praesenter-dig', 'Præsentér dig',
   'Ny her? Sig hej, og fortæl hvilken Zeekr du kører - eller drømmer om.',
   '👋', 'Velkommen', 1, 1, false),
  ('regler', 'Community-regler',
   'Sådan holder vi en god, konstruktiv tone. Læs før du poster.',
   '📋', 'Velkommen', 1, 2, true),
  ('koeb-priser-levering', 'Køb, priser & levering',
   'Bestilling, priser, leveringstider og dialog med forhandleren.',
   '💰', 'Ejer-lounge', 3, 1, false),
  ('anmeldelser', 'Anmeldelser & langtidstest',
   'Dine indtryk efter uger og måneder bag rattet.',
   '⭐', 'Ejer-lounge', 3, 2, false),
  ('billeder-videoer', 'Billeder & videoer',
   'Vis din bil frem - foto, clips og roadtrips.',
   '📷', 'Ejer-lounge', 3, 3, false),
  ('software-ota', 'Software & OTA',
   'Nye opdateringer, changelogs og hvad de ændrer. (Rigtige fejl → Feedback.)',
   '💾', 'Teknik', 4, 1, false),
  ('opladning-raekkevidde', 'Opladning & rækkevidde',
   'Ladekurver, forbrug, vinter-rækkevidde og ladenetværk i Norden.',
   '🔌', 'Teknik', 4, 2, false),
  ('tilbehoer-dele', 'Tilbehør & dele',
   'Måtter, tagbøjler, folie, originaldele og aftermarket.',
   '🧩', 'Teknik', 4, 3, false),
  ('app-infotainment', 'App & infotainment',
   'Zeekr-app, skærm, lyd, CarPlay/Android og smarte tips.',
   '📱', 'Teknik', 4, 4, false)
on conflict (slug) do nothing;

-- Model-foraene (rygraden): ét pr. model, slug = model-slug
insert into public.forum_categories
  (slug, name, description, icon, group_label, group_order, display_order, model_id)
select m.slug, m.name,
       'Alt om ' || m.name || ' - snak, spørgsmål og erfaringer.',
       '🚗', 'Modellerne', 2, m.display_order, m.id
from public.models m
on conflict (slug) do nothing;
