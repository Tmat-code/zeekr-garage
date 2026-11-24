-- =========================================================================
-- P25: Signup kraever e-mail-bekraeftelse (double opt-in) - bil via metadata
-- =========================================================================
-- Naar ENABLE_EMAIL_AUTOCONFIRM slaas fra, faar en ny bruger INGEN session ved
-- oprettelse (kontoen er inaktiv indtil mail-linket er klikket). Bilen (model +
-- variant) blev hidtil skrevet KLIENT-side lige efter signUp() med den aktive
-- session - den vej findes ikke laengere ved double opt-in, saa bil-valget ville
-- gaa tabt.
--
-- Loesning: signup baerer bil-valget i user-metadata (raw_user_meta_data), og
-- handle_new_user() - som allerede opretter profilen fra metadata ved
-- auth.users-insert (security definer, ingen session noedvendig) - opretter nu
-- ogsaa cars-raekken + saetter profiles.car_model_id/car_variant_id, naar
-- metadata baerer en bil.
--
-- Bagud-kompatibel: aeldre klient-kode sender ingen bil-metadata -> triggeren
-- springer bilen over, og den gamle klient-insert goer sit som foer. Ny
-- klient-kode sender metadata + undlader sin egen insert (med en faldback der
-- kun skriver hvis bilen ikke allerede findes), saa der aldrig opstaar dobbelt
-- bil uanset deploy-raekkefoelge. Ren funktions-erstatning; triggeren
-- on_auth_user_created er uaendret.
--
-- Eksisterende konti er uberoerte - funktionen koerer kun ved NYE auth.users-rows.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model_id   uuid;
  v_variant_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Bil-valg fra signup. Alt bil-arbejde er indkapslet i en egen blok, saa en
  -- ugyldig/ufuldstaendig payload ALDRIG blokerer selve kontooprettelsen.
  begin
    v_model_id   := nullif(new.raw_user_meta_data->>'car_model_id', '')::uuid;
    v_variant_id := nullif(new.raw_user_meta_data->>'car_variant_id', '')::uuid;

    if v_model_id is not null then
      insert into public.cars (owner_id, model_id, variant_id)
      values (new.id, v_model_id, v_variant_id);

      update public.profiles
         set car_model_id   = v_model_id,
             car_variant_id = v_variant_id
       where id = new.id;
    end if;
  exception when others then
    -- Ugyldig bil-metadata: spring bilen over, behold kontoen.
    null;
  end;

  return new;
end;
$$;
