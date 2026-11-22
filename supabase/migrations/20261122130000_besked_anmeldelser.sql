-- Zeekr Garage - Moderator-visning af besked-anmeldelser (Vaerkstedet)
-- ---------------------------------------------------------------------------
-- Bygger paa beskeder-migrationen (20261122120000). Den gav allerede:
--   - message_reports (tabel) + RLS: enhver indlogget anmelder (reporter_id),
--     moderator SELECT + UPDATE (handled-flag).
--   - messages_delete_mod: moderator maa SLETTE beskeder.
--
-- Hul der lukkes her: en moderator er IKKE deltager i en privat samtale, og
-- messages_select-politikken er 'er_deltager(conversation_id)'. Moderatoren
-- kan altsaa laese selve anmeldelses-raekken, men IKKE besked-indholdet den
-- peger paa - og ville dermed moderere i blinde.
--
-- Privatlivsvalg: i stedet for en bred 'messages_select_mod'-politik (som ville
-- give moderatorer laese-adgang til ALLE private beskeder) eksponerer vi KUN de
-- konkret anmeldte beskeder via en security-definer-RPC, moderator-gated. En
-- moderator ser altsaa kun det, nogen har anmeldt.
--
-- Idempotent: create-or-replace.

-- =========================================================================
-- RPC: anmeldelser beriget med besked-body + afsender + anmelder.
-- Kun de anmeldte beskeder laekkes (security definer bypasser messages-RLS,
-- men funktionen afgraenser selv til message_reports-raekker).
-- =========================================================================
create or replace function public.admin_besked_anmeldelser()
returns table (
  report_id          uuid,
  message_id         uuid,
  conversation_id    uuid,
  reason             text,
  handled            boolean,
  created_at         timestamptz,
  reporter_id        uuid,
  reporter_navn      text,
  besked_body        text,
  besked_sender_id   uuid,
  besked_sender_navn text,
  besked_created_at  timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id                                as report_id,
    r.message_id,
    r.conversation_id,
    r.reason,
    r.handled,
    r.created_at,
    r.reporter_id,
    coalesce(nullif(trim(rp.display_name), ''), 'En ejer') as reporter_navn,
    m.body                              as besked_body,
    m.sender_id                         as besked_sender_id,
    coalesce(nullif(trim(sp.display_name), ''), 'En ejer') as besked_sender_navn,
    m.created_at                        as besked_created_at
  from public.message_reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.messages  m on m.id = r.message_id
  left join public.profiles  sp on sp.id = m.sender_id
  -- Kun moderatorer/admins faar raekker; alle andre faar et tomt saet.
  where public.er_moderator()
  -- Uhaandterede foerst, derefter nyeste foerst.
  order by r.handled asc, r.created_at desc;
$$;

revoke all on function public.admin_besked_anmeldelser() from public;
grant execute on function public.admin_besked_anmeldelser() to authenticated;
