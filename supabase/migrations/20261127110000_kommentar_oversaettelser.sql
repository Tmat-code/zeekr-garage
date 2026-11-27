-- Zeekr Garage - Holdbar DB-cache for rapportens KOMMENTAR-oversaettelser (trin 2.6)
-- ---------------------------------------------------------------------------
-- Rapportens MELDINGS-oversaettelser (titel+beskrivelse) har allerede en holdbar
-- DB-cache (`oversaettelser`), men KOMMENTARERNE havde kun en in-memory cache i
-- lib/oversaet.ts, der toemtes ved HVERT deploy. Efter enhver deploy maltes den haarde
-- rapport (kommentarer slaaet til) derfor kold forfra i ét stort grind -> langsomt og
-- ramte Cloudflares 524. Denne tabel giver kommentarerne den SAMME holdbare cache som
-- meldingerne, saa eksporten bare laeser cache og konvergerer.
--
-- MOENSTER = `oversaettelser` (NOT forummets private `forum_post_translations`):
--   * PK (comment_id, sprog), `kilde_hash` (sha1 af body, MOTOR_ID foldet ind i
--     app-laget) fanger baade redigering (ny body -> miss) OG motor-skift (nyt
--     MOTOR_ID -> miss) -> gen-oversaettes; sprog ligger i PK'en, ikke i hash'et.
--   * ON DELETE CASCADE: slettes en kommentar, ryddes dens oversaettelser med.
--   * RLS = moderator-only (authenticated + er_moderator()), fordi rapporten dannes
--     som indlogget moderator via den auth-bevidste session-klient (supabaseServer),
--     ikke service-role. Derfor er forummets private/service-role-tabel IKKE moenstret
--     her - der er laeseren ofte anonym; her er den altid en moderator.
--
-- Idempotent: create table if not exists.

create table if not exists public.kommentar_oversaettelser (
  comment_id uuid not null references public.comments(id) on delete cascade,
  sprog      text not null,
  kilde_hash text not null,
  oversat    text not null,
  updated_at timestamptz not null default now(),
  primary key (comment_id, sprog)
);

alter table public.kommentar_oversaettelser enable row level security;
drop policy if exists kommentar_oversaettelser_mod on public.kommentar_oversaettelser;
create policy kommentar_oversaettelser_mod on public.kommentar_oversaettelser
  for all to authenticated using (public.er_moderator()) with check (public.er_moderator());
