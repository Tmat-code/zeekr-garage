-- Zeekr Garage - Slet/arkiver model i Vaerkstedet (P18)
-- ---------------------------------------------------------------------------
-- Modstykket til P17 (Tilfoej model). Man kan nu oprette en model i UI; man
-- skal ogsaa kunne fjerne/arkivere den - ellers er en admin UDEN Studio-adgang
-- laast ude (kan ikke rydde en fejloprettet model), og det bryder princippet
-- om at ALT forum-/model-kuratering sker i Vaerkstedet uden SQL. Dette lukker
-- det sidste hul paa model-siden.
--
-- To veje (en model er rygraden: badge, Min Garage-bil, bekraeftelser, forum,
-- rapport - saa den maa aldrig cascade-smadres mens den er i brug):
--   * SLET (hard delete) KUN naar modellen er TOM: 0 ikke-fjernede forum-traade,
--     0 cars, 0 confirmations. Saa er det en ren fjernelse (fx en testmodel).
--   * ARKIVER naar modellen ER i brug: bevar alle data + rapporter, men tag den
--     ud af omloeb. models.archived-flag + model-foraet laases (is_locked) saa
--     der ikke kommer nye traade - men foraet forbliver LAESBART (ikke skjult).
--
-- models/variants/forum_categories har ingen delete-/update-policy for dette i
-- dag, derfor security-definer RPC'er (samme moenster som admin_opret_model /
-- admin_saet_rolle): er_admin()-gated, pinnet search_path, bypasser RLS internt.
--
-- Idempotent: add column if not exists + create or replace function.

-- ===========================================================================
-- 1) Skema: archived-flag paa models (lille, koeres EN gang i Studio).
--    Default false => alle eksisterende modeller forbliver i omloeb.
-- ===========================================================================
alter table public.models
  add column if not exists archived boolean not null default false;

-- ===========================================================================
-- 2) Laese-RPC: model-oversigt til Modeller-panelet (admin-only).
--    Returnerer EN raekke pr. model med brugs-tal. Security definer, saa
--    taellingerne er korrekte uanset RLS; er_admin() i WHERE => ikke-admin
--    faar tom liste. Taeller KUN ikke-fjernede forum-traade (jf. slet-kriteriet).
-- ===========================================================================
create or replace function public.admin_model_oversigt()
returns table (
  id            uuid,
  slug          text,
  name          text,
  platform      text,
  display_order int,
  archived      boolean,
  forum_slug    text,
  antal_biler          bigint,
  antal_bekraeftelser  bigint,
  antal_traade         bigint
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.slug,
    m.name,
    m.platform,
    m.display_order,
    m.archived,
    fc.slug as forum_slug,
    (select count(*) from public.cars c           where c.model_id = m.id)                      as antal_biler,
    (select count(*) from public.confirmations cf where cf.model_id = m.id)                     as antal_bekraeftelser,
    (select count(*) from public.forum_threads t
       where t.category_id = fc.id and t.is_removed = false)                                    as antal_traade
  from public.models m
  left join public.forum_categories fc on fc.model_id = m.id
  where public.er_admin()
  order by m.archived asc, m.display_order asc;
$$;

revoke all on function public.admin_model_oversigt() from public;
grant execute on function public.admin_model_oversigt() to authenticated;

-- ===========================================================================
-- 3) Mutations-RPC: hard delete - KUN naar modellen er tom.
--    Taeller de tre; er alt 0 => slet model-foraet (forum_categories) + models
--    (variants cascader). Ellers rejs en fejl der peger paa "arkiver i stedet".
--    cars.model_id har IKKE on delete cascade, saa et forsoeg paa at slette en
--    model med biler ville alligevel fejle paa FK - men vi tjekker foer, saa
--    brugeren faar en venlig fejl og intet forsoeges slettet.
-- ===========================================================================
create or replace function public.admin_slet_model(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug     text;
  v_model_id uuid;
  v_cat_id   uuid;
  n_biler    bigint;
  n_bekr     bigint;
  n_traade   bigint;
begin
  if not public.er_admin() then
    raise exception 'Kun admin kan slette modeller.';
  end if;

  v_slug := lower(btrim(p_slug));
  select id into v_model_id from public.models where slug = v_slug;
  if v_model_id is null then
    raise exception 'Modellen "%" findes ikke.', v_slug;
  end if;

  select id into v_cat_id from public.forum_categories where model_id = v_model_id;

  select count(*) into n_biler from public.cars          where model_id = v_model_id;
  select count(*) into n_bekr  from public.confirmations where model_id = v_model_id;
  select count(*) into n_traade
    from public.forum_threads
   where v_cat_id is not null and category_id = v_cat_id and is_removed = false;

  if n_biler > 0 or n_bekr > 0 or n_traade > 0 then
    raise exception
      'Modellen er i brug (% bil(er), % bekræftelse(r), % tråd(e)) og kan ikke slettes - arkivér den i stedet.',
      n_biler, n_bekr, n_traade;
  end if;

  -- Tom model: fjern model-foraet (ingen aktive traade; evt. soft-removed
  -- traade/indlaeg cascader med - de er allerede usynlige) og derefter modellen
  -- (variants cascader). forum_categories.model_id er "on delete set null", saa
  -- vi sletter kategorien eksplicit frem for at efterlade en foraeldreloes skal.
  if v_cat_id is not null then
    delete from public.forum_categories where id = v_cat_id;
  end if;
  delete from public.models where id = v_model_id;
end;
$$;

revoke all on function public.admin_slet_model(text) from public;
grant execute on function public.admin_slet_model(text) to authenticated;

-- ===========================================================================
-- 4) Mutations-RPC: arkiver / genaktiver.
--    Saetter models.archived + laaser/laaser-op model-foraet (is_locked).
--    Arkiveret = ude af "vaelg model"-lister (filtreres i app'en) men data +
--    rapport intakt; foraet laast men laesbart. Genaktiver = lås op igen
--    (simpelt: vi husker ikke en evt. tidligere manuel laas - genaktiver laaser op).
-- ===========================================================================
create or replace function public.admin_saet_model_arkiv(p_slug text, p_arkiv boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug     text;
  v_model_id uuid;
begin
  if not public.er_admin() then
    raise exception 'Kun admin kan arkivere modeller.';
  end if;

  v_slug := lower(btrim(p_slug));
  select id into v_model_id from public.models where slug = v_slug;
  if v_model_id is null then
    raise exception 'Modellen "%" findes ikke.', v_slug;
  end if;

  update public.models set archived = coalesce(p_arkiv, false) where id = v_model_id;

  -- Laas/laas-op model-foraet saa der ikke kan startes nye traade i en arkiveret
  -- model (men foraet forbliver laesbart - skjules ikke).
  update public.forum_categories
     set is_locked = coalesce(p_arkiv, false)
   where model_id = v_model_id;
end;
$$;

revoke all on function public.admin_saet_model_arkiv(text, boolean) from public;
grant execute on function public.admin_saet_model_arkiv(text, boolean) to authenticated;
