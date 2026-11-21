-- Zeekr Garage - Sync-import RPC (kaldes af /api/sync/import fra n8n)
-- ---------------------------------------------------------------------------
-- Tager bugherrer-eksportens JSON og upserter idempotent (på legacy_bugherrer_id).
-- security definer + kun service_role må kalde den → kan ikke misbruges via anon.

create or replace function public.sync_import_bugherrer(p_data jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb;
  k jsonb;
  v_issue uuid;
  v_model uuid;
  n int := 0;
begin
  for m in select * from jsonb_array_elements(p_data) loop
    insert into public.issues (
      legacy_bugherrer_id, type, title, description, status,
      software_version, phone_model, phone_os, created_at,
      legacy_stemmer, legacy_biler, sidst_sendt_stemmer, sidst_sendt_dato
    )
    values (
      (m->>'legacy_bugherrer_id')::int,
      (m->>'type')::public.issue_type,
      m->>'title', m->>'description',
      (m->>'status')::public.issue_status,
      m->>'software_version', m->>'phone_model', m->>'phone_os',
      (m->>'created_at')::timestamptz,
      coalesce((m->>'legacy_stemmer')::int, 0),
      coalesce(m->'legacy_biler', '[]'::jsonb),
      nullif(m->>'sidst_sendt_stemmer', '')::int,
      nullif(m->>'sidst_sendt_dato', '')::timestamptz
    )
    on conflict (legacy_bugherrer_id) where legacy_bugherrer_id is not null do update set
      type = excluded.type, title = excluded.title, description = excluded.description,
      status = excluded.status, software_version = excluded.software_version,
      phone_model = excluded.phone_model, phone_os = excluded.phone_os,
      legacy_stemmer = excluded.legacy_stemmer, legacy_biler = excluded.legacy_biler,
      sidst_sendt_stemmer = excluded.sidst_sendt_stemmer, sidst_sendt_dato = excluded.sidst_sendt_dato
    returning id into v_issue;

    -- model-kobling
    select id into v_model from public.models where slug = m->>'model_slug';
    if v_model is not null then
      insert into public.issue_models (issue_id, model_id)
      values (v_issue, v_model) on conflict do nothing;
    end if;

    -- kommentarer: ryd tidligere importerede (author_id null) og genindsæt
    delete from public.comments where author_id is null and issue_id = v_issue;
    for k in select * from jsonb_array_elements(coalesce(m->'comments', '[]'::jsonb)) loop
      insert into public.comments (issue_id, author_navn, body, is_solution, created_at)
      values (
        v_issue, k->>'navn', k->>'tekst',
        coalesce((k->>'is_solution')::boolean, false),
        coalesce((k->>'created_at')::timestamptz, now())
      );
    end loop;

    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Kun service_role må kalde den (ikke anon/authenticated via PostgREST).
revoke all on function public.sync_import_bugherrer(jsonb) from public;
grant execute on function public.sync_import_bugherrer(jsonb) to service_role;
