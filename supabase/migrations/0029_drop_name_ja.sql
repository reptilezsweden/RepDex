-- The Japanese names now live in species_names / pokemon_names (migration 0028) and the app reads
-- them from there, so the old pokemon.name_ja / alt_name_ja columns go. The twin triggers stop
-- copying them first.

create or replace function public.pokemon_sync_twin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  update public.pokemon t set
    sort_order = new.sort_order, dex_caught = new.dex_caught, dex_lucky = new.dex_lucky, gen_nr = new.gen_nr,
    species = new.species, name = new.name, type1 = new.type1, type2 = new.type2, family = new.family,
    stage = new.stage, evolve_candy = new.evolve_candy, evolution_requirement = new.evolution_requirement,
    regional = new.regional, form = new.form, alt_name = new.alt_name, classification = new.classification,
    region_lock = new.region_lock, release_event = new.release_event, how_to_get = new.how_to_get,
    released = new.released, release_shiny = new.release_shiny, release_shadow = new.release_shadow,
    release_shadow_shiny = new.release_shadow_shiny, release_dynamax = new.release_dynamax,
    release_dynamax_shiny = new.release_dynamax_shiny,
    gender = new.gender
  where t.gender_of = new.id
    and (t.released, t.release_shiny, t.release_shadow, t.release_shadow_shiny, t.release_dynamax, t.release_dynamax_shiny,
         t.name, t.alt_name, t.dex_caught, t.dex_lucky, t.sort_order, t.family, t.stage, t.evolve_candy,
         t.evolution_requirement, t.type1, t.type2, t.gen_nr, t.form, t.gender)
        is distinct from
        (new.released, new.release_shiny, new.release_shadow, new.release_shadow_shiny, new.release_dynamax, new.release_dynamax_shiny,
         new.name, new.alt_name, new.dex_caught, new.dex_lucky, new.sort_order, new.family, new.stage, new.evolve_candy,
         new.evolution_requirement, new.type1, new.type2, new.gen_nr, new.form, new.gender);
  return null;
end;
$$;


create or replace function public.pokemon_add_twin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.gender = 'Both' and new.form_type <> 'Gender' and new.gender_of is null then
    insert into public.pokemon (
      id, sort_order, dex_caught, dex_lucky, gen_nr, form_type, image_regular, image_shiny, species, name,
      type1, type2, family, stage, evolve_candy, evolves_from, evolution_requirement, regional, form, alt_name,
      classification, region_lock, release_event, how_to_get, released, release_shiny, release_shadow,
      release_shadow_shiny, release_dynamax, release_dynamax_shiny, gender,
      row_gender, gender_diff, gender_of)
    values (
      new.id || '_g2', new.sort_order, new.dex_caught, new.dex_lucky, new.gen_nr, 'Gender', new.image_regular, new.image_shiny,
      new.species, new.name, new.type1, new.type2, new.family, new.stage, new.evolve_candy,
      case when exists (select 1 from public.pokemon e where e.id = new.evolves_from || '_g2') then new.evolves_from || '_g2' else new.evolves_from end,
      new.evolution_requirement, new.regional, new.form, new.alt_name, new.classification, new.region_lock, new.release_event,
      new.how_to_get, new.released, new.release_shiny, new.release_shadow, new.release_shadow_shiny, new.release_dynamax,
      new.release_dynamax_shiny, new.gender, 'Female', 'no_change', new.id)
    on conflict (id) do nothing;
    update public.pokemon set row_gender = 'Male', gender_diff = coalesce(gender_diff, 'no_change') where id = new.id;
  end if;
  return null;
end;
$$;


-- import.costumes is a leftover view from the first data import that still reads name_ja; it holds
-- no data of its own (the import schema is on the cleanup list).
drop view if exists import.costumes;

alter table public.pokemon drop column if exists name_ja;
alter table public.pokemon drop column if exists alt_name_ja;
