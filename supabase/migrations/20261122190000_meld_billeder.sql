-- Zeekr Garage - Billeder i feedback-meldinger (P3)
-- ---------------------------------------------------------------------------
-- Foto-bevis i fejlmeldinger. Styrker QA-sagen mod Zeekr markant: en fejl med
-- et billede (skærmbillede af OTA-fejl, fysisk defekt, log) vejer tungere end
-- en ren tekst-melding.
--
-- Lagring: selvhostet Supabase Storage (bucket 'meld', public read). Browseren
-- uploader direkte med brugerens JWT til <user_id>/<uuid>.<ext>; path gemmes i
-- issue_images og vises via den offentlige URL. Samme mønster som 'forum'-bucket
-- (se 20261122130000_forum_billeder.sql) - men egen bucket + egen tabel, så
-- oprydning (P9) og regler kan holdes adskilt fra forummet.
--
-- Idempotent.

-- =========================================================================
-- 1) Storage-bucket (public læsning, kun billeder, maks 5 MB)
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meld', 'meld', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage-policies på storage.objects (RLS er slået til som standard).
-- Offentlig læsning (bucket er public; policyen gør listing muligt).
drop policy if exists meld_billeder_read on storage.objects;
create policy meld_billeder_read on storage.objects
  for select using (bucket_id = 'meld');

-- Upload: kun i egen mappe (første path-segment = ens eget bruger-id).
drop policy if exists meld_billeder_insert on storage.objects;
create policy meld_billeder_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meld'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Slet egne uploads (fx fjernet før meldingen blev oprettet).
drop policy if exists meld_billeder_delete_own on storage.objects;
create policy meld_billeder_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'meld'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Moderator må slette ethvert meld-billede (oprydning).
drop policy if exists meld_billeder_delete_mod on storage.objects;
create policy meld_billeder_delete_mod on storage.objects
  for delete to authenticated
  using (bucket_id = 'meld' and public.er_moderator());

-- =========================================================================
-- 2) Kobling: billeder pr. feedback-melding (issue)
-- =========================================================================
create table if not exists public.issue_images (
  id            uuid primary key default gen_random_uuid(),
  issue_id      uuid not null references public.issues(id) on delete cascade,
  path          text not null,              -- path i 'meld'-bucketen
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists issue_images_issue_idx
  on public.issue_images (issue_id, display_order);

alter table public.issue_images enable row level security;

-- Læs alle (offentligt board, SSR/SEO).
drop policy if exists issue_images_read on public.issue_images;
create policy issue_images_read on public.issue_images
  for select using (true);

-- Insert: kun billeder på ens EGEN melding.
drop policy if exists issue_images_insert on public.issue_images;
create policy issue_images_insert on public.issue_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.issues i
      where i.id = issue_id and i.created_by = auth.uid()
    )
  );

-- Slet: egen meldings billeder, eller moderator.
drop policy if exists issue_images_delete on public.issue_images;
create policy issue_images_delete on public.issue_images
  for delete to authenticated
  using (
    public.er_moderator()
    or exists (
      select 1 from public.issues i
      where i.id = issue_id and i.created_by = auth.uid()
    )
  );
