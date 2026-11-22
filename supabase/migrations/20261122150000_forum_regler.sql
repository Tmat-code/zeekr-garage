-- Zeekr Garage - Redigerbare forum-regler
-- ---------------------------------------------------------------------------
-- Faelles community-regler for forummet, redigerbare fra Vaerkstedet
-- (/admin/forum). Singleton: altid id = 1. Alle laeser (reglerne er
-- offentlige); kun moderator/admin skriver. Samme moenster som
-- site_announcement, men gated paa er_moderator() (passer til resten af
-- /admin/forum, hvor kategori-styring + moderering ogsaa er moderator).

create table if not exists public.forum_rules (
  id          int primary key default 1 check (id = 1),
  content     text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

-- Seed: default-regler saa siden har indhold fra foerste stund.
-- Simpelt format: "## " = underoverskrift, "- " = punkt, tom linje = nyt afsnit.
insert into public.forum_rules (id, content)
  values (1, $rules$Velkommen i Garagen. Her er et par enkle spilleregler, så forummet bliver et rart sted for alle Zeekr-ejere. (Moderatorerne kan altid rette teksten her.)

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

Tak fordi du er med til at holde en god stemning. God snak!$rules$)
  on conflict (id) do nothing;

alter table public.forum_rules enable row level security;

drop policy if exists forum_rules_read_all on public.forum_rules;
create policy forum_rules_read_all on public.forum_rules
  for select using (true);

drop policy if exists forum_rules_update_mod on public.forum_rules;
create policy forum_rules_update_mod on public.forum_rules
  for update to authenticated
  using (public.er_moderator())
  with check (public.er_moderator());
