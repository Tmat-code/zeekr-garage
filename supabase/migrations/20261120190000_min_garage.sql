-- Zeekr Garage - "Min garage": brugerens bil (model + variant) på profilen
-- ---------------------------------------------------------------------------
-- Man registrerer sin bil ved oprettelse (eller vælger "ejer ikke endnu").
-- "Mig med" bruger automatisk bilen. Ingen bil (begge null) => kan ikke stemme.
-- Den store cars-tabel (flere biler, VIN) ligger stadig til en rigere garage senere.

alter table public.profiles
  add column if not exists car_model_id   uuid references public.models(id)   on delete set null,
  add column if not exists car_variant_id uuid references public.variants(id) on delete set null;

-- Rettigheder: profiles_update_self (fra init) lader ejeren sætte/ændre sin egen bil.
