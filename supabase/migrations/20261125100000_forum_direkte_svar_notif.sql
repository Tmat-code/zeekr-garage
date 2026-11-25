-- Zeekr Garage - Forum: direkte-svar-notifikation + deep-link til det konkrete svar (P34)
-- ---------------------------------------------------------------------------
-- P33 gav traadede svar (parent_id + reply_to_author). I dag notificerer et svar
-- KUN traadens foelgere (traad_foelgere), og notifikationens href peger paa selve
-- traad-siden - ikke det konkrete indlaeg. Saa man lander oeverst og maa selv lede.
--
-- Denne migration goer to ting, begge i trigger-funktionen forum_post_notify():
--
--  1) DIREKTE-SVAR-NOTIFIKATION: naar et svar har en direkte besvaret forfatter,
--     faar den person en notifikation ("X svarede paa dit indlaeg ..."), UD OVER
--     de nuvaerende foelger-notifikationer. Den direkte besvarede findes saadan:
--       - svar paa et UNDERSVAR     -> reply_to_author (den konkrete person)
--       - svar paa aabning/top-svar -> forfatteren af parent_id-indlaegget
--       - top-svar uden maal         -> ingen direkte besvaret (kun foelgere)
--     Dedup (laast med Torben):
--       - aldrig notificer dig selv (svarer man paa sit eget indlaeg: ingen direkte);
--       - den direkte besvarede faar KUN EEN notifikation for haendelsen - den
--         direkte - og udelades derfor fra foelger-indsaettelsen.
--     Den direkte notif affyres uanset follow/mute-status (et direkte svar til dig
--     er personligt og skal naa frem, selv hvis du har mutet traaden).
--
--  2) DEEP-LINK: href peger nu paa '#post-<id>' for det NYE indlaeg - gaelder BAADE
--     den nye direkte notif OG den eksisterende foelger-notif - saa et klik lander
--     paa selve svaret i stedet for traad-toppen. Landings-haandteringen (scroll +
--     fremhaev + fold "Vis N svar"-gruppen ud) ligger i ForumTraad-komponenten.
--
-- Kun forum_post_notify() erstattes (create or replace). Trigger, tabeller, RLS og
-- realtime fra 20261122100000_notifikationer.sql er uaendrede. Begge notifer bruger
-- fortsat type 'forum_svar' (samme klokke-ikon); teksten adskiller dem. Idempotent.

create or replace function public.forum_post_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title   text;
  v_cat     text;      -- kategori-slug
  v_tslug   text;      -- traad-slug
  v_navn    text;
  v_href    text;
  v_tekst   text;
  v_direkte uuid;      -- den DIREKTE besvarede forfatter (til direkte-svar-notif)
  v_dtekst  text;
begin
  -- Ingen forfatter (kan ske pga. on delete set null) -> intet at goere.
  if new.author_id is null then
    return new;
  end if;

  select th.title, th.slug, c.slug
    into v_title, v_tslug, v_cat
    from public.forum_threads th
    join public.forum_categories c on c.id = th.category_id
   where th.id = new.thread_id;
  if v_title is null then
    return new; -- traaden findes ikke (burde ikke ske)
  end if;

  -- Deep-link: peg paa det KONKRETE indlaeg (#post-<id>), ikke bare traad-toppen.
  v_href := '/forum/' || v_cat || '/' || v_tslug || '#post-' || new.id::text;

  -- Et SVAR (ikke aabnings-indlaegget) notificerer foelgere + evt. den direkte besvarede.
  if not new.is_opening then
    select coalesce(nullif(trim(p.display_name), ''), 'En ejer')
      into v_navn
      from public.profiles p
     where p.id = new.author_id;
    v_navn := coalesce(v_navn, 'En ejer');
    v_tekst := v_navn || ' svarede i "' || v_title || '"';

    -- Hvem svarer man DIREKTE paa?
    --   reply_to_author sat (svar paa et undersvar) -> den person
    --   ellers parent_id sat (svar paa aabning/top-svar) -> parent-indlaeggets forfatter
    --   ingen af delene (top-svar uden maal) -> ingen direkte besvaret
    v_direkte := new.reply_to_author;
    if v_direkte is null and new.parent_id is not null then
      select author_id
        into v_direkte
        from public.forum_posts
       where id = new.parent_id;
    end if;
    -- Aldrig dig selv.
    if v_direkte = new.author_id then
      v_direkte := null;
    end if;

    -- Foelger-notifikationer: alle AKTIVE foelgere undtagen forfatteren OG den
    -- direkte besvarede (dedup: den direkte besvarede faar KUN den direkte notif).
    insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
    select f.user_id, 'forum_svar', new.author_id, new.thread_id, v_tekst, v_href
      from public.traad_foelgere f
     where f.thread_id = new.thread_id
       and f.muted = false
       and f.user_id <> new.author_id
       and (v_direkte is null or f.user_id <> v_direkte);

    -- Direkte-svar-notifikation: den man svarer direkte paa (ud over foelgerne).
    -- Uafhaengig af follow/mute - et direkte svar skal naa frem. Samme deep-link.
    if v_direkte is not null then
      v_dtekst := v_navn || ' svarede paa dit indlaeg i "' || v_title || '"';
      insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
      values (v_direkte, 'forum_svar', new.author_id, new.thread_id, v_dtekst, v_href);
    end if;
  end if;

  -- Forfatteren foelger nu traaden (opret ELLER svar). Idempotent.
  insert into public.traad_foelgere (thread_id, user_id)
  values (new.thread_id, new.author_id)
  on conflict (thread_id, user_id) do nothing;

  return new;
end;
$$;
