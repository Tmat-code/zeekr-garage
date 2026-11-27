-- Zeekr Garage - Oprydning: fjern den udgaaede "Software & OTA"-forumkategori
-- ---------------------------------------------------------------------------
-- Beslutning 27-11: "Software & OTA"-kategorien (slug `software-ota`) er fjernet
-- fra forummet. Den dublerede /software (OTA-historik, P27) og en OTA-snak hoerer
-- alligevel hjemme i det enkelte MODEL-forum. Torben slettede den LIVE i kategori-
-- editoren, men seed-migrationen 20261121200000_forum.sql opretter den stadig paa
-- en FRISK DB - denne migration fjerner den permanent, saa et nyt miljoe ikke faar
-- den tilbage.
--
-- IDEMPOTENT: paa den eksisterende DB er kategorien allerede slettet -> 0 raekker.
-- Paa en frisk DB koerer denne EFTER seed'en og fjerner den netop-seedede (tomme)
-- kategori.
--
-- SIKKER: guarden "ingen traade" spejler app'ens `sletKategori` - forum_threads
-- har `category_id ... on delete cascade`, saa en ubetinget delete ville tage evt.
-- traade med. Skulle kategorien mod forventning have traade (fx manuelt genskabt
-- og brugt), roerer vi den IKKE - saa intet indhold kan gaa tabt ved en genkoersel.

delete from public.forum_categories c
where c.slug = 'software-ota'
  and not exists (
    select 1 from public.forum_threads t where t.category_id = c.id
  );
