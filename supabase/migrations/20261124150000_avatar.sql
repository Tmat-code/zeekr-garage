-- Zeekr Garage - Profilbillede (avatar) (P22)
-- ---------------------------------------------------------------------------
-- Brugere kan uploade et lille, kvadratisk profilbillede der vises som
-- forfatter paa deres oplaeg (forum, kommentarer, garage-badge, beskeder).
-- Lagring: selvhostet Supabase Storage, OFFENTLIG bucket 'avatar' - samme
-- moenster som forum-billeder (profiler + deres indhold er allerede
-- offentligt), IKKE den private besked-bucket. Browseren center-beskaerer +
-- resizer klient-side til ~256x256 og uploader direkte med brugerens JWT til
-- <user_id>/<uuid>.jpg; path'en gemmes i profiles.avatar_path.
--
-- Moderering: en avatar er en offentlig, bruger-uploadet billedflade -> kan
-- fjernes af en moderator (mod_fjern_avatar: handling + log + notif atomisk,
-- genbruger P21-moennstret / M1-M3). Selve filen ryddes af P9-sweepet, der nu
-- kender 'avatar'-bucketen (en nulstillet avatar_path goer filen foraeldreloes).
--
-- Afhaenger af M1 (moderation_log, er_moderator) + M3 (mod_grund_tekst).
-- Idempotent.

-- =========================================================================
-- 1) Denormaliseret felt paa profiler: stien til avatar-filen (null = ingen).
-- =========================================================================
alter table public.profiles
  add column if not exists avatar_path text;

-- =========================================================================
-- 2) Storage-bucket (offentlig laesning, kun billeder, maks 5 MB).
--    Samme opsaetning som forum-bucketen. (Klient-resizen goer de reelle filer
--    smaa; graensen er vaernet, parallelt med de oevrige billed-spor.)
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar', 'avatar', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Offentlig laesning (bucket er public; policyen goer listing muligt - P9-sweep).
drop policy if exists avatar_read on storage.objects;
create policy avatar_read on storage.objects
  for select using (bucket_id = 'avatar');

-- Upload: kun i egen mappe (foerste path-segment = ens eget bruger-id).
drop policy if exists avatar_insert on storage.objects;
create policy avatar_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Slet egne uploads (skift/fjern eget billede).
drop policy if exists avatar_delete_own on storage.objects;
create policy avatar_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatar'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Moderator maa slette enhver avatar (oprydning efter mod_fjern_avatar).
drop policy if exists avatar_delete_mod on storage.objects;
create policy avatar_delete_mod on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatar' and public.er_moderator());

-- =========================================================================
-- 3) mod_fjern_avatar - moderator fjerner en upassende avatar MED grund.
--    ATOMISK (samme transaktion): nulstil profiles.avatar_path + audit-log
--    (moderation_log, M1) + officiel notifikation til brugeren (type
--    'moderation', genbruger NotifBell's 🛡-ikon fra P21 - ingen ny UI-type).
--    Selve storage-filen fjernes IKKE her (SQL kan ikke slette selve objektet);
--    den nulstillede path goer filen foraeldreloes, og P9-sweepet rydder den.
--    p_report_id (valgfri): markér en udloesende forum-rapport haandteret.
-- =========================================================================
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
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    values (
      p_user_id, 'moderation', auth.uid(), p_user_id,
      'Dit profilbillede blev fjernet - grund: '
        || public.mod_grund_tekst(p_grund, p_fritekst),
      '/garage'
    );
  end if;

  if p_report_id is not null then
    update public.forum_reports set handled = true where id = p_report_id;
  end if;
end;
$$;

-- Ingen public execute; kun authenticated (RPC'en gater selv paa er_moderator).
revoke all on function public.mod_fjern_avatar(uuid, text, text, uuid) from public;
grant execute on function public.mod_fjern_avatar(uuid, text, text, uuid) to authenticated;
