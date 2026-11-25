-- Zeekr Garage - Link-preview-kort i forum (P38)
-- ---------------------------------------------------------------------------
-- Links i forumindlaeg renderes i dag som REN tekst (whitespace-pre-line), ikke
-- engang klikbare. Som paa Facebook vil vi vise et lille kort under indlaegget
-- med den linkede sides Open Graph-data (titel, beskrivelse, billede).
--
-- VALG (laast med Torben 25-11):
--  - Snapshot ved oprettelse, cachet i DB (denne tabel). Foraeldelse er accepteret
--    som uundgaaeligt (kan ikke undgaas hvis kilden aendrer sig) - bekaempes IKKE.
--  - Billedet HOTLINKES (vi gemmer kun og:image-URL'en; klientens browser henter
--    selve billedet med referrerpolicy=no-referrer + onError=skjul). Ingen egen
--    bucket/proxy - det ville tilfoeje endnu en server-fetch at misbruge.
--  - SSRF-vaernet (serveren henter vilkaarlige bruger-URL'er) ligger i app-laget
--    (lib/link-preview.ts), ikke her.
--
-- MOENSTER (som P17/P19/P27): offentlig laesning (RLS select using(true)); INGEN
-- skrive-policy -> al skrivning gaar gennem security-definer RPC'en nedenfor.
-- Forskel fra P17/P27: RPC'en er authenticated-gated (ikke admin), fordi enhver
-- indlogget bruger der opretter et indlaeg skal kunne fylde cachen - ikke kun
-- admins. Cachen er keyet paa den NORMALISEREDE URL (strip fragment, lowercase
-- host), som kalderen leverer faerdig-normaliseret.
--
-- Idempotent: create table if not exists + create or replace function.

-- ===========================================================================
-- 1) Cache-tabel. url = normaliseret cache-noegle (unik). ok=false => vi har
--    forsoegt men faaet intet brugbart (blokeret/timeout/ingen OG-data); saa
--    undgaar vi at gen-hente den samme daarlige URL ved hvert opslag, og
--    rendereren viser bare intet kort.
-- ===========================================================================
create table if not exists public.forum_link_previews (
  url         text primary key,
  title       text,
  description text,
  image_url   text,
  ok          boolean     not null default false,
  fetched_at  timestamptz not null default now()
);

-- ===========================================================================
-- 2) RLS: offentlig laesning. Ingen skrive-policy => skrivning kun via RPC'en.
-- ===========================================================================
alter table public.forum_link_previews enable row level security;

drop policy if exists forum_link_previews_laes on public.forum_link_previews;
create policy forum_link_previews_laes on public.forum_link_previews
  for select using (true);

-- ===========================================================================
-- 3) Upsert-RPC (authenticated-gated, security definer). Kalderen leverer den
--    faerdig-normaliserede URL som noegle. on conflict => en genhentning
--    (fx ved redigering) opdaterer snapshottet. Felterne cappes defensivt, saa
--    en vild side ikke proppre cachen.
-- ===========================================================================
create or replace function public.forum_saet_link_preview(
  p_url   text,
  p_title text,
  p_desc  text,
  p_image text,
  p_ok    boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_url text;
begin
  if auth.uid() is null then
    raise exception 'Log ind for at gemme et link-preview.';
  end if;
  v_url := btrim(coalesce(p_url, ''));
  if v_url = '' then
    raise exception 'Tom URL.';
  end if;

  insert into public.forum_link_previews (url, title, description, image_url, ok, fetched_at)
  values (
    left(v_url, 2048),
    nullif(left(btrim(coalesce(p_title, '')), 400), ''),
    nullif(left(btrim(coalesce(p_desc,  '')), 1000), ''),
    nullif(left(btrim(coalesce(p_image, '')), 2048), ''),
    coalesce(p_ok, false),
    now()
  )
  on conflict (url) do update
    set title       = excluded.title,
        description = excluded.description,
        image_url   = excluded.image_url,
        ok          = excluded.ok,
        fetched_at  = excluded.fetched_at;
end;
$$;

revoke all on function public.forum_saet_link_preview(text, text, text, text, boolean) from public;
grant execute on function public.forum_saet_link_preview(text, text, text, text, boolean) to authenticated;
