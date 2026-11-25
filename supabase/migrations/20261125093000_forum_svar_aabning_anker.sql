-- Zeekr Garage - Forum: tillad aabningsindlaegget som svar-anker
-- ---------------------------------------------------------------------------
-- Justering af P33 (20261125090000): et svar paa SELVE aabningsindlaegget skal
-- haenge indrykket lige UNDER det (som ethvert andet svar paa et indlaeg), i
-- stedet for at blive et fladt top-svar i bunden. Vi tillader derfor at
-- parent_id peger paa aabningsindlaegget. Stadig KUN eet niveau: ankeret skal
-- selv vaere et top-niveau-indlaeg (parent_id null) - dvs. enten aabningen eller
-- et top-svar, aldrig et undersvar.
--
-- Erstatter kun guard-funktionen (create or replace). Idempotent.

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
  select thread_id, parent_id
    into p
    from public.forum_posts
    where id = new.parent_id;
  if not found then
    raise exception 'Svar-ophavet findes ikke.';
  end if;
  if p.thread_id <> new.thread_id then
    raise exception 'Svar-ophav skal vaere i samme traad.';
  end if;
  if p.parent_id is not null then
    raise exception 'Kun eet niveau af svar (ophavet er selv et undersvar).';
  end if;
  return new;
end;
$$;
