-- Zeekr Garage - UI-i18n skive U7: DB-indhold paa svensk/engelsk (28-11-2026)
-- ---------------------------------------------------------------------------
-- Kategorinavne, -beskrivelser og gruppe-label, forum-reglerne og forside-
-- beskeden skal kunne vises paa laeserens sprog. Samme moenster som U1b (links):
-- et manuelt felt pr. sprog i `oversaettelser jsonb`, dansk i selve kolonnerne
-- er altid kilden, tomt/manglende felt = dansk fallback. INGEN maskinoversaettelse.
--
--   forum_categories.oversaettelser  {"sv":{"name","description","group_label"},"en":{...}}
--   forum_rules.oversaettelser       {"sv":{"content"},"en":{"content"}}
--   site_announcement.oversaettelser {"sv":{"message"},"en":{"message"}}
--
-- group_label er denormaliseret pr. kategori-raekke, saa gruppens oversaettelse
-- ligger paa hver raekke i gruppen og holdes ens af:
--   * RPC forum_saet_gruppe_oversaettelser (editoren skriver hele gruppen paa en gang)
--   * en BEFORE-trigger: en ny kategori (app-oprettet eller admin_opret_model)
--     ARVER gruppens oversaettelse fra en soester-raekke; flyttes en kategori til
--     en anden gruppe, faar den maalgruppens (eller ingen).
-- Triggeren udfylder ogsaa nye MODEL-fora med standard-beskrivelsen paa sv/en
-- ("Alt om X - snak, spoergsmaal og erfaringer.") og renser altid jsonb'en
-- (kun sv/en + kendte felter, trim, tomme ud, laengde-loft) - forum_rules og
-- site_announcement opdateres direkte via RLS, saa rensningen skal ligge i DB.
--
-- Seed: sv+en for ALLE nuvaerende grupper/kategorier (matchet paa DANSK tekst,
-- navn og beskrivelse hver for sig) + reglerne (kun hvis den danske tekst stadig
-- er seed-teksten). KUN raekker med oversaettelser = '{}' => idempotent og
-- overskriver aldrig noget staben selv har skrevet. Samme tabel som
-- lib/forum-oversaettelser.ts (scripts/i18n-test.mjs tjekker at de er ens).
--
-- Idempotent: add column if not exists, constraint-tjek, create or replace,
-- drop trigger if exists, seed kun paa '{}'.

-- ===========================================================================
-- 1) Kolonner + check (altid et json-objekt).
-- ===========================================================================
alter table public.forum_categories
  add column if not exists oversaettelser jsonb not null default '{}'::jsonb;
alter table public.forum_rules
  add column if not exists oversaettelser jsonb not null default '{}'::jsonb;
alter table public.site_announcement
  add column if not exists oversaettelser jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'forum_categories_oversaettelser_objekt') then
    alter table public.forum_categories add constraint forum_categories_oversaettelser_objekt
      check (jsonb_typeof(oversaettelser) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'forum_rules_oversaettelser_objekt') then
    alter table public.forum_rules add constraint forum_rules_oversaettelser_objekt
      check (jsonb_typeof(oversaettelser) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_announcement_oversaettelser_objekt') then
    alter table public.site_announcement add constraint site_announcement_oversaettelser_objekt
      check (jsonb_typeof(oversaettelser) = 'object');
  end if;
end $$;

-- ===========================================================================
-- 2) Rensning med eget laengde-loft. Samme regler som U1b's
--    rens_oversaettelser (som er fast paa 300 tegn - for kort til regler og
--    forside-besked). Spejlet i TS: rensOversaettelser(raw, felter, maks).
-- ===========================================================================
create or replace function public.rens_oversaettelser_maks(p jsonb, p_felter text[], p_maks int)
returns jsonb
language plpgsql
immutable
as $$
declare
  ud jsonb := '{}'::jsonb;
  s text;
  f text;
  v text;
  sprog_obj jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return '{}'::jsonb;
  end if;
  foreach s in array array['sv', 'en'] loop
    sprog_obj := '{}'::jsonb;
    if jsonb_typeof(p -> s) = 'object' then
      foreach f in array p_felter loop
        if jsonb_typeof(p -> s -> f) = 'string' then
          v := left(btrim(p -> s ->> f), p_maks);
          if v <> '' then
            sprog_obj := sprog_obj || jsonb_build_object(f, v);
          end if;
        end if;
      end loop;
    end if;
    if sprog_obj <> '{}'::jsonb then
      ud := ud || jsonb_build_object(s, sprog_obj);
    end if;
  end loop;
  return ud;
end;
$$;

-- ===========================================================================
-- 3) Triggere.
-- ===========================================================================
-- 3a) forum_categories: gruppe-arv + model-beskrivelse + rensning.
create or replace function public.forum_kategori_oversaettelser_trg()
returns trigger
language plpgsql
as $$
declare
  ov jsonb := coalesce(new.oversaettelser, '{}'::jsonb);
  soester jsonb;
  s text;
  gruppe_skift boolean;
begin
  if jsonb_typeof(ov) <> 'object' then ov := '{}'::jsonb; end if;

  gruppe_skift := tg_op = 'INSERT' or new.group_label is distinct from old.group_label;

  if gruppe_skift then
    -- Gruppens oversaettelse fra en anden raekke i (maal)gruppen.
    select c.oversaettelser into soester
      from public.forum_categories c
     where c.group_label = new.group_label
       and c.id is distinct from new.id
       and (c.oversaettelser -> 'sv' ? 'group_label' or c.oversaettelser -> 'en' ? 'group_label')
     order by c.display_order, c.id
     limit 1;
    foreach s in array array['sv', 'en'] loop
      -- INSERT med eksplicit gruppe-oversaettelse beholder den; ellers arv.
      if tg_op = 'INSERT' and jsonb_typeof(ov -> s) = 'object' and ov -> s ? 'group_label' then
        continue;
      end if;
      if jsonb_typeof(ov -> s) = 'object' then
        ov := jsonb_set(ov, array[s], (ov -> s) - 'group_label');
      end if;
      if soester is not null and soester -> s ? 'group_label' then
        ov := jsonb_set(ov, array[s],
          coalesce(case when jsonb_typeof(ov -> s) = 'object' then ov -> s end, '{}'::jsonb)
          || jsonb_build_object('group_label', soester -> s -> 'group_label'));
      end if;
    end loop;
  end if;

  -- Model-fora med standard-beskrivelsen faar den paa sv/en (hvis ikke skrevet).
  if new.model_id is not null
     and new.description = 'Alt om ' || new.name || ' - snak, spørgsmål og erfaringer.' then
    if not (coalesce(ov -> 'sv', '{}'::jsonb) ? 'description') then
      ov := jsonb_set(ov, array['sv'],
        coalesce(case when jsonb_typeof(ov -> 'sv') = 'object' then ov -> 'sv' end, '{}'::jsonb)
        || jsonb_build_object('description', 'Allt om ' || new.name || ' - snack, frågor och erfarenheter.'));
    end if;
    if not (coalesce(ov -> 'en', '{}'::jsonb) ? 'description') then
      ov := jsonb_set(ov, array['en'],
        coalesce(case when jsonb_typeof(ov -> 'en') = 'object' then ov -> 'en' end, '{}'::jsonb)
        || jsonb_build_object('description', 'All about ' || new.name || ' - chat, questions and experiences.'));
    end if;
  end if;

  new.oversaettelser := public.rens_oversaettelser_maks(ov, array['name', 'description', 'group_label'], 1000);
  return new;
end;
$$;

drop trigger if exists forum_kategori_oversaettelser on public.forum_categories;
create trigger forum_kategori_oversaettelser
  before insert or update on public.forum_categories
  for each row execute function public.forum_kategori_oversaettelser_trg();

-- 3b) forum_rules + site_announcement: kun rensning (opdateres direkte via RLS).
create or replace function public.forum_regler_oversaettelser_trg()
returns trigger language plpgsql as $$
begin
  new.oversaettelser := public.rens_oversaettelser_maks(new.oversaettelser, array['content'], 20000);
  return new;
end; $$;

drop trigger if exists forum_regler_oversaettelser on public.forum_rules;
create trigger forum_regler_oversaettelser
  before insert or update on public.forum_rules
  for each row execute function public.forum_regler_oversaettelser_trg();

create or replace function public.forside_besked_oversaettelser_trg()
returns trigger language plpgsql as $$
begin
  new.oversaettelser := public.rens_oversaettelser_maks(new.oversaettelser, array['message'], 4000);
  return new;
end; $$;

drop trigger if exists forside_besked_oversaettelser on public.site_announcement;
create trigger forside_besked_oversaettelser
  before insert or update on public.site_announcement
  for each row execute function public.forside_besked_oversaettelser_trg();

-- ===========================================================================
-- 4) RPC: saet en gruppes oversaettelse paa ALLE dens raekker (atomisk).
--    Moderator (som resten af kategori-editoren / forum_categories_write_mod).
--    Navn/beskrivelse paa raekkerne roeres ikke. Returnerer antal raekker.
-- ===========================================================================
create or replace function public.forum_saet_gruppe_oversaettelser(
  p_label          text,
  p_oversaettelser jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb; n int;
begin
  if not public.er_moderator() then raise exception 'Kun moderator/admin.'; end if;
  v := public.rens_oversaettelser_maks(p_oversaettelser, array['group_label'], 1000);
  update public.forum_categories c
     set oversaettelser = (
       select coalesce(jsonb_object_agg(x.s, x.obj), '{}'::jsonb)
         from (
           select s,
                  (case when jsonb_typeof(c.oversaettelser -> s) = 'object'
                        then c.oversaettelser -> s else '{}'::jsonb end - 'group_label')
                  || coalesce(v -> s, '{}'::jsonb) as obj
             from unnest(array['sv', 'en']) s
         ) x
        where x.obj <> '{}'::jsonb)
   where c.group_label = p_label;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Gruppen findes ikke.'; end if;
  return n;
end;
$$;

revoke all on function public.forum_saet_gruppe_oversaettelser(text, jsonb) from public, anon;
grant execute on function public.forum_saet_gruppe_oversaettelser(text, jsonb) to authenticated;

-- ===========================================================================
-- 5) P32-revert: oversaettelses-felterne maa fortrydes som navn/besked.
--    (forum_rules er ikke under audit-loggen.) Samme liste som U3b + to raekker.
-- ===========================================================================
create or replace function public.revert_kolonne_ok(p_tabel text, p_kol text)
returns boolean
language sql
immutable
as $$
  select (p_tabel, p_kol) in (
    ('issues','status'), ('issues','severity'), ('issues','title'),
    ('issues','description'), ('issues','category'), ('issues','sprog'),
    ('forum_threads','title'), ('forum_threads','is_pinned'),
    ('forum_threads','is_locked'), ('forum_threads','is_removed'),
    ('forum_posts','body'), ('forum_posts','is_removed'),
    ('forum_categories','name'), ('forum_categories','description'),
    ('forum_categories','icon'), ('forum_categories','group_label'),
    ('forum_categories','group_order'), ('forum_categories','display_order'),
    ('forum_categories','is_locked'), ('forum_categories','model_id'),
    ('forum_categories','slug'), ('forum_categories','oversaettelser'),
    ('software_updates','version'), ('software_updates','released_at'),
    ('software_updates','changelog'), ('software_updates','note'),
    ('links','navn'), ('links','kilde'), ('links','url'),
    ('links','display_order'), ('links','group_id'), ('links','oversaettelser'),
    ('link_groups','titel'), ('link_groups','display_order'), ('link_groups','oversaettelser'),
    ('site_announcement','message'), ('site_announcement','active'),
    ('site_announcement','oversaettelser')
  );
$$;

-- ===========================================================================
-- 6) Seed: grupper + kategorier (matchet paa dansk navn / beskrivelse /
--    gruppe-label hver for sig). Model-fora: navnet er ens paa alle sprog;
--    standard-beskrivelsen og gruppen udfyldes af triggeren/seeden nedenfor.
--    KUN raekker med oversaettelser = '{}'. P32-audit (zz_audit) slaas fra
--    under seeden (en engangs-udfyldning er ikke en stab-handling - samme
--    hensyn som U3b's backfill); vores egen oversaettelses-trigger koerer.
-- ===========================================================================
do $$ begin
  if exists (select 1 from pg_trigger where tgname = 'zz_audit' and tgrelid = 'public.forum_categories'::regclass) then
    alter table public.forum_categories disable trigger zz_audit;
  end if;
end $$;

with g(da, sv, en) as (
  values
    ('Velkommen', 'Välkommen', 'Welcome'),
    ('Modellerne', 'Modellerna', 'The models'),
    ('Ejer-lounge', 'Ägarlounge', 'Owners'' lounge'),
    ('Teknik', 'Teknik', 'Tech'),
    ('Fællesskab', 'Gemenskap', 'Community'),
    ('Marked', 'Marknad', 'Marketplace'),
    ('Om Zeekr Garage', 'Om Zeekr Garage', 'About Zeekr Garage')
),
n(da, sv, en) as (
  values
    ('Præsentér dig', 'Presentera dig', 'Introduce yourself'),
    ('Community-regler', 'Community-regler', 'Community rules'),
    ('Guides', 'Guider', 'Guides'),
    ('Køb, priser & levering', 'Köp, priser & leverans', 'Buying, prices & delivery'),
    ('Anmeldelser & langtidstest', 'Recensioner & långtidstester', 'Reviews & long-term tests'),
    ('Billeder & videoer', 'Bilder & videor', 'Photos & videos'),
    ('Bilpleje & detailing', 'Bilvård & detailing', 'Car care & detailing'),
    ('Forsikring, service & værksted', 'Försäkring, service & verkstad', 'Insurance, service & workshops'),
    ('Opladning & rækkevidde', 'Laddning & räckvidd', 'Charging & range'),
    ('Tilbehør & dele', 'Tillbehör & delar', 'Accessories & parts'),
    ('App & infotainment', 'App & infotainment', 'App & infotainment'),
    ('Dæk, fælge & undervogn', 'Däck, fälgar & underrede', 'Tyres, wheels & suspension'),
    ('DIY & FAQ', 'DIY & FAQ', 'DIY & FAQ'),
    ('Træf, køreture & events', 'Träffar, turer & evenemang', 'Meets, drives & events'),
    ('Køb, salg & bytte', 'Köp, sälj & byt', 'Buy, sell & swap'),
    ('Ønsker og idéer', 'Önskemål och idéer', 'Wishes and ideas'),
    ('Fejl og problemer på siden', 'Fel och problem på sidan', 'Bugs and problems on the site'),
    ('Nyt fra admin', 'Nytt från admin', 'News from admin')
),
b(da, sv, en) as (
  values
    ('Ny her? Sig hej, og fortæl hvilken Zeekr du kører - eller drømmer om.', 'Ny här? Säg hej och berätta vilken Zeekr du kör - eller drömmer om.', 'New here? Say hi and tell us which Zeekr you drive - or dream of.'),
    ('Sådan holder vi en god, konstruktiv tone. Læs før du poster.', 'Så håller vi en god, konstruktiv ton. Läs innan du skriver.', 'How we keep a good, constructive tone. Read before you post.'),
    ('Stab-skrevne guides og vejledninger. Spørgsmål er velkomne i svarene - selve guiderne skriver vi.', 'Guider och instruktioner skrivna av teamet. Frågor är välkomna i svaren - själva guiderna skriver vi.', 'Guides and how-tos written by the team. Questions are welcome in the replies - the guides themselves are written by us.'),
    ('Bestilling, priser, leveringstider og dialog med forhandleren.', 'Beställning, priser, leveranstider och kontakten med återförsäljaren.', 'Ordering, prices, delivery times and dealing with the dealer.'),
    ('Dine indtryk efter uger og måneder bag rattet.', 'Dina intryck efter veckor och månader bakom ratten.', 'Your impressions after weeks and months behind the wheel.'),
    ('Vis din bil frem - foto, clips og roadtrips.', 'Visa upp din bil - foton, klipp och roadtrips.', 'Show off your car - photos, clips and road trips.'),
    ('Vask, voks, coating, lakpleje og at holde bilen flot.', 'Tvätt, vax, coating, lackvård och att hålla bilen fin.', 'Washing, waxing, coating, paint care and keeping the car looking good.'),
    ('Forsikringsvalg, serviceintervaller, garanti og værkstedserfaringer.', 'Val av försäkring, serviceintervall, garanti och verkstadserfarenheter.', 'Choosing insurance, service intervals, warranty and workshop experiences.'),
    ('Ladekurver, forbrug, vinter-rækkevidde og ladenetværk i Norden.', 'Laddkurvor, förbrukning, vinterräckvidd och laddnätverk i Norden.', 'Charging curves, consumption, winter range and charging networks in the Nordics.'),
    ('Måtter, tagbøjler, folie, originaldele og aftermarket.', 'Mattor, takräcken, folie, originaldelar och eftermarknad.', 'Mats, roof bars, wraps, original parts and aftermarket.'),
    ('Zeekr-app, skærm, lyd, CarPlay/Android og smarte tips.', 'Zeekr-appen, skärm, ljud, CarPlay/Android och smarta tips.', 'The Zeekr app, screen, audio, CarPlay/Android and clever tips.'),
    ('Sommer/vinter, dimensioner, fælge, affjedring og alt der ruller.', 'Sommar/vinter, dimensioner, fälgar, fjädring och allt som rullar.', 'Summer/winter, sizes, wheels, suspension and everything that rolls.'),
    ('Gør-det-selv-guides, tips og svar på de spørgsmål der går igen.', 'Gör-det-själv-guider, tips och svar på frågorna som återkommer.', 'Do-it-yourself guides, tips and answers to the questions that keep coming up.'),
    ('Stedet hvor vi finder ud af at mødes: foreslå en køretur, luft en idé til et træf, find en dato der passer flest. Er planen moden? Så bliver den til et rigtigt event under "Events" i menuen - med tilmelding og "Føj til kalender", så ingen glemmer det.', 'Platsen där vi kommer överens om att ses: föreslå en tur, lufta en idé till en träff, hitta ett datum som passar flest. Är planen klar? Då blir den ett riktigt evenemang under "Evenemang" i menyn - med anmälan och "Lägg till i kalendern", så att ingen glömmer det.', 'The place where we work out how to meet: suggest a drive, float an idea for a meet, find a date that suits most people. Is the plan ready? Then it becomes a proper event under "Events" in the menu - with sign-up and "Add to calendar", so nobody forgets.'),
    ('Markedsplads mellem ejere - brugte dele, tilbehør og biler. Privat, ikke erhverv.', 'Marknadsplats mellan ägare - begagnade delar, tillbehör och bilar. Privat, inte företag.', 'Marketplace between owners - used parts, accessories and cars. Private, not trade.'),
    ('Hvad kunne gøre zeekr-garage.dk bedre? Foreslå funktioner og forbedringer til selve siden. (Ønsker og fejl til din BIL hører hjemme under Feedback.)', 'Vad skulle göra zeekr-garage.dk bättre? Föreslå funktioner och förbättringar av själva sidan. (Önskemål och fel på din BIL hör hemma under Feedback.)', 'What would make zeekr-garage.dk better? Suggest features and improvements to the site itself. (Wishes and bugs for your CAR belong under Feedback.)'),
    ('Noget der ikke virker på selve siden - knapper, visning, login og lignende. (Fejl på din Zeekr meldes under Feedback.)', 'Något som inte fungerar på själva sidan - knappar, visning, inloggning och liknande. (Fel på din Zeekr rapporteras under Feedback.)', 'Something that doesn''t work on the site itself - buttons, display, login and the like. (Faults on your Zeekr are reported under Feedback.)'),
    ('Nyt om siden fra admin - hvad der er lavet, og hvad der er på vej. Kun admin opretter opslag; alle er velkomne i kommentarerne.', 'Nytt om sidan från admin - vad som har gjorts och vad som är på väg. Bara admin skapar inlägg; alla är välkomna i kommentarerna.', 'News about the site from admin - what has been done and what''s on the way. Only admin creates posts; everyone is welcome in the comments.')
)
update public.forum_categories c
   set oversaettelser = jsonb_strip_nulls(jsonb_build_object(
         'sv', jsonb_strip_nulls(jsonb_build_object('name', n.sv, 'description', b.sv, 'group_label', g.sv)),
         'en', jsonb_strip_nulls(jsonb_build_object('name', n.en, 'description', b.en, 'group_label', g.en))))
  from public.forum_categories c2
  left join g on g.da = c2.group_label
  left join n on n.da = c2.name
  left join b on b.da = c2.description
 where c.id = c2.id
   and c.oversaettelser = '{}'::jsonb
   and (g.da is not null or n.da is not null or b.da is not null
        or c2.description = 'Alt om ' || c2.name || ' - snak, spørgsmål og erfaringer.');
-- (Triggeren fylder model-beskrivelsen paa i samme update; jsonb_strip_nulls
--  fjerner tomme sprog-objekter, og rensningen fjerner dem igen hvis tomme.)

do $$ begin
  if exists (select 1 from pg_trigger where tgname = 'zz_audit' and tgrelid = 'public.forum_categories'::regclass) then
    alter table public.forum_categories enable trigger zz_audit;
  end if;
end $$;

-- ===========================================================================
-- 7) Seed: forum-reglerne - kun hvis den danske tekst stadig er seed-teksten
--    (whitespace-normaliseret), ellers ville oversaettelsen passe til en anden
--    tekst. Har staben rettet reglerne, skrives sv/en i regel-editoren.
-- ===========================================================================
update public.forum_rules
   set oversaettelser = jsonb_build_object(
         'sv', jsonb_build_object('content', $regler$Välkommen till Garaget. Här är några enkla spelregler, så att forumet blir en trevlig plats för alla Zeekr-ägare. (Moderatorerna kan alltid ändra texten här.)

## Tonen
- Var schyssta mot varandra - även när ni inte håller med.
- Vi är en konstruktiv ägargemenskap, inte en klagomur. Vill du se din bil bli bättre, så hjälp oss att göra feedbacken bra.
- Inga personangrepp, hets eller nedlåtande språk.

## Håll trådarna skarpa
- Skriv i rätt kategori - välj gärna modellforumet om det handlar om en viss modell.
- Sök först - kanske är din tråd redan igång.
- Har du hittat ett riktigt fel? Skapa det under Feedback, så samlar vi det strukturerat till Zeekr. En forumtråd försvinner i mängden.

## Bilder och integritet
- Dela gärna bilder på din bil, men akta dig för registreringsskyltar, VIN och andra personuppgifter.
- Dela inte andras personuppgifter utan lov.

## Marknad
- Köp, sälj och byt hör hemma i kategorin Marknad.
- Zeekr Garage är inte part i affärer mellan ägare - kom själva överens om det praktiska, och var försiktiga.

## Moderering
- Moderatorerna kan ändra, låsa eller ta bort innehåll som bryter mot reglerna.
- Har du sett något som inte hör hemma här? Skriv till en moderator.

Tack för att du hjälper till att hålla en god stämning. Trevligt snack!$regler$),
         'en', jsonb_build_object('content', $regler$Welcome to the Garage. Here are a few simple ground rules, so the forum stays a good place for all Zeekr owners. (The moderators can always edit this text.)

## The tone
- Be decent to each other - also when you disagree.
- We are a constructive owner community, not a complaints wall. If you want to see your car get better, help us make the feedback good.
- No personal attacks, harassment or condescending language.

## Keep threads focused
- Post in the right category - pick the model forum if it is about a specific model.
- Search first - your thread may already be going.
- Found a real fault? Report it under Feedback, so we can collect it in a structured way for Zeekr. A forum thread gets lost in the crowd.

## Photos and privacy
- Feel free to share photos of your car, but watch out for number plates, VIN and other personal details.
- Do not share other people's personal details without permission.

## Marketplace
- Buying, selling and swapping belong in the Marketplace category.
- Zeekr Garage is not a party to deals between owners - sort out the practical details yourselves, and be careful.

## Moderation
- The moderators can edit, lock or remove content that breaks the rules.
- Seen something that does not belong here? Write to a moderator.

Thanks for helping keep a good atmosphere. Happy chatting!$regler$))
 where id = 1
   and oversaettelser = '{}'::jsonb
   and regexp_replace(btrim(coalesce(content, '')), '\s+', ' ', 'g')
     = regexp_replace(btrim($regler$Velkommen i Garagen. Her er et par enkle spilleregler, så forummet bliver et rart sted for alle Zeekr-ejere. (Moderatorerne kan altid rette teksten her.)

## Tonen
- Tal ordentligt til hinanden - også når I er uenige.
- Vi er et konstruktivt ejer-fællesskab, ikke en klagemur. Vil du se din bil blive bedre, så hjælp os med at gøre feedbacken god.
- Ingen personangreb, hetz eller nedladende sprog.

## Hold trådene skarpe
- Skriv i den rigtige kategori - vælg gerne model-forummet, hvis det handler om en bestemt model.
- Søg først - måske er din tråd allerede i gang.
- Stødt på en rigtig fejl? Opret den på Feedback, så samler vi den struktureret til Zeekr. En forum-tråd forsvinder i mængden.

## Billeder og privatliv
- Del gerne billeder af din bil, men pas på med nummerplader, VIN og andre personlige oplysninger.
- Del ikke andres personlige oplysninger uden lov.

## Marked
- Køb, salg og bytte hører til i Marked-kategorien.
- Zeekr Garage er ikke part i handler mellem ejere - aftal selv det praktiske, og vær forsigtig.

## Moderering
- Moderatorerne kan rette, låse eller fjerne indhold, der bryder reglerne.
- Har du set noget, der ikke hører hjemme? Skriv til en moderator.

Tak fordi du er med til at holde en god stemning. God snak!$regler$), '\s+', ' ', 'g');
