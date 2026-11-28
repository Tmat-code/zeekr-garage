-- P44 (28-11-2026): en "mig med"-stemme overlever, at ejeren fjerner bilen.
--
-- Før: confirmations.car_id -> cars(id) ON DELETE CASCADE, så "Fjern bil" i
-- Min garage slettede alle bilens stemmer (set i P44-gennemklikket). Torben
-- 28-11: en stemme er en reel stemme og må ikke forsvinde, fordi bilen fjernes.
--
-- Nu:
--  1) car_id -> ON DELETE SET NULL. Rækken bliver stående med user_id,
--     model_id og variant_id (rapporten tæller på model/variant, uændret).
--  2) Tilføjer ejeren senere en bil af SAMME model igen, kobles de løse
--     stemmer på den nye bil (højst én pr. melding), så samme person ikke kan
--     stemme to gange på den samme melding med "den samme" bil.
--
-- Idempotent: kan køres flere gange.

-- 1) FK: cascade -> set null (find navnet dynamisk; standard er confirmations_car_id_fkey)
do $$
declare
  fk text;
begin
  select c.conname into fk
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
   where c.conrelid = 'public.confirmations'::regclass
     and c.contype = 'f'
     and a.attname = 'car_id'
   limit 1;
  if fk is not null then
    execute format('alter table public.confirmations drop constraint %I', fk);
  end if;
  alter table public.confirmations
    add constraint confirmations_car_id_fkey
    foreign key (car_id) references public.cars(id) on delete set null;
end $$;

-- 2) Genkobling af løse stemmer, når en bil af samme model tilføjes igen.
create or replace function public.genkobl_loese_stemmer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.confirmations c
     set car_id = new.id
   where c.id in (
     select distinct on (x.issue_id) x.id
       from public.confirmations x
      where x.user_id = new.owner_id
        and x.car_id is null
        and x.model_id = new.model_id
        -- den nye bil har (selvfølgelig) ikke stemt endnu, men vær sikker
        and not exists (
          select 1 from public.confirmations y
           where y.issue_id = x.issue_id and y.car_id = new.id
        )
      order by x.issue_id, x.created_at
   );
  return new;
end $$;

drop trigger if exists cars_genkobl_loese_stemmer on public.cars;
create trigger cars_genkobl_loese_stemmer
  after insert on public.cars
  for each row execute function public.genkobl_loese_stemmer();
