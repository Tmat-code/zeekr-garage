-- Zeekr Garage - seed-data
-- De 6 DK-modeller + deres softwareplatform (jf. HANDOVER).
-- Idempotent: kan koeres igen uden dubletter.

insert into public.models (slug, name, platform, display_order) values
  ('zeekr-9x',        'Zeekr 9X',                'SEA-R',     10),
  ('zeekr-7x',        'Zeekr 7X',                'PMA2+',     20),
  ('zeekr-7gt',       'Zeekr 7GT',               'PMA2+',     30),
  ('zeekr-001',       'Zeekr 001',               'SEA1/SEA2', 40),
  ('zeekr-001-sport', 'Zeekr 001 Sport Edition', 'SEA1/SEA2', 50),
  ('zeekr-x',         'Zeekr X',                 'SEA1/SEA2', 60)
on conflict (slug) do nothing;
