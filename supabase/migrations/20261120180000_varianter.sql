-- Zeekr Garage — Varianter (trim pr. model) + variant på bekræftelse
-- ---------------------------------------------------------------------------
-- Naar en ejer bekraefter ("mig med"), vaelger de deres variant, saa
-- "biler bekraeftet" kan vises med fordeling pr. trim (staerkt over for Zeekr).

create table if not exists public.variants (
  id            uuid primary key default gen_random_uuid(),
  model_id      uuid not null references public.models(id) on delete cascade,
  name          text not null,
  display_order int  not null default 0,
  unique (model_id, name)
);
create index if not exists variants_model_id_idx on public.variants (model_id);

alter table public.variants enable row level security;
drop policy if exists variants_read_all on public.variants;
create policy variants_read_all on public.variants for select using (true);

-- variant paa bekraeftelsen (nullable: aeldre bekraeftelser + modeller uden trim-valg)
alter table public.confirmations
  add column if not exists variant_id uuid references public.variants(id) on delete set null;

-- =========================================================================
-- Seed: variant-liste pr. model (nordisk lineup, leveret af ejer 20-11-2026)
-- =========================================================================
insert into public.variants (model_id, name, display_order)
select m.id, v.name, v.ord
from (values
  ('zeekr-9x',        'Ultra AWD',          1),
  ('zeekr-001',       'Long Range RWD',     1),
  ('zeekr-001',       'Performance AWD',    2),
  ('zeekr-001',       'Privilege AWD',      3),
  ('zeekr-001',       'Sports Edition AWD', 4),
  ('zeekr-001-sport', 'Long Range RWD',     1),
  ('zeekr-001-sport', 'Performance AWD',    2),
  ('zeekr-001-sport', 'Privilege AWD',      3),
  ('zeekr-001-sport', 'Sports Edition AWD', 4),
  ('zeekr-x',         'Core RWD',           1),
  ('zeekr-x',         'Long Range RWD',     2),
  ('zeekr-x',         'Privilege AWD',      3),
  ('zeekr-7x',        'Core Edition RWD',   1),
  ('zeekr-7x',        'Core RWD',           2),
  ('zeekr-7x',        'Long Range RWD',     3),
  ('zeekr-7x',        'Privilege AWD',      4),
  ('zeekr-7gt',       'Core RWD',           1),
  ('zeekr-7gt',       'Long Range RWD',     2),
  ('zeekr-7gt',       'Privilege AWD',      3)
) as v(slug, name, ord)
join public.models m on m.slug = v.slug
on conflict (model_id, name) do nothing;
