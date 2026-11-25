-- Zeekr Garage - Forum: svar paa et svar (traadede svar, ET niveau som Facebook)
-- ---------------------------------------------------------------------------
-- I dag er svar flade: alle indlaeg ligger i een liste paa tid. Her tilfoejes
-- muligheden for at svare paa et bestemt svar, saa undersvar grupperes under
-- deres top-svar. ET niveau (som FB): svarer man paa et undersvar, haenger det
-- stadig under samme top-svar - med "@Navn" foran, saa man kan se hvem der blev
-- svaret. Uendelig nesting undgaas bevidst (laesbarhed paa mobil).
--
-- Model paa forum_posts:
--   parent_id        = ankeret (et TOP-niveau-svar i samme traad); null for
--                      aabningsindlaeg og top-niveau-svar. Styrer grupperingen.
--   reply_to_author  = den DIREKTE besvarede forfatter (til "@Navn"); saettes kun
--                      naar man svarer paa et undersvar. null ellers.
--
-- Undersvar er helt almindelige forum_posts-raekker, saa billeder, soegning,
-- reply_count-triggerne og P32-audit virker uaendret. parent_id/reply_to_author
-- er strukturelle (saettes ved oprettelse) og indgaar bevidst IKKE i P32-revert.
--
-- Idempotent.

alter table public.forum_posts
  add column if not exists parent_id uuid
    references public.forum_posts(id) on delete cascade,
  add column if not exists reply_to_author uuid
    references public.profiles(id) on delete set null;

create index if not exists forum_posts_parent_idx
  on public.forum_posts (parent_id, created_at);

-- Invariant-vaern: ET niveau. Et svar med parent_id skal pege paa et TOP-niveau-
-- svar i SAMME traad - ikke aabningsindlaegget, ikke et undersvar. Haandhaeves i
-- DB uanset klient (app'en fladebalancerer allerede til ankeret).
create or replace function public.forum_post_parent_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare p record;
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'Et svar kan ikke vaere sit eget ophav.';
  end if;
  select thread_id, is_opening, parent_id
    into p
    from public.forum_posts
    where id = new.parent_id;
  if not found then
    raise exception 'Svar-ophavet findes ikke.';
  end if;
  if p.thread_id <> new.thread_id then
    raise exception 'Svar-ophav skal vaere i samme traad.';
  end if;
  if p.is_opening then
    raise exception 'Et svar haenger paa et svar, ikke paa aabningsindlaegget (brug et top-svar).';
  end if;
  if p.parent_id is not null then
    raise exception 'Kun eet niveau af svar (ophavet er selv et undersvar).';
  end if;
  return new;
end;
$$;

drop trigger if exists forum_posts_parent_guard on public.forum_posts;
create trigger forum_posts_parent_guard
  before insert or update of parent_id on public.forum_posts
  for each row execute function public.forum_post_parent_guard();
