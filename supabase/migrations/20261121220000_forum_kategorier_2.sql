-- Zeekr Garage - Forum: flere kategorier (bruger-ønsker 21-11-2026)
-- Nye grupper: Fællesskab (træf/events) + Marked (køb/salg/bytte).
-- Idempotent paa slug.

insert into public.forum_categories
  (slug, name, description, icon, group_label, group_order, display_order, is_locked)
values
  ('daek-faelge-undervogn', 'Dæk, fælge & undervogn',
   'Sommer/vinter, dimensioner, fælge, affjedring og alt der ruller.',
   '🛞', 'Teknik', 4, 5, false),
  ('diy-faq', 'DIY & FAQ',
   'Gør-det-selv-guides, tips og svar på de spørgsmål der går igen.',
   '🧰', 'Teknik', 4, 6, false),
  ('bilpleje-detailing', 'Bilpleje & detailing',
   'Vask, voks, coating, lakpleje og at holde bilen flot.',
   '✨', 'Ejer-lounge', 3, 4, false),
  ('forsikring-service-vaerksted', 'Forsikring, service & værksted',
   'Forsikringsvalg, serviceintervaller, garanti og værkstedserfaringer.',
   '🛠️', 'Ejer-lounge', 3, 5, false),
  ('traef-koereture-events', 'Træf, køreture & events',
   'Planlæg og del køreture, træf og arrangementer.',
   '📅', 'Fællesskab', 5, 1, false),
  ('koeb-salg-bytte', 'Køb, salg & bytte',
   'Markedsplads mellem ejere - brugte dele, tilbehør og biler. Privat, ikke erhverv.',
   '🏷️', 'Marked', 6, 1, false)
on conflict (slug) do nothing;
