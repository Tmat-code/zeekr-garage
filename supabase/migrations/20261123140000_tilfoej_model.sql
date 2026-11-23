-- Zeekr Garage - Tilfoej model i Vaerkstedet (P17)
-- ---------------------------------------------------------------------------
-- Giver admin mulighed for at oprette en ny Zeekr-model + dens model-forum
-- (+ 0..n varianter) i ET hug, uden SQL i Studio. Det er den sidste SQL-only
-- pligt paa model-siden: et model-forum SKAL kobles til en models-raekke
-- (badge, Min Garage-bil, "mig med"-bekraeftelser, Zeekr-rapport), saa
-- Modellerne er bevidst spaerret for almindelige kategorier (jf. P7).
--
-- Moenster: EN security-definer RPC (er_admin()-gated) der opretter alle
-- raekker i EN transaktion. Undgaar delvist-oprettet model og tre separate
-- RLS-insert-policies. Samme moenster som admin_saet_rolle / admin_inviter.
-- models + variants beholder dermed deres rene laese-RLS; skrivning sker kun
-- gennem denne funktion (security definer bypasser RLS internt).
--
-- Idempotent: create or replace. Ingen skema-aendring (tabeller findes).

create or replace function public.admin_opret_model(
  p_name      text,
  p_platform  text,
  p_slug      text,
  p_varianter text[] default '{}'
)
returns text                       -- den nye models slug
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name        text;
  v_platform    text;
  v_slug        text;
  v_model_id    uuid;
  v_group_label text;
  v_group_order int;
  v_model_ord   int;
  v_cat_ord     int;
  v_variant     text;
  v_ord         int := 0;
begin
  if not public.er_admin() then
    raise exception 'Kun admin kan oprette modeller.';
  end if;

  v_name     := btrim(p_name);
  v_platform := btrim(p_platform);
  v_slug     := lower(btrim(p_slug));

  if v_name = ''     then raise exception 'Giv modellen et navn.'; end if;
  if v_platform = '' then raise exception 'Vælg eller skriv en platform.'; end if;
  if v_slug = ''     then raise exception 'Ugyldigt slug.'; end if;

  -- Slug skal vaere unik baade som model og som forum-kategori (model-forum
  -- bruger samme slug). Tjek foer indsaet for en venlig fejl; unique-constraints
  -- er alligevel sidste vaern (hele funktionen ruller tilbage ved konflikt).
  if exists (select 1 from public.models where slug = v_slug) then
    raise exception 'Der findes allerede en model med slug "%".', v_slug;
  end if;
  if exists (select 1 from public.forum_categories where slug = v_slug) then
    raise exception 'Der findes allerede en kategori med slug "%".', v_slug;
  end if;

  -- 1) models-raekke (display_order: naeste ledige, samme 10-spring som seed).
  select coalesce(max(display_order), 0) + 10 into v_model_ord from public.models;
  insert into public.models (slug, name, platform, display_order)
  values (v_slug, v_name, v_platform, v_model_ord)
  returning id into v_model_id;

  -- 2) forum-kategori (model-forum). Gruppen afledes ROBUST fra eksisterende
  --    model-fora (model_id != null), ikke fra den bogstavelige label
  --    "Modellerne" - saa det holder selv hvis gruppen er omdoebt/omsorteret.
  select group_label, group_order
    into v_group_label, v_group_order
  from public.forum_categories
  where model_id is not null
  order by group_order asc, display_order asc
  limit 1;

  if v_group_label is null then           -- ingen model-fora endnu (tom DB)
    v_group_label := 'Modellerne';
    v_group_order := 2;
  end if;

  select coalesce(max(display_order), 0) + 1 into v_cat_ord
  from public.forum_categories
  where group_label = v_group_label;

  insert into public.forum_categories
    (slug, name, description, icon, group_label, group_order, display_order, model_id)
  values (
    v_slug,
    v_name,
    'Alt om ' || v_name || ' - snak, spørgsmål og erfaringer.',
    '🚗',                                  -- holdes, men model-raekker rendrer badge (ikke emoji)
    v_group_label,
    v_group_order,
    v_cat_ord,
    v_model_id
  );

  -- 3) varianter (0..n). Tomme strenge springes over; dubletter ignoreres.
  if p_varianter is not null then
    foreach v_variant in array p_varianter loop
      v_variant := btrim(v_variant);
      if v_variant <> '' then
        v_ord := v_ord + 1;
        insert into public.variants (model_id, name, display_order)
        values (v_model_id, v_variant, v_ord)
        on conflict (model_id, name) do nothing;
      end if;
    end loop;
  end if;

  return v_slug;
end;
$$;

-- Kun authenticated kan kalde (og kun admin slipper forbi er_admin()-tjekket).
revoke all on function public.admin_opret_model(text, text, text, text[]) from public;
grant execute on function public.admin_opret_model(text, text, text, text[]) to authenticated;
