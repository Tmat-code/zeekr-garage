-- Zeekr Garage - Bruger-sletning af samtaler (P15)
-- ---------------------------------------------------------------------------
-- Semantik: "skjul-for-mig". En bruger kan fjerne en samtale fra sin egen
-- indbakke uden at udslette den andens kopi. "Slet" sætter MIN egen
-- conversation_participants-rækkes hidden_at = now(). Samtalen filtreres fra i
-- getSamtaler, men dukker op igen hvis den anden skriver (ny besked bumper
-- conversations.last_message_at > hidden_at). Ingen hård sletning.
--
-- Ingen ny RLS-politik nødvendig: den eksisterende conv_part_update_own
-- (update to authenticated using user_id = auth.uid()) dækker allerede at en
-- bruger opdaterer sin egen hidden_at.
--
-- Idempotent: add column if not exists.

alter table public.conversation_participants
  add column if not exists hidden_at timestamptz;
