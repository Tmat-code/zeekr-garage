-- Zeekr Garage - Guides-kategori (seed)
-- ---------------------------------------------------------------------------
-- En LAAST kategori i Velkommen-gruppen til stab-skrevne guides/vejledninger.
-- is_locked => kun moderator/admin opretter traade (selve guiderne); almindelige
-- brugere kan stadig SVARE (spoerge) i den enkelte guide-traad, praecis som
-- 'regler'-kategorien. Ingen ny kode - forummet haandterer alt via den
-- eksisterende is_locked-mekanik. Diskussions-/FAQ-snak har i forvejen hjem i
-- 'diy-faq' (Teknik); denne er den kuraterede guide-hylde.
--
-- Idempotent paa slug (on conflict do nothing).

insert into public.forum_categories
  (slug, name, description, icon, group_label, group_order, display_order, is_locked)
values
  ('guides', 'Guides',
   'Stab-skrevne guides og vejledninger. Spørgsmål er velkomne i svarene - selve guiderne skriver vi.',
   '📚', 'Velkommen', 1, 3, true)
on conflict (slug) do nothing;
