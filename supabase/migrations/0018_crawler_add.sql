-- Called by the crawler (service role): add new costume/event Pokémon found on the wiki,
-- logged as "(added)" with source "crawler". Existing IDs are left alone.
create or replace function public.crawler_add(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  perform set_config('repdex.source', 'crawler', true);
  insert into public.pokemon (
    id, sort_order, dex_caught, dex_lucky, gen_nr, form_type, image_regular, image_shiny, species, name,
    type1, type2, family, stage, evolve_candy, evolves_from, evolution_requirement, regional, form, alt_name,
    classification, region_lock, release_event, how_to_get, released, release_shiny,
    release_shadow, release_shadow_shiny, release_dynamax, release_dynamax_shiny)
  select
    id, sort_order, coalesce(dex_caught, false), coalesce(dex_lucky, false), gen_nr, form_type, image_regular, image_shiny, species, name,
    type1, type2, family, stage, evolve_candy, evolves_from, evolution_requirement, regional, form, alt_name,
    classification, region_lock, release_event, how_to_get, released, release_shiny,
    release_shadow, release_shadow_shiny, release_dynamax, release_dynamax_shiny
  from jsonb_populate_recordset(null::public.pokemon, p_rows)
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.crawler_add(jsonb) from public, anon, authenticated;
