-- Zeekr Garage - "Om Zeekr Garage"-gruppen (seed)
-- ---------------------------------------------------------------------------
-- En ny forum-gruppe til feedback om SELVE SIDEN (ikke bilen). Her kan brugerne
-- melde ønsker, idéer og fejl til zeekr-garage.dk, og admin melder ud om siden.
-- Holdt bevidst adskilt fra bil-feedbacken ("Meld en fejl"/"Foreslå et ønske"
-- -> /feedback), som er QA-signalet til Zeekr.
--
-- Tre kategorier i den nye gruppe "Om Zeekr Garage" (group_order 7, sidst):
--   1. Ønsker og idéer            (site-oensker)   - alle opretter
--   2. Fejl og problemer på siden (site-fejl)      - alle opretter
--   3. Nyt fra admin              (nyt-fra-admin)  - LÅST: kun stab opretter
--      tråde (changelog/opslag); alle kan læse og SVARE i kommentarerne.
--
-- Ingen ny kode:
--   * Forsiden grupperer fuldt dynamisk på (group_order, display_order), så en
--     ny gruppe dukker op af sig selv (lib/forum.ts: getForumGrupper).
--   * is_locked bruger den eksisterende mekanik (forum.sql-RLS): en låst
--     kategori gater KUN oprettelse af tråde til stab (er_moderator); svar
--     gates på tråd-niveau, så alle kan kommentere - præcis som 'regler' og
--     'guides'.
--
-- Idempotent på slug (on conflict do nothing).

insert into public.forum_categories
  (slug, name, description, icon, group_label, group_order, display_order, is_locked)
values
  ('site-oensker', 'Ønsker og idéer',
   'Hvad kunne gøre zeekr-garage.dk bedre? Foreslå funktioner og forbedringer til selve siden. (Ønsker og fejl til din BIL hører hjemme under Feedback.)',
   '💡', 'Om Zeekr Garage', 7, 1, false),
  ('site-fejl', 'Fejl og problemer på siden',
   'Noget der ikke virker på selve siden - knapper, visning, login og lignende. (Fejl på din Zeekr meldes under Feedback.)',
   '🐞', 'Om Zeekr Garage', 7, 2, false),
  ('nyt-fra-admin', 'Nyt fra admin',
   'Nyt om siden fra admin - hvad der er lavet, og hvad der er på vej. Kun admin opretter opslag; alle er velkomne i kommentarerne.',
   '📣', 'Om Zeekr Garage', 7, 3, true)
on conflict (slug) do nothing;
