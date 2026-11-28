-- P44 gennemklik, moderator-delen: ryd det sidste test-indhold (kør i Zeekr-Studio, 8002).
-- Test-meldingerne A og B er allerede slettet fra Værkstedet (og testede dermed "Slet").
-- Tilbage: testtråden, kontakt-henvendelsen og de prajs, henvendelsen gav staben.

-- ── Trin 1: forhåndsvisning ──────────────────────────────────────────────
select 'tråd' as hvad, count(*) from public.forum_threads where title = 'P44 mod-test tråd'
union all select 'kontakt', count(*) from public.kontakt_beskeder where emne = 'P44 mod-test kontakt'
union all select 'notif.', count(*) from public.notifications
  where created_at > '2026-11-28' and (tekst ilike '%P44%' or params::text ilike '%P44%');
-- Forventet: tråd 1, kontakt 1, notif. = de prajs de to andre moderatorer fik om henvendelsen.

-- ── Trin 2: slet ─────────────────────────────────────────────────────────
begin;
delete from public.notifications
 where created_at > '2026-11-28' and (tekst ilike '%P44%' or params::text ilike '%P44%');
delete from public.kontakt_beskeder where emne = 'P44 mod-test kontakt';
delete from public.forum_threads where title = 'P44 mod-test tråd';   -- indlæg + følgere følger med
commit;

-- ── Trin 3: kontrol (alle 0) ─────────────────────────────────────────────
select
  (select count(*) from public.issues where title ilike 'P44 %')                as meldinger,
  (select count(*) from public.forum_threads where title ilike 'P44 %')         as traade,
  (select count(*) from public.kontakt_beskeder where emne ilike 'P44 %')       as kontakt,
  (select count(*) from public.notifications
     where created_at > '2026-11-28' and (tekst ilike '%P44%' or params::text ilike '%P44%')) as notif;
