-- Zeekr Garage - OTA follow-up: klokke-notif ved ny version (P27 follow-up)
-- ---------------------------------------------------------------------------
-- P27 gav struktureret OTA-historik pr. model, men v1 kom UDEN notifikation
-- (udskudt med Torben 24-11). Her lander en klokke-notifikation naar et NYT
-- OTA-opslag oprettes - men KUN hos de relevante ejere: brugere der ejer mindst
-- een af de modeller opslaget daekker (via cars), ikke hele community'et. En
-- ejer af en helt anden model skal ikke prajet om en OTA til en bil de ikke har.
--
-- MOENSTER (P13's nyt_event / forum_post_notify):
--  - security definer => skriver notifications selvom den oprettende admin ikke
--    ejer de andres raekker (klienten har ingen insert-policy paa notifications).
--  - Opretteren selv notificeres IKKE (samme "ikke mig selv"-moenster).
--  - KUN ved OPRET: notifikationen laegges inde i admin_opret_ota, IKKE i
--    admin_ret_ota/admin_slet_ota og IKKE via en trigger paa
--    software_update_models (en trigger ville gen-notificere ved hver ret, hvor
--    saet_ota_modeller sletter+genindsaetter koblingerne - det er forkert; en
--    rettelse er ikke en ny version). Derfor er opret-RPC'en det eneste
--    "ny version"-indgangspunkt, og notifikationen bor praecis der.
--
-- LINK: notifikationen (og diskussions-linket paa /software) peger paa
--  /software (OTA-historikken). Record<->snak holdes adskilt: selve
--  diskussionen bor uroert i forummets Software & OTA-kategori - det
--  diskussions-link er ren UI (components/SoftwareHistorik.tsx), ingen DB-kobling.
--
-- type = 'ota' (nyt notifikations-type; notifications.type er fri tekst, ingen
--  enum/check, saa ingen skemaaendring). NotifBell faar et 📦-ikon til typen.
--
-- Idempotent: create or replace af admin_opret_ota (uaendret signatur => ACL/
--  grants fra P27 bevares). Ingen skemaaendring, ingen nye tabeller.

-- ===========================================================================
-- admin_opret_ota: som P27, PLUS en notif-blok til sidst (efter model-koblingen
-- er sat, saa software_update_models allerede har opslagets modeller). Resten af
-- kroppen er ordret P27's - kun notif-blokken er ny.
-- ===========================================================================
create or replace function public.admin_opret_ota(
  p_version     text,
  p_released_at date,
  p_changelog   text,
  p_note        text,
  p_model_ids   uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_version text; v_changelog text; v_id uuid; n_modeller int;
begin
  if not public.er_admin() then raise exception 'Kun admin kan oprette OTA-opslag.'; end if;
  v_version   := btrim(p_version);
  v_changelog := btrim(p_changelog);
  if v_version   = '' then raise exception 'Giv opslaget en version.'; end if;
  if v_changelog = '' then raise exception 'Changeloggen maa ikke vaere tom.'; end if;
  -- Mindst een eksisterende model (0 = usynligt opslag).
  select count(*) into n_modeller
  from unnest(coalesce(p_model_ids, '{}'::uuid[])) as mid
  where exists (select 1 from public.models m where m.id = mid);
  if n_modeller = 0 then raise exception 'Vaelg mindst een model.'; end if;

  insert into public.software_updates (version, released_at, changelog, note, created_by)
  values (
    v_version,
    coalesce(p_released_at, current_date),
    v_changelog,
    nullif(btrim(p_note), ''),
    auth.uid()
  )
  returning id into v_id;
  perform public.saet_ota_modeller(v_id, p_model_ids);

  -- NYT (follow-up): klokke-notif til ejere af de ramte modeller.
  -- En raekke pr. ejer (distinct => ejere med flere biler af ramte modeller faar
  -- EEN notif, ikke een pr. bil). Opretteren selv undtages. Ejere af modeller
  -- opslaget IKKE daekker rammes aldrig (join paa software_update_models for v_id).
  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
  select distinct c.owner_id, 'ota', auth.uid(), v_id,
         'Ny software til din Zeekr: ' || v_version,
         '/software'
    from public.cars c
    join public.software_update_models sum on sum.model_id = c.model_id
   where sum.update_id = v_id
     and c.owner_id is not null
     and c.owner_id <> auth.uid();

  return v_id;
end;
$$;

-- create or replace bevarer ACL'en fra P27 (authenticated kan kalde, er_admin()
-- gater indeni). Gentages defensivt saa migrationen ogsaa staar korrekt hvis den
-- nogensinde koeres mod en DB hvor grant'en mangler.
revoke all on function public.admin_opret_ota(text, date, text, text, uuid[])    from public;
grant execute on function public.admin_opret_ota(text, date, text, text, uuid[]) to authenticated;
