-- Zeekr Garage - Multi-model garage (flere biler pr. ejer)
-- ---------------------------------------------------------------------------
-- "Min garage" tog en genvej: én bil pr. profil (profiles.car_model_id/
-- car_variant_id). En ejer med to modeller kunne derfor kun registrere én,
-- kunne ikke bekraefte feedback paa sin anden model, badge viste kun én bil,
-- og rapportens bil-fordeling undertalte.
--
-- Vi flytter kilden til den eksisterende cars-tabel (flere biler pr. ejer) og
-- knytter hver bekraeftelse til en konkret bil (car_id). Beslutning (laast
-- 22-11-2026): en bruger bekraefter for HVER af sine biler - ejer man to ramte
-- modeller (fx PMA2+-fejl paa baade 7X + 7GT) taeller det som to bekraeftelser
-- (én pr. bil), saa rapporterne taeller ramte biler praecist.
--
-- profiles.car_model_id/car_variant_id BEHOLDES som "primaer bil" (den der
-- vises i garage-badget overalt) - kilden til alle biler er nu cars.

-- =========================================================================
-- 1) cars: variant_id (trim) som FK til variants
--    (cars.variant er et gammelt tekst-felt til hardware-metadata; vi bruger
--     variant_id, saa en bil baerer samme trim-reference som bekraeftelser.)
-- =========================================================================
alter table public.cars
  add column if not exists variant_id uuid references public.variants(id) on delete set null;

create index if not exists cars_variant_id_idx on public.cars (variant_id);

-- =========================================================================
-- 2) confirmations: car_id (hvilken bil bekraeftede)
--    Nullable: gamle raekker + raekker uden kendt bil. model_id/variant_id
--    bliver paa raekken (afledt af bilen), saa rapport-RPC'erne er uaendrede.
-- =========================================================================
alter table public.confirmations
  add column if not exists car_id uuid references public.cars(id) on delete cascade;

create index if not exists confirmations_car_id_idx on public.confirmations (car_id);

-- =========================================================================
-- 3) Datamigrering: én cars-raekke pr. eksisterende profil-bil
--    (ingen mister sin bil). Kun for profiler der endnu ikke har en bil i
--    cars - saa migrationen er re-koerbar uden at lave dubletter.
-- =========================================================================
insert into public.cars (owner_id, model_id, variant_id)
select p.id, p.car_model_id, p.car_variant_id
from public.profiles p
where p.car_model_id is not null
  and not exists (select 1 from public.cars c where c.owner_id = p.id);

-- =========================================================================
-- 4) Backfill confirmations.car_id fra brugerens bil med samme model.
--    Hver bruger havde én bil, og bekraeftelsen blev lavet med dens model,
--    saa (user_id, model_id) peger entydigt paa bilen. Finder vi ingen bil
--    (fx brugeren skiftede model siden), bliver car_id NULL (raekken taeller
--    stadig, den er bare ikke knyttet til en konkret bil).
-- =========================================================================
update public.confirmations c
set car_id = (
  select ca.id from public.cars ca
  where ca.owner_id = c.user_id and ca.model_id = c.model_id
  order by ca.created_at
  limit 1
)
where c.car_id is null;

-- =========================================================================
-- 5) Ombyt unique-constraint: fra (user, issue, model) til (issue, car).
--    Gammel constraint blokerede to biler af SAMME model - det bryder "én pr.
--    bil". Ny constraint forhindrer at én bil stemmer to gange paa samme
--    melding. NULL car_id kolliderer ikke (NULL != NULL i unique), saa gamle
--    raekker uden bil er uberoerte.
-- =========================================================================
alter table public.confirmations
  drop constraint if exists confirmations_user_id_issue_id_model_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'confirmations_issue_car_key'
  ) then
    alter table public.confirmations
      add constraint confirmations_issue_car_key unique (issue_id, car_id);
  end if;
end $$;

-- =========================================================================
-- 6) Haerd insert-policyen: bilen skal tilhoere brugeren selv.
--    (Beholder user_id = auth.uid(); tilfoejer ejer-tjek paa car_id.)
-- =========================================================================
drop policy if exists confirmations_insert_own on public.confirmations;
create policy confirmations_insert_own on public.confirmations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      car_id is null
      or exists (
        select 1 from public.cars ca
        where ca.id = car_id and ca.owner_id = auth.uid()
      )
    )
  );
