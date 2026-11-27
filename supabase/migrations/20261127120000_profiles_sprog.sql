-- UI-i18n U1: brugerens valgte UI-sprog ("mit sprog").
-- null = intet valgt -> sproget følger cookie (zg_sprog) / browserens Accept-Language.
-- Skrives af brugeren selv via den eksisterende profiles_update_self-policy (ingen ny RLS).
-- profiles_read_all gør kolonnen offentligt læsbar - harmløst (sprog er ikke følsomt).
-- Idempotent.

alter table public.profiles
  add column if not exists sprog text;

alter table public.profiles
  drop constraint if exists profiles_sprog_check;

alter table public.profiles
  add constraint profiles_sprog_check check (sprog is null or sprog in ('da', 'sv', 'en'));

-- Verifikation (skal give én række: sprog | text | YES):
-- select column_name, data_type, is_nullable from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles' and column_name = 'sprog';
