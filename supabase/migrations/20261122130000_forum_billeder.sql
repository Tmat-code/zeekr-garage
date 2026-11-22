-- Zeekr Garage - Billeder i forum-indlæg
-- ---------------------------------------------------------------------------
-- Brugere kan vedhæfte billeder til forum-indlæg (åbnings-indlæg + svar).
-- Lagring: selvhostet Supabase Storage (bucket 'forum', public read). Browseren
-- uploader direkte med brugerens JWT til <user_id>/<uuid>.<ext>; path gemmes i
-- forum_post_images og vises via den offentlige URL.
--
-- Idempotent.

-- =========================================================================
-- 1) Storage-bucket (public læsning, kun billeder, maks 5 MB)
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum', 'forum', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage-policies på storage.objects (RLS er slået til som standard).
-- Offentlig læsning (bucket er public, men policyen gør listing muligt).
drop policy if exists forum_billeder_read on storage.objects;
create policy forum_billeder_read on storage.objects
  for select using (bucket_id = 'forum');

-- Upload: kun i egen mappe (første path-segment = ens eget bruger-id).
drop policy if exists forum_billeder_insert on storage.objects;
create policy forum_billeder_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'forum'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Slet egne uploads.
drop policy if exists forum_billeder_delete_own on storage.objects;
create policy forum_billeder_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'forum'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Moderator må slette ethvert forum-billede (oprydning).
drop policy if exists forum_billeder_delete_mod on storage.objects;
create policy forum_billeder_delete_mod on storage.objects
  for delete to authenticated
  using (bucket_id = 'forum' and public.er_moderator());

-- =========================================================================
-- 2) Kobling: billeder pr. forum-indlæg
-- =========================================================================
create table if not exists public.forum_post_images (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.forum_posts(id) on delete cascade,
  path          text not null,              -- path i 'forum'-bucketen
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists forum_post_images_post_idx
  on public.forum_post_images (post_id, display_order);

alter table public.forum_post_images enable row level security;

-- Læs alle (offentligt forum, SSR/SEO).
drop policy if exists forum_post_images_read on public.forum_post_images;
create policy forum_post_images_read on public.forum_post_images
  for select using (true);

-- Insert: kun billeder på ens EGET indlæg.
drop policy if exists forum_post_images_insert on public.forum_post_images;
create policy forum_post_images_insert on public.forum_post_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.forum_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- Slet: eget indlægs billeder, eller moderator.
drop policy if exists forum_post_images_delete on public.forum_post_images;
create policy forum_post_images_delete on public.forum_post_images
  for delete to authenticated
  using (
    public.er_moderator()
    or exists (
      select 1 from public.forum_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );
