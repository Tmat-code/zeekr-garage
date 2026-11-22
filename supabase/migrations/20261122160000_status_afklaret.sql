-- Zeekr Garage - ny status "afklaret"
-- ---------------------------------------------------------------------------
-- En melding kan afsluttes uden at vaere loest i en OTA-opdatering, fx naar
-- en bruger var fejlinformeret og det er afklaret i en kommentar. Hidtil
-- tvang "Markér løst" status til "loest_i_ota" ("Løst i OTA"), hvilket var
-- misvisende. Ny slut-status "afklaret" daekker den slags.
--
-- ADD VALUE IF NOT EXISTS er idempotent (kan koeres igen). Vaerdien bruges
-- ikke i denne migration, saa ingen transaktions-begraensning rammer os.

alter type public.issue_status add value if not exists 'afklaret';
