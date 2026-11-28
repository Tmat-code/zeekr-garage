-- P44 gennemklik: ryd ALT test-indhold op igen (kør i Zeekr-Studio, 8002).
-- Testkontoen: pestell.mathiasen+zeekr@gmail.com ("Testbruger Zeer").
-- Alt den har lavet slettes; derefter selve kontoen (profil, bil, stemmer,
-- notifikationer følger med via cascade). Kør trin 1 først og se tallene.

-- ── Trin 1: forhåndsvisning (ændrer intet) ───────────────────────────────
with u as (select id from auth.users where email = 'pestell.mathiasen+zeekr@gmail.com')
select 'konto'         as hvad, count(*) from u
union all select 'meldinger',      count(*) from public.issues           where created_by in (select id from u)
union all select 'kommentarer',    count(*) from public.comments         where author_id  in (select id from u)
union all select 'tråde',          count(*) from public.forum_threads    where author_id  in (select id from u)
union all select 'indlæg',         count(*) from public.forum_posts      where author_id  in (select id from u)
union all select 'samtaler',       count(*) from public.conversations c  where exists (select 1 from public.conversation_participants p where p.conversation_id = c.id and p.user_id in (select id from u))
union all select 'kontakt',        count(*) from public.kontakt_beskeder where user_id    in (select id from u)
union all select 'notif. til andre', count(*) from public.notifications  where aktoer_id  in (select id from u);
-- Forventet pr. 28-11: konto 1, meldinger 3, kommentarer 1, tråde 1, indlæg 2,
-- samtaler 1, kontakt 1, notif. til andre = de prajs du (og staben) har fået.

-- ── Trin 2: slet (i én transaktion) ──────────────────────────────────────
begin;

create temp table p44_u on commit drop as
  select id from auth.users where email = 'pestell.mathiasen+zeekr@gmail.com';

-- Notifikationer testkontoen har udløst hos andre (svar, besked, kontakt-praj).
delete from public.notifications where aktoer_id in (select id from p44_u);

-- Kontakt-henvendelsen.
delete from public.kontakt_beskeder where user_id in (select id from p44_u);

-- Samtaler testkontoen deltager i (beskeder, deltagere, billeder følger med).
delete from public.conversations c
 where exists (select 1 from public.conversation_participants p
                where p.conversation_id = c.id and p.user_id in (select id from p44_u));

-- Forum: trådene (indlæg, oversættelses-cache, følgere følger med) + evt. løse svar andre steder.
delete from public.forum_threads where author_id in (select id from p44_u);
delete from public.forum_posts   where author_id in (select id from p44_u);

-- Feedback: kommentarer + meldingerne (stemmer, modeller, billeder, titel-cache følger med).
delete from public.comments where author_id  in (select id from p44_u);
delete from public.issues   where created_by in (select id from p44_u);

-- Selve kontoen (profiles + cars + resterende stemmer + egne notifikationer via cascade).
delete from auth.users where id in (select id from p44_u);

commit;

-- ── Trin 3: kontrol (alle skal give 0) ───────────────────────────────────
select
  (select count(*) from auth.users where email = 'pestell.mathiasen+zeekr@gmail.com') as konto,
  (select count(*) from public.issues where title ilike 'P44 %')                       as meldinger,
  (select count(*) from public.forum_threads where title ilike 'P44 %')                as traade,
  (select count(*) from public.kontakt_beskeder where emne ilike 'P44 %')              as kontakt;
