-- Zeekr Garage - Supabase security-lint-fixes
-- ---------------------------------------------------------------------------
-- 1) touch_updated_at: fast (tom) search_path. Lint: function_search_path_mutable.
--    Body bruger kun now() (pg_catalog, altid i scope), så tom search_path er sikker.
-- 2) issue_models INSERT: erstat "with check (true)" med ejerskabs-tjek.
--    Lint: rls_policy_always_true. En logget-ind bruger må kun koble modeller
--    til en melding han selv ejer (eller moderator). Ikke-brydende: meld-flowet
--    indsætter issue (created_by = uid) FØR model-koblingerne; sync-import kører
--    som service-rolle og er ikke underlagt RLS.

alter function public.touch_updated_at() set search_path = '';

drop policy if exists issue_models_insert_auth on public.issue_models;
create policy issue_models_insert_auth on public.issue_models
  for insert to authenticated
  with check (
    exists (
      select 1 from public.issues i
      where i.id = issue_id and i.created_by = auth.uid()
    )
    or public.er_moderator()
  );
