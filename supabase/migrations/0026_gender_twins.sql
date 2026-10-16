-- Gender tracking (docs/DESIGN.md "Gender").
-- Every row that comes in both genders (gender = 'Both') gets a female twin with the ID <id>_g2 and
-- form_type 'Gender'. The original row stands for the male (or any-gender) version and keeps its ID,
-- so existing ticks stay put. Twins only show in the dexes where a user has switched gender on.
--   row_gender   which gender the row is: Male (original), Female (twin); null for single-row Pokémon.
--   gender_diff  how the genders differ: no_change, image_change (a .g2 image exists) or
--                dex_form_change (Indeedee, Basculegion, Oinkologne: separate forms in the game).
--   gender_of    on twins: the original row. Shared fields are copied from it by a trigger.

alter table public.pokemon add column if not exists row_gender  text check (row_gender in ('Male', 'Female'));
alter table public.pokemon add column if not exists gender_diff text check (gender_diff in ('no_change', 'image_change', 'dex_form_change'));
alter table public.pokemon add column if not exists gender_of   text references public.pokemon (id) on update cascade on delete cascade;
create index if not exists pokemon_gender_of on public.pokemon (gender_of);

alter table public.profiles add column if not exists gender_dexes text[] not null default '{}';

-- Female images in the asset folder: pm<nr>[.<code>].g2.icon.png, and .g2.s.icon.png for the shiny
-- (every one has a shiny except the clone Venusaur).
create temporary table g2 (prefix text primary key) on commit drop;
insert into g2 select unnest(string_to_array(
  'pm111,pm112,pm118,pm119,pm12,pm12.cFASHION_2021_NOEVOLVE,pm123,pm129,pm130,pm133,pm133.cHOLIDAY_2022,pm133.cJAN_2020_NOEVOLVE,pm133.cMAY_2023,pm133.cNOVEMBER_2018,pm133.cSPRING_2023,pm133.fGOFEST_2024_MTIARA,pm133.fGOFEST_2024_STIARA,pm154,pm165,pm166,pm178,pm185,pm185.fWINTER_2025,pm186,pm19,pm190,pm194,pm194.cFALL_2023,pm195,pm195.cFALL_2023,pm198,pm20,pm20.cJAN_2020_NOEVOLVE,pm202,pm202.cJAN_2020_NOEVOLVE,pm203,pm207,pm208,pm212,pm214,pm215,pm215.cFASHION_2021_NOEVOLVE,pm215.fHISUIAN,pm217,pm217.cHALLOWEEN_2025,pm221,pm224,pm229,pm232,pm25,pm25.cANNIVERSARY,pm25.cANNIVERSARY_2022_NOEVOLVE,pm25.cAPRIL_2020_NOEVOLVE,pm25.cCOSTUME_1,pm25.cCOSTUME_2,pm25.cFALL_2018,pm25.cFALL_2023_NOEVOLVE,pm25.cFEB_2019,pm25.cGOFEST_2021_NOEVOLVE,pm25.cGOFEST_2022_NOEVOLVE,pm25.cGOTOUR_2023_BANDANA,pm25.cGOTOUR_2023_BANDANA_NOEVOLVE,pm25.cGOTOUR_2023_HAT,pm25.cGOTOUR_2023_HAT_NOEVOLVE,pm25.cHALLOWEEN_2017,pm25.cHALLOWEEN_2021_NOEVOLVE,pm25.cHOENN_2020_NOEVOLVE,pm25.cHOLIDAY_2016,pm25.cHOLIDAY_2023,pm25.cINDONESIA_2025_NOEVOLVE,pm25.cJAN_2020_NOEVOLVE,pm25.cJAN_2023_NOEVOLVE,pm25.cJOHTO_2020_NOEVOLVE,pm25.cKANTO_2020_NOEVOLVE,pm25.cMAY_2019_NOEVOLVE,pm25.cNOVEMBER_2018,pm25.cONE_YEAR_ANNIVERSARY,pm25.cPI,pm25.cSAFARI_2020_NOEVOLVE,pm25.cSINNOH_2020_NOEVOLVE,pm25.cSPRING_2023,pm25.cSUMMER_2018,pm25.cTCG_2022_NOEVOLVE,pm25.cWINTER_2018,pm25.fADVENTURE_HAT_2020,pm25.fANNIVERSARY_2026,pm25.fANNIVERSARY_2026_MALAYSIA_01,pm25.fANNIVERSARY_2026_PHILIPPINE_01,pm25.fANNIVERSARY_2026_SINGAPORE_01,pm25.fANNIVERSARY_2026_TAIWAN_01,pm25.fBB_2026,pm25.fCOPY_2019,pm25.fCOSTUME_2020,pm25.fFALL_2019,pm25.fFLYING_01,pm25.fFLYING_02,pm25.fFLYING_03,pm25.fFLYING_04,pm25.fFLYING_5TH_ANNIV,pm25.fFLYING_OKINAWA,pm25.fFOSSIL_2026,pm25.fGOFEST_2022,pm25.fGOFEST_2024_MTIARA,pm25.fGOFEST_2024_STIARA,pm25.fGOFEST_2025_GOGGLES_BLUE,pm25.fGOFEST_2025_GOGGLES_RED,pm25.fGOFEST_2025_GOGGLES_YELLOW,pm25.fGOFEST_2025_MONOCLE_BLUE,pm25.fGOFEST_2025_MONOCLE_RED,pm25.fGOFEST_2025_MONOCLE_YELLOW,pm25.fGOFEST_2026_CAP_BLUE,pm25.fGOFEST_2026_CAP_RED,pm25.fGOFEST_2026_CAP_YELLOW,pm25.fGOTOUR_2024_A,pm25.fGOTOUR_2024_A_02,pm25.fGOTOUR_2024_B,pm25.fGOTOUR_2024_B_02,pm25.fGOTOUR_2025_A,pm25.fGOTOUR_2025_A_02,pm25.fGOTOUR_2025_B,pm25.fGOTOUR_2025_B_02,pm25.fGOTOUR_2026_A,pm25.fGOTOUR_2026_A_02,pm25.fGOTOUR_2026_B,pm25.fGOTOUR_2026_B_02,pm25.fGOTOUR_2026_C,pm25.fGOTOUR_2026_C_02,pm25.fHALLOWEEN_2026,pm25.fHORIZONS,pm25.fJEJU,pm25.fKARIYUSHI,pm25.fSUMMER_2023_A,pm25.fSUMMER_2023_B,pm25.fSUMMER_2023_C,pm25.fSUMMER_2023_D,pm25.fSUMMER_2023_E,pm25.fTSHIRT_01,pm25.fTSHIRT_02,pm25.fTSHIRT_03,pm25.fVISOR_2026,pm25.fWCS_2022,pm25.fWCS_2023,pm25.fWCS_2024,pm25.fWCS_2025,pm25.fWINTER_2020,pm255,pm256,pm257,pm26,pm26.cANNIVERSARY,pm26.cCOSTUME_1,pm26.cCOSTUME_2,pm26.cFALL_2018,pm26.cFEB_2019,pm26.cHALLOWEEN_2017,pm26.cHOLIDAY_2016,pm26.cHOLIDAY_2023,pm26.cNOVEMBER_2018,pm26.cONE_YEAR_ANNIVERSARY,pm26.cPI,pm26.cSPRING_2023,pm26.cSUMMER_2018,pm26.cWINTER_2018,pm267,pm269,pm272,pm274,pm275,pm3,pm3.cJAN_2020_NOEVOLVE,pm3.cSPRING_2020_NOEVOLVE,pm3.fCOPY_2019,pm307,pm308,pm315,pm316,pm317,pm322,pm323,pm332,pm350,pm369,pm396,pm397,pm398,pm399,pm400,pm401,pm402,pm403,pm403.cFALL_2020_NOEVOLVE,pm404,pm405,pm407,pm41,pm415,pm417,pm418,pm419,pm42,pm424,pm44,pm443,pm444,pm445,pm449,pm45,pm450,pm453,pm453.cFALL_2020_NOEVOLVE,pm454,pm454.cFALL_2020_NOEVOLVE,pm456,pm457,pm459,pm460,pm461,pm464,pm465,pm473,pm521,pm64,pm65,pm84,pm85,pm97', ','));

-- Logged as one import, not as admin edits.
select set_config('repdex.source', 'import', true);

-- Twins.
insert into public.pokemon (
  id, sort_order, dex_caught, dex_lucky, gen_nr, form_type, image_regular, image_shiny, species, name,
  type1, type2, family, stage, evolve_candy, evolves_from, evolution_requirement, regional, form, alt_name,
  classification, region_lock, release_event, how_to_get, released, release_shiny, release_shadow,
  release_shadow_shiny, release_dynamax, release_dynamax_shiny, name_ja, alt_name_ja, gender,
  row_gender, gender_diff, gender_of)
select
  p.id || '_g2', p.sort_order, p.dex_caught, p.dex_lucky, p.gen_nr, 'Gender',
  case when replace(p.image_regular, '.icon.png', '') in (select prefix from g2)
       then replace(p.image_regular, '.icon.png', '.g2.icon.png') else p.image_regular end,
  case when replace(p.image_shiny, '.s.icon.png', '') in (select prefix from g2 where prefix <> 'pm3.fCOPY_2019')
       then replace(p.image_shiny, '.s.icon.png', '.g2.s.icon.png') else p.image_shiny end,
  p.species, p.name,
  p.type1, p.type2, p.family, p.stage, p.evolve_candy,
  -- From the female version of the previous Pokémon when it has one, else from it as it is.
  case when exists (select 1 from public.pokemon e where e.id = p.evolves_from and e.gender = 'Both' and e.form_type <> 'Gender')
       then p.evolves_from || '_g2' else p.evolves_from end,
  p.evolution_requirement, p.regional, p.form, p.alt_name,
  p.classification, p.region_lock, p.release_event, p.how_to_get, p.released, p.release_shiny, p.release_shadow,
  p.release_shadow_shiny, p.release_dynamax, p.release_dynamax_shiny, p.name_ja, p.alt_name_ja, p.gender,
  'Female', null, p.id
from public.pokemon p
where p.gender = 'Both' and p.form_type <> 'Gender' and p.gender_of is null
  and not exists (select 1 from public.pokemon x where x.id = p.id || '_g2');

update public.pokemon p set row_gender = 'Male' where p.gender = 'Both' and p.gender_of is null and p.form_type <> 'Gender';

-- How they differ.
update public.pokemon t set gender_diff = case when t.image_regular is distinct from b.image_regular then 'image_change' else 'no_change' end
from public.pokemon b where t.gender_of = b.id;
update public.pokemon b set gender_diff = t.gender_diff from public.pokemon t where t.gender_of = b.id;
update public.pokemon set gender_diff = 'dex_form_change' where species in (876, 902, 916);

-- Female-only evolutions come from the female of a two-gender Pokémon (Froslass from female Snorunt).
update public.pokemon p set evolves_from = p.evolves_from || '_g2'
where p.gender = 'Female' and p.gender_of is null
  and exists (select 1 from public.pokemon e where e.id = p.evolves_from || '_g2');

-- Keep twins in step with their original: every shared field is copied on change.
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
    release_dynamax_shiny = new.release_dynamax_shiny, name_ja = new.name_ja, alt_name_ja = new.alt_name_ja,
    gender = new.gender
  where t.gender_of = new.id
    and (t.released, t.release_shiny, t.release_shadow, t.release_shadow_shiny, t.release_dynamax, t.release_dynamax_shiny,
         t.name, t.alt_name, t.dex_caught, t.dex_lucky, t.sort_order, t.family, t.stage, t.evolve_candy,
         t.evolution_requirement, t.type1, t.type2, t.gen_nr, t.name_ja, t.alt_name_ja, t.form, t.gender)
        is distinct from
        (new.released, new.release_shiny, new.release_shadow, new.release_shadow_shiny, new.release_dynamax, new.release_dynamax_shiny,
         new.name, new.alt_name, new.dex_caught, new.dex_lucky, new.sort_order, new.family, new.stage, new.evolve_candy,
         new.evolution_requirement, new.type1, new.type2, new.gen_nr, new.name_ja, new.alt_name_ja, new.form, new.gender);
  return null;
end;
$$;
drop trigger if exists pokemon_sync_twin on public.pokemon;
create trigger pokemon_sync_twin after update on public.pokemon
  for each row when (new.gender_of is null) execute function public.pokemon_sync_twin();

-- New two-gender rows (admin, crawler) get their twin straight away.
create or replace function public.pokemon_add_twin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.gender = 'Both' and new.form_type <> 'Gender' and new.gender_of is null then
    insert into public.pokemon (
      id, sort_order, dex_caught, dex_lucky, gen_nr, form_type, image_regular, image_shiny, species, name,
      type1, type2, family, stage, evolve_candy, evolves_from, evolution_requirement, regional, form, alt_name,
      classification, region_lock, release_event, how_to_get, released, release_shiny, release_shadow,
      release_shadow_shiny, release_dynamax, release_dynamax_shiny, name_ja, alt_name_ja, gender,
      row_gender, gender_diff, gender_of)
    values (
      new.id || '_g2', new.sort_order, new.dex_caught, new.dex_lucky, new.gen_nr, 'Gender', new.image_regular, new.image_shiny,
      new.species, new.name, new.type1, new.type2, new.family, new.stage, new.evolve_candy,
      case when exists (select 1 from public.pokemon e where e.id = new.evolves_from || '_g2') then new.evolves_from || '_g2' else new.evolves_from end,
      new.evolution_requirement, new.regional, new.form, new.alt_name, new.classification, new.region_lock, new.release_event,
      new.how_to_get, new.released, new.release_shiny, new.release_shadow, new.release_shadow_shiny, new.release_dynamax,
      new.release_dynamax_shiny, new.name_ja, new.alt_name_ja, new.gender, 'Female', 'no_change', new.id)
    on conflict (id) do nothing;
    update public.pokemon set row_gender = 'Male', gender_diff = coalesce(gender_diff, 'no_change') where id = new.id;
  end if;
  return null;
end;
$$;
drop trigger if exists pokemon_add_twin on public.pokemon;
create trigger pokemon_add_twin after insert on public.pokemon
  for each row when (new.gender_of is null) execute function public.pokemon_add_twin();

-- Public wishlists follow the owner's gender choice.
create or replace function public.public_wish_gender(p_nickname text) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(gender_dexes, '{}') from public.profiles
  where lower(nickname) = lower(p_nickname) and coalesce(array_length(public_wishlists, 1), 0) > 0
  limit 1
$$;
grant execute on function public.public_wish_gender(text) to anon, authenticated;
