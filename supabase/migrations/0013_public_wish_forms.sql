-- The public page lists each missing form for dexes where the owner has All forms on.
-- Only for users with at least one public list.
create or replace function public.public_wish_all_forms(p_nickname text)
returns text[]
language sql stable security definer set search_path = public as $$
  select case when all_forms_dexes is not null and cardinality(all_forms_dexes) > 0 then all_forms_dexes
              when all_forms then array['caught', 'lucky', 'xxl', 'xxs', 'shadow', 'purified', 'perfect']
              else '{}'::text[] end
  from profiles
  where lower(nickname) = lower(p_nickname) and cardinality(public_wishlists) > 0
$$;

revoke all on function public.public_wish_all_forms(text) from public;
grant execute on function public.public_wish_all_forms(text) to anon, authenticated;
