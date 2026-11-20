-- Zeekr Garage — Kommentarer ("Byggemøde")
-- ---------------------------------------------------------------------------
-- Login-styret v1: alle laeser; authenticated skriver egne; forfatter retter/
-- sletter egne; moderator/admin retter/sletter alle og kan markere en kommentar
-- som "loesning" (fx naar en melding viser sig at vaere en betjeningsfejl / fejl 40).

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.issues(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null,
  is_solution boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists comments_issue_id_idx on public.comments (issue_id);

alter table public.comments enable row level security;

drop policy if exists comments_read_all on public.comments;
create policy comments_read_all on public.comments
  for select using (true);

drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth on public.comments
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists comments_update_mod on public.comments;
create policy comments_update_mod on public.comments
  for update to authenticated using (public.er_moderator()) with check (public.er_moderator());

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete to authenticated using (author_id = auth.uid());

drop policy if exists comments_delete_mod on public.comments;
create policy comments_delete_mod on public.comments
  for delete to authenticated using (public.er_moderator());

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();
