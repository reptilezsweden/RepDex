-- Wishlists: "Show only lowest evolution", one setting for all lists (the public page follows it).
alter table public.profiles add column if not exists wish_lowest boolean not null default false;

-- The public page reads the setting here; only for users with at least one public list.
create or replace function public.public_wish_lowest(p_nickname text)
returns boolean
language sql stable security definer set search_path = public as $$
  select wish_lowest from profiles
  where lower(nickname) = lower(p_nickname) and cardinality(public_wishlists) > 0
$$;

revoke all on function public.public_wish_lowest(text) from public;
grant execute on function public.public_wish_lowest(text) to anon, authenticated;
