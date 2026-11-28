-- P44 (28-11-2026): en "mig med"-stemme overlever, at kontoen slettes.
--
-- Før: confirmations.user_id NOT NULL -> profiles(id) ON DELETE CASCADE, så en
-- slettet konto (auth.users -> profiles) tog alle brugerens stemmer med, og
-- stemmetallet i rapporten til Zeekr faldt. Torben 28-11: en stemme er en
-- reel stemme og må heller ikke forsvinde, når kontoen slettes.
--
-- Nu: user_id bliver NULL (anonym stemme). model_id/variant_id står på rækken,
-- så rapporten tæller den som før. car_id er allerede ON DELETE SET NULL
-- (20261128160000), så bilen går, stemmen bliver.
--
-- Sideeffekter (gennemgået):
--  - RLS: insert/delete kræver user_id = auth.uid() -> en anonym stemme kan
--    ingen bruger slette (kun staben/DB), og ingen kan oprette en anonym.
--  - P43 sammenlæg: dedupe på bruger+model matcher aldrig NULL = NULL, så to
--    anonyme stemmer slås ikke sammen; de droppes derfor heller aldrig og skal
--    ikke genskabes ved fortryd.
--  - Aktivitet (unikke brugere) springer rækker uden bruger over.
--  - "Anonymisér" (P20) sletter ikke profilen og er uændret.
--
-- Idempotent: kan køres flere gange.

alter table public.confirmations alter column user_id drop not null;

do $$
declare
  fk text;
begin
  select c.conname into fk
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
   where c.conrelid = 'public.confirmations'::regclass
     and c.contype = 'f'
     and a.attname = 'user_id'
   limit 1;
  if fk is not null then
    execute format('alter table public.confirmations drop constraint %I', fk);
  end if;
  alter table public.confirmations
    add constraint confirmations_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null;
end $$;
