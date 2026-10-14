-- Wishlists the user shows on their public page /user/<nickname>. Off (empty) by default.
alter table public.profiles add column if not exists public_wishlists text[] not null default '{}';

-- Public page data, readable without signing in: only for users with at least one public list,
-- and only the ticks of the dexes those lists use.
create or replace function public.public_wishlist(p_nickname text)
returns table (nickname text, lists text[], dex text, pokemon_id text, collected boolean, wanted boolean)
language sql stable security definer set search_path = public as $$
  with p as (
    select id, profiles.nickname, public_wishlists from profiles
    where lower(profiles.nickname) = lower(p_nickname) and cardinality(public_wishlists) > 0
  ),
  d as (
    select unnest(case l
      when 'caught' then array['caught', 'lucky']
      when 'shiny' then array['shiny']
      when 'xxs' then array['xxs']
      when 'xxl' then array['xxl']
      when 'gigantamax' then array['gigantamax']
      when 'dynamax' then array['dynamax']
      when 'costumes' then array['costumes']
      when 'costumes_shiny' then array['costumes_shiny']
    end) as dex
    from p, unnest(p.public_wishlists) as l
  )
  select p.nickname, p.public_wishlists, t.dex, t.pokemon_id, t.collected, t.wanted
  from p left join ticks t on t.user_id = p.id and t.dex in (select dex from d)
  order by t.dex, t.pokemon_id
$$;

revoke all on function public.public_wishlist(text) from public;
grant execute on function public.public_wishlist(text) to anon, authenticated;
