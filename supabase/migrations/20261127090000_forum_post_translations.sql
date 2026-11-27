-- Zeekr Garage - Forum-oversaettelse (nordisk i18n, trin 3)
-- ---------------------------------------------------------------------------
-- Forummet er ÉT samlet rum paa tvaers af Norden (ikke opdelt pr. land). En
-- svensker skriver paa svensk, en dansker paa dansk. Som paa Facebook faar hvert
-- indlaeg der IKKE er paa laeserens sprog en "Oversaet"-knap; klik -> indlaegget
-- vises paa laeserens sprog (da/en/sv), "Vis original" tilbage. Den oprindelige
-- tekst er ALTID record - oversaettelsen er et on-demand overlay.
--
-- TO-NIVEAU-PRINCIPPET (laast 25-11): forummet noejes med GIST paa LibreTranslate;
-- rapporten faar praecision (egen motor). Forum-oversaettelsen har derfor sin EGEN
-- LT-sti (lib/forum-oversaet.ts) adskilt fra rapportens motor (lib/oversaet.ts).
--
-- CACHE (samme snapshot-tanke som P38's link-previews): oversaettelsen cantes her,
-- keyet paa (post_id, maalsprog). `kilde_hash` (sha1 af body) fanger redigering:
-- aendrer indlaegget sig, giver det cache-miss -> gen-oversaettes. `kildesprog` er
-- LibreTranslates auto-detekterede kilde (til "Oversat fra svensk"-labelen), saa
-- vi ikke re-detekterer.
--
-- AFVIGELSE FRA P38 (bevidst): P38's preview-tabel har OFFENTLIG laesning + en
-- authenticated-gated skrive-RPC, fordi skribenten altid er den indloggede
-- forfatter. Her er LAESEREN ofte anonym (en ikke-indlogget nordisk gaest), saa
-- skrivningen kan ikke gaa via en authenticated RPC. Loesning: tabellen er PRIVAT
-- (RLS slaaet til, INGEN policies), og BAADE laesning og skrivning sker server-side
-- med SERVICE-ROLE (lib/forum-oversaet.ts). Fordele frem for P38-moenstret her:
--   * en anonym laeser kan udloese en cache-skrivning uden en klient-skrivbar policy,
--   * fjernet indhold kan aldrig hentes via et offentligt opslag (ingen public read),
--   * oversaettelsen produceres af vores egen LT server-side, aldrig klient-leveret
--     -> ingen cache-poisoning.
--
-- Idempotent: create table if not exists.

-- ===========================================================================
-- 1) Cache-tabel. ON DELETE CASCADE rydder en posts oversaettelser ved et HARD
--    delete af indlaegget; soft-remove (is_removed) rydder app-side (best-effort)
--    i fjern-stierne, men forum-oversaet-stien naegter alligevel at servere et
--    fjernet indlaegs oversaettelse.
-- ===========================================================================
create table if not exists public.forum_post_translations (
  post_id    uuid not null references public.forum_posts(id) on delete cascade,
  maalsprog  text not null,
  kilde_hash text not null,
  kildesprog text,
  oversat    text not null,
  updated_at timestamptz not null default now(),
  primary key (post_id, maalsprog)
);

-- ===========================================================================
-- 2) RLS slaaet til UDEN policies => hverken anon eller authenticated kan laese
--    eller skrive. Kun service-role (som gaar UDEN om RLS) roerer tabellen, og
--    det sker udelukkende server-side i lib/forum-oversaet.ts.
--
--    GRANTS: Supabase's default-privileges giver normalt anon/authenticated/
--    service_role adgang til nye public-tabeller. Vi REVOKER anon/authenticated
--    (RLS uden policy ville alligevel naegte dem, men revoke er baelte+seler), og
--    GIVER service_role eksplicit adgang, saa cachen virker uanset instansens
--    default-privilege-opsaetning (ingen skjult afhaengighed).
-- ===========================================================================
alter table public.forum_post_translations enable row level security;
revoke all on public.forum_post_translations from anon, authenticated;
grant all on public.forum_post_translations to service_role;
