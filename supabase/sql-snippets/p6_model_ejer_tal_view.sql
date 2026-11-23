-- =========================================================================
-- P6 - Antal ejere pr. model-forum  (VALGFRI optimering - IKKE påkrævet)
-- =========================================================================
-- Status: P6 kører i produktion via server-side aggregering i TypeScript
-- (lib/forum.ts:getModelEjerTal) UDEN nogen migration. Denne fil er KUN hvis
-- du på et tidspunkt vil flytte optællingen ned i databasen (fx når garagen
-- vokser sig så stor at det er dyrt at hente alle cars-/confirmations-rækker
-- ind i Node ved hvert forum-sidevisning).
--
-- Den ligger bevidst i supabase/sql-snippets/ (IKKE i supabase/migrations/),
-- så den ikke betragtes som en del af migrations-kæden. Kør den kun manuelt i
-- Zeekr-Studio (http://192.168.1.18:8002) hvis/når du vil bruge den.
--
-- Semantikken er præcis den samme som TS-koden (verificeret side om side i en
-- lokal Postgres 16):
--   ejere         = antal distinkte owner_id i cars for modellen
--   biler         = antal cars-rækker for modellen
--   bekraeftelser = antal confirmations-rækker for modellen (live; legacy-
--                   baseline er per-melding og indgår bevidst ikke her)
--
-- cars + confirmations er read-all (offentlig SELECT), så en anon-læsbar view
-- er fin. Tager du den i brug, kan getModelEjerTal erstattes af ét kald:
--   select * from public.model_ejer_tal;
-- =========================================================================

create or replace view public.model_ejer_tal as
select
  m.id                                   as model_id,
  m.slug                                 as model_slug,
  coalesce(c.ejere, 0)                   as ejere,
  coalesce(c.biler, 0)                   as biler,
  coalesce(k.bekraeftelser, 0)           as bekraeftelser
from public.models m
left join (
  select model_id,
         count(distinct owner_id) as ejere,
         count(*)                 as biler
  from public.cars
  group by model_id
) c on c.model_id = m.id
left join (
  select model_id,
         count(*) as bekraeftelser
  from public.confirmations
  group by model_id
) k on k.model_id = m.id;

-- Læsning er offentlig som resten af ejer-grafen.
grant select on public.model_ejer_tal to anon, authenticated;
