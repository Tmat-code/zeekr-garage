-- Zeekr Garage - OTA-historik: struktureret software-opdaterings-log pr. model (P27)
-- ---------------------------------------------------------------------------
-- OTA-changelogs (fx "7GT Zeekr OS 3.0.4: en liste af aendringer") er
-- STRUKTURERET data - model(ler), version, dato, en liste af punkter - ikke en
-- "snak"-traad. Laegges de som fri-tekst-traade i forummets Software & OTA-
-- kategori, bliver det rodet saa snart der kommer flere versioner og flere
-- modeller (ingen kan hurtigt se "nyeste version til 7GT" eller "hvad kom der i
-- 3.0.3"). Vi skiller RECORD fra SNAK: en struktureret OTA-historik pr. model
-- (record, denne) + forummet til diskussionen (snak, Software & OTA beholdes
-- uroert). En ejer-vedligeholdt OTA-historik pr. model er samtidig praecis det
-- QA-signal sitet lever af.
--
-- MODEL-KOBLING (afklaret med Torben 24-11): multiselect via join-tabel
-- software_update_models, PRAECIS P19's links<->modeller-moenster. Et opslag kan
-- daekke 1..n modeller: admin paster changeloggen EEN gang og tikker de modeller
-- den gaelder, saa samme OS-boelge til flere modeller bliver EET opslag i stedet
-- for en raekke pr. model. Enkelt-model er bare at tikke een. Mindst een model
-- kraeves (0 = usynligt opslag, giver ingen mening for en OTA).
--
-- MOENSTER (som P17/P18/P19): offentlig laesning (RLS select using(true)); ALLE
-- skrivninger gaar gennem security-definer RPC'er der er er_admin()-gatede, saa
-- tabellerne beholder ren laese-RLS (ingen insert/update/delete-policy).
--
-- Idempotent: create table if not exists + create or replace function. Ingen
-- seed - historikken fyldes af Torben i Vaerkstedet.

-- ===========================================================================
-- 1) Skema: software_updates + software_update_models (mange-til-mange).
--    changelog = ren tekst, EEN linje pr. punkt (splittes ved visning). note =
--    valgfri fri kommentar. created_by on delete set null => et slettet/
--    anonymiseret admin-id efterlader opslaget (historik intakt).
--    software_update_models ON DELETE CASCADE begge veje: slettes en model,
--    falder dens koblinger af opslagene (et opslag uden modeller bliver usynligt
--    i den offentlige per-model-visning, men forsvinder ikke fra basen).
-- ===========================================================================
create table if not exists public.software_updates (
  id          uuid primary key default gen_random_uuid(),
  version     text not null,
  released_at date not null default current_date,
  changelog   text not null,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists software_updates_released_idx
  on public.software_updates(released_at desc);

create table if not exists public.software_update_models (
  update_id uuid not null references public.software_updates(id) on delete cascade,
  model_id  uuid not null references public.models(id)           on delete cascade,
  primary key (update_id, model_id)
);
create index if not exists software_update_models_model_idx
  on public.software_update_models(model_id);

-- ===========================================================================
-- 2) RLS: offentlig laesning (som resten af sitet). Ingen skrive-policy =>
--    skrivning kun via security-definer RPC'erne nedenfor.
-- ===========================================================================
alter table public.software_updates       enable row level security;
alter table public.software_update_models enable row level security;

drop policy if exists software_updates_laes on public.software_updates;
create policy software_updates_laes on public.software_updates for select using (true);
drop policy if exists software_update_models_laes on public.software_update_models;
create policy software_update_models_laes on public.software_update_models for select using (true);

-- ===========================================================================
-- 3) Intern helper: saet software_update_models = netop de givne (eksisterende)
--    modeller. Ukendte model-id'er ignoreres (i stedet for FK-fejl). Kaldes kun
--    af definer-RPC'erne => ingen grant.
-- ===========================================================================
create or replace function public.saet_ota_modeller(p_update_id uuid, p_model_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.software_update_models where update_id = p_update_id;
  if p_model_ids is not null and array_length(p_model_ids, 1) is not null then
    insert into public.software_update_models (update_id, model_id)
    select p_update_id, mid
    from unnest(p_model_ids) as mid
    where exists (select 1 from public.models m where m.id = mid)
    on conflict do nothing;
  end if;
end;
$$;

-- ===========================================================================
-- 4) RPC'er: OTA-opslag (admin-only). Opret / ret / slet.
--    p_model_ids = uuid[] med mindst een eksisterende model.
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
  return v_id;
end;
$$;

create or replace function public.admin_ret_ota(
  p_id          uuid,
  p_version     text,
  p_released_at date,
  p_changelog   text,
  p_note        text,
  p_model_ids   uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_version text; v_changelog text; n_modeller int;
begin
  if not public.er_admin() then raise exception 'Kun admin kan rette OTA-opslag.'; end if;
  if not exists (select 1 from public.software_updates where id = p_id) then
    raise exception 'OTA-opslaget findes ikke.';
  end if;
  v_version   := btrim(p_version);
  v_changelog := btrim(p_changelog);
  if v_version   = '' then raise exception 'Giv opslaget en version.'; end if;
  if v_changelog = '' then raise exception 'Changeloggen maa ikke vaere tom.'; end if;
  select count(*) into n_modeller
  from unnest(coalesce(p_model_ids, '{}'::uuid[])) as mid
  where exists (select 1 from public.models m where m.id = mid);
  if n_modeller = 0 then raise exception 'Vaelg mindst een model.'; end if;

  update public.software_updates
     set version     = v_version,
         released_at = coalesce(p_released_at, current_date),
         changelog   = v_changelog,
         note        = nullif(btrim(p_note), '')
   where id = p_id;
  perform public.saet_ota_modeller(p_id, p_model_ids);
end;
$$;

create or replace function public.admin_slet_ota(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.er_admin() then raise exception 'Kun admin kan slette OTA-opslag.'; end if;
  delete from public.software_updates where id = p_id;  -- software_update_models cascader
end;
$$;

-- Rettigheder: kun authenticated kan kalde (og kun admin slipper forbi
-- er_admin()-tjekket indeni). saet_ota_modeller er intern - ingen grant.
revoke all on function public.saet_ota_modeller(uuid, uuid[])                        from public;
revoke all on function public.admin_opret_ota(text, date, text, text, uuid[])        from public;
revoke all on function public.admin_ret_ota(uuid, text, date, text, text, uuid[])    from public;
revoke all on function public.admin_slet_ota(uuid)                                   from public;

grant execute on function public.admin_opret_ota(text, date, text, text, uuid[])     to authenticated;
grant execute on function public.admin_ret_ota(uuid, text, date, text, text, uuid[]) to authenticated;
grant execute on function public.admin_slet_ota(uuid)                                to authenticated;
