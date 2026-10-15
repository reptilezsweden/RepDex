-- The Shiny wishlist also covers Shiny ⭐⭐⭐ when the owner has that dex switched on.
create or replace function public.public_wish_shiny3(p_nickname text)
returns boolean
language sql stable security definer set search_path = public as $$
  select 'shiny3' = any(coalesce(visible_dexes, '{}'::text[])) from profiles
  where lower(nickname) = lower(p_nickname) and cardinality(public_wishlists) > 0
$$;
revoke all on function public.public_wish_shiny3(text) from public;
grant execute on function public.public_wish_shiny3(text) to anon, authenticated;

create or replace function public.public_wishlist(p_nickname text)
returns table (nickname text, lists text[], dex text, pokemon_id text, collected boolean, wanted boolean)
language sql stable security definer set search_path = public as $$
  with p as (
    select id, profiles.nickname, public_wishlists,
           'shiny3' = any(coalesce(visible_dexes, '{}'::text[])) as shiny3
    from profiles
    where lower(profiles.nickname) = lower(p_nickname) and cardinality(public_wishlists) > 0
  ),
  d as (
    select unnest(case l
      when 'caught' then array['caught', 'lucky']
      when 'shiny' then case when p.shiny3 then array['shiny', 'shiny3'] else array['shiny'] end
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
