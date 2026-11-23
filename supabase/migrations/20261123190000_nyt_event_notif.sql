-- Zeekr Garage - Notifikation ved NYT event (P13)
-- ---------------------------------------------------------------------------
-- Naar et event OPRETTES (INSERT paa events), lander en klokke-notifikation
-- hos ALLE brugere (type 'nyt_event'), saa hele community'et ser nye meetups
-- uden at folge noget. Genbruger notifications-indbakken + realtime + klokken.
--
-- Moenster = forum_post_notify / message_after_insert:
--  - security definer => trigger kan skrive notifications selvom den
--    oprettende moderator ikke ejer de andres raekker (ingen insert-policy paa
--    notifications; klienten kan ALDRIG oprette dem).
--  - AFTER INSERT => fyrer KUN ved oprettelse, aldrig ved opdatering/aflysning
--    (de mailes allerede til tilmeldte via event_updates).
--  - Opretteren selv notificeres IKKE (samme "ikke mig selv"-moenster som de to
--    andre triggere) - han staar jo lige og har oprettet eventet.
--
-- Idempotent: create-or-replace + drop-if-exists foran triggeren.

create or replace function public.event_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_navn  text;
  v_href  text;
  v_tekst text;
begin
  v_href := '/events/' || new.slug;

  -- Opretter-navn (bedst-effort) til teksten; falder tilbage til "Holdet".
  if new.created_by is not null then
    select coalesce(nullif(trim(p.display_name), ''), 'Holdet')
      into v_navn
      from public.profiles p
     where p.id = new.created_by;
  end if;
  v_navn := coalesce(v_navn, 'Holdet');

  v_tekst := v_navn || ' oprettede et nyt event: "' || new.title || '"';

  -- Én notifikation pr. bruger - undtagen opretteren selv.
  insert into public.notifications (modtager_id, type, aktoer_id, reference, tekst, href)
  select p.id, 'nyt_event', new.created_by, new.id, v_tekst, v_href
    from public.profiles p
   where new.created_by is null or p.id <> new.created_by;

  return new;
end;
$$;

drop trigger if exists events_after_insert on public.events;
create trigger events_after_insert
  after insert on public.events
  for each row execute function public.event_after_insert();
