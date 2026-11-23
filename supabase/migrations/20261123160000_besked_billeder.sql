-- Zeekr Garage - Billeder i private beskeder (P10)
-- ---------------------------------------------------------------------------
-- Afslutter billed-sporet (P3 meld -> P8 forum-edit -> P9 oprydning -> P10
-- beskeder). En bruger kan vedhaefte 1..n billeder til en besked i en 1:1-
-- samtale og se dem i traaden. Mobil-kamera virker gratis via den delte
-- BilledeUpload-komponent (accept="image/*").
--
-- DEN AFGOERENDE FORSKEL FRA FORUM/MELD = PRIVATLIV.
-- Forum- og meld-billeder ligger bevidst i PUBLIC read-buckets (enhver kan se
-- dem - offentligt board/forum, SEO). Private beskeder maa IKKE det: kun
-- samtalens to parter maa kunne hente billederne. Derfor:
--   1) bucketen 'besked' er PRIVAT (public=false) og har INGEN offentlig/bred
--      laese-policy paa storage.objects. Ingen public-URL-vej (billedeUrl()).
--   2) billederne hentes gennem en authz'd serve-rute i appen
--      (app/beskeder/billede/[...sti]/route.ts), der paa HVER forespoergsel
--      verificerer at kalderen enten er uploader eller deltager i samtalen,
--      og foerst derefter streamer bytes via service-rollen. Ingen signed-URL-
--      token der kan videresendes.
--   3) message_images-RLS lader KUN samtale-parter laese/skrive raekkerne.
--      Moderatorer faar bevidst IKKE laese-adgang til besked-billeder (de kan
--      kun slette, uden at se) - samme privatlivsvalg som besked-anmeldelser,
--      hvor kun anmeldt indhold eksponeres.
--
-- Idempotent: if-not-exists + drop/create-or-replace.

-- =========================================================================
-- 1) PRIVAT storage-bucket (INGEN offentlig laesning, kun billeder, maks 5 MB)
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('besked', 'besked', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,          -- håndhæv privat selv hvis den fandtes
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage-policies paa storage.objects.
-- BEVIDST INGEN SELECT-policy: ingen (hverken anon, authenticated eller
-- moderator) kan liste/laese 'besked'-objekter direkte. Appen laeser bytes via
-- service-rollen (bypasser RLS) i serve-ruten, EFTER egen deltager-check.

-- Upload: kun i egen mappe (foerste path-segment = ens eget bruger-id).
-- (Browseren uploader direkte med brugerens JWT, foer beskeden sendes.)
drop policy if exists besked_billeder_insert on storage.objects;
create policy besked_billeder_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'besked'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Slet egne uploads (fx fjernet i composeren foer beskeden blev sendt).
drop policy if exists besked_billeder_delete_own on storage.objects;
create policy besked_billeder_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'besked'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Moderator maa slette ethvert besked-billede (oprydning efter anmeldelse),
-- men IKKE laese det (ingen select-policy ovenfor) - slet uden at se.
drop policy if exists besked_billeder_delete_mod on storage.objects;
create policy besked_billeder_delete_mod on storage.objects
  for delete to authenticated
  using (bucket_id = 'besked' and public.er_moderator());

-- =========================================================================
-- 2) Hjaelpere (security definer => bypasser RLS internt, undgaar rekursion;
--    samme moenster som er_deltager/er_blokeret i beskeder-migrationen)
-- =========================================================================

-- Er jeg deltager i samtalen som beskeden hoerer til?
create or replace function public.er_besked_deltager(p_message uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from public.messages m
    join public.conversation_participants cp
      on cp.conversation_id = m.conversation_id
    where m.id = p_message and cp.user_id = auth.uid()
  );
$$;

-- Er jeg afsender af beskeden? (til insert/delete af dens billed-raekker)
create or replace function public.er_besked_afsender(p_message uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.messages m
    where m.id = p_message and m.sender_id = auth.uid()
  );
$$;

-- =========================================================================
-- 3) Kobling: billeder pr. besked
-- =========================================================================
create table if not exists public.message_images (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references public.messages(id) on delete cascade,
  path          text not null,              -- path i 'besked'-bucketen
  display_order int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists message_images_message_idx
  on public.message_images (message_id, display_order);
-- Serve-ruten slaar op paa path (find samtalen for et billede) - indekser det.
create index if not exists message_images_path_idx
  on public.message_images (path);

alter table public.message_images enable row level security;

-- Laes: KUN samtale-parter (ikke offentligt, ikke moderator).
drop policy if exists message_images_read on public.message_images;
create policy message_images_read on public.message_images
  for select to authenticated
  using (public.er_besked_deltager(message_id));

-- Insert: kun billeder paa ens EGEN besked (afsender).
drop policy if exists message_images_insert on public.message_images;
create policy message_images_insert on public.message_images
  for insert to authenticated
  with check (public.er_besked_afsender(message_id));

-- Slet: egen besked, eller moderator (oprydning efter anmeldelse).
drop policy if exists message_images_delete on public.message_images;
create policy message_images_delete on public.message_images
  for delete to authenticated
  using (
    public.er_moderator()
    or public.er_besked_afsender(message_id)
  );
