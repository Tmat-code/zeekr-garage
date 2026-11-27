-- Zeekr Garage - Kontakt-beskeder (privat bagdoer til staben)
-- ---------------------------------------------------------------------------
-- En PRIVAT henvendelses-kanal: en indlogget bruger skriver DIREKTE til staben
-- om noget der IKKE hoerer til offentligt (klage over en anden bruger,
-- GDPR/sikkerhed, personligt). IKKE rigtig mail - en formular paa /kontakt der
-- lander i databasen + et praj i klokken til staben.
--
-- Bevidst adskilt fra:
--   - bil-feedbacken (/feedback -> issues) = QA-signalet til Zeekr
--   - den offentlige "Om Zeekr Garage"-forumgruppe = offentlige oensker/fejl om siden
--
-- Beslutninger (afklaret med Torben 26-11-2026):
--   - KUN indloggede kan skrive (navn/bruger-id foelger automatisk med; mindst
--     spam). Insert sker KUN via security-definer RPC kontakt_opret - der er
--     bevidst INGEN insert-policy, saa klienten kan aldrig spoofe user_id/navn.
--   - Laesning: HELE staben (er_moderator = moderator/admin/superadmin), som
--     resten af Vaerkstedet.
--   - Notifikation: in-app klokke, genbrug af notifications (praecis som
--     forum_rapport_notify prajer staben ved en ny rapport). Trigger prajer alle
--     tre stab-roller, superadmin (Torben) inkl.
--
-- Afhaenger af: profiles (role), er_moderator() (admin_roles/P32), notifications
-- (20261122100000). Idempotent: if-not-exists + drop-if-exists/create-or-replace.

-- =========================================================================
-- 1) Tabel
--    user_id nullable: login-only i dag (altid sat = auth.uid()), men nullable
--    saa en evt. senere aabning for ikke-indloggede ikke kraever skema-aendring.
--    navn er DENORMALISERET (frosset ved indsendelse) = samme moenster som
--    notifications.tekst; sat server-side fra profilen, ikke af klienten.
-- =========================================================================
create table if not exists public.kontakt_beskeder (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  navn       text not null,
  svar_mail  text,
  emne       text not null,
  besked     text not null,
  behandlet  boolean not null default false,
  created_at timestamptz not null default now()
);
-- Koe-opslag: ubehandlede foerst, nyeste foerst.
create index if not exists kontakt_beskeder_open_idx
  on public.kontakt_beskeder (behandlet, created_at desc);

-- =========================================================================
-- 2) Row Level Security
--    INGEN insert-policy  => klienten kan ALDRIG indsaette direkte; kun via den
--                            security-definer RPC kontakt_opret (samme princip
--                            som notifications/forum_link_previews).
--    select: hele staben (er_moderator).
--    INGEN update/delete-policy => markér-behandlet sker kun via RPC
--                            kontakt_saet_behandlet (stab-gated).
-- =========================================================================
alter table public.kontakt_beskeder enable row level security;

drop policy if exists kontakt_beskeder_select_mod on public.kontakt_beskeder;
create policy kontakt_beskeder_select_mod on public.kontakt_beskeder
  for select to authenticated using (public.er_moderator());

-- =========================================================================
-- 3) kontakt_opret - den ENESTE skrive-sti for en henvendelse.
--    security definer: stempler user_id = auth.uid() + fryser navn fra profilen,
--    saa hverken afsender eller navn kan forfalskes fra klienten. Login-only:
--    afviser hvis auth.uid() er null. Validerer emne/besked/svar-mail.
-- =========================================================================
create or replace function public.kontakt_opret(
  p_emne text,
  p_besked text,
  p_svar_mail text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_navn   text;
  v_emne   text := nullif(btrim(p_emne), '');
  v_besked text := nullif(btrim(p_besked), '');
  v_mail   text := nullif(btrim(p_svar_mail), '');
  v_id     uuid;
begin
  if v_uid is null then
    raise exception 'Log ind for at sende en henvendelse.';
  end if;
  if v_emne is null or v_besked is null then
    raise exception 'Emne og besked skal udfyldes.';
  end if;
  if char_length(v_emne) > 160 then
    raise exception 'Emnet er for langt (maks 160 tegn).';
  end if;
  if char_length(v_besked) > 4000 then
    raise exception 'Beskeden er for lang (maks 4000 tegn).';
  end if;
  if v_mail is not null
     and (char_length(v_mail) > 200
          or v_mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'Svar-mailen ser ikke rigtig ud.';
  end if;

  select coalesce(nullif(btrim(display_name), ''), 'Ejer')
    into v_navn
    from public.profiles
   where id = v_uid;
  v_navn := coalesce(v_navn, 'Ejer');

  insert into public.kontakt_beskeder (user_id, navn, svar_mail, emne, besked)
  values (v_uid, v_navn, v_mail, v_emne, v_besked)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.kontakt_opret(text, text, text) from public;
grant execute on function public.kontakt_opret(text, text, text) to authenticated;

-- =========================================================================
-- 4) kontakt_saet_behandlet - markér/afmarkér behandlet. Stab-gated.
-- =========================================================================
create or replace function public.kontakt_saet_behandlet(
  p_id uuid,
  p_behandlet boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.er_moderator() then
    raise exception 'Kun stab.';
  end if;
  update public.kontakt_beskeder
     set behandlet = coalesce(p_behandlet, true)
   where id = p_id;
  if not found then
    raise exception 'Henvendelsen findes ikke.';
  end if;
end;
$$;

revoke all on function public.kontakt_saet_behandlet(uuid, boolean) from public;
grant execute on function public.kontakt_saet_behandlet(uuid, boolean) to authenticated;

-- =========================================================================
-- 5) kontakt_beskeder_liste - stab-laesbar side med defensivt loft + total
--    (samme moenster som P24 admin_forum_rapporter: p_limit/p_offset + total via
--    window-count). Selvstaendig tabel, saa ingen join/berigelse noedvendig.
--    ubehandlede foerst, derefter nyeste foerst.
-- =========================================================================
create or replace function public.kontakt_beskeder_liste(
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id         uuid,
  user_id    uuid,
  navn       text,
  svar_mail  text,
  emne       text,
  besked     text,
  behandlet  boolean,
  created_at timestamptz,
  total      bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    k.id, k.user_id, k.navn, k.svar_mail, k.emne, k.besked,
    k.behandlet, k.created_at,
    count(*) over() as total
  from public.kontakt_beskeder k
  where public.er_moderator()
  order by k.behandlet asc, k.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.kontakt_beskeder_liste(int, int) from public;
grant execute on function public.kontakt_beskeder_liste(int, int) to authenticated;

-- =========================================================================
-- 6) kontakt_notify - ét praj i klokken pr. stab-medlem ved en ny henvendelse.
--    security definer (klienten har ingen insert-policy paa notifications).
--    Prajer alle tre stab-roller (superadmin/Torben INKL. - forum_rapport_notify
--    rammer kun admin/moderator; her skal "mig" (Torben) altid med). Skriver en
--    stab selv, prajes vedkommende ikke sig selv.
-- =========================================================================
create or replace function public.kontakt_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
  select
    p.id,
    'kontakt',
    new.user_id,
    new.id,
    'Ny henvendelse via Kontakt: "' || left(new.emne, 80) || '"',
    '/admin/kontakt'
  from public.profiles p
  where p.role in ('admin', 'moderator', 'superadmin')
    and p.id is distinct from new.user_id;
  return new;
end;
$$;

drop trigger if exists kontakt_beskeder_notify on public.kontakt_beskeder;
create trigger kontakt_beskeder_notify
  after insert on public.kontakt_beskeder
  for each row execute function public.kontakt_notify();
