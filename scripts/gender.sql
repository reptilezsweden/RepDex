-- Fills pokemon.gender (migration 0025) from PokeAPI's pokemon_species.csv (column gender_rate).
-- Uses the import schema and import.csv_fields from scripts/japanese_names.sql.
-- 1. Fetch; note the request id it returns.
select net.http_get('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv', timeout_milliseconds := 60000);
-- 2. Load (replace :species with that id) and fill.
create table if not exists import.species as
  select (f[1])::int species, f[2] identifier, (f[9])::int gender_rate
  from (select import.csv_fields(l) f from net._http_response r, regexp_split_to_table(r.content, E'\n') with ordinality s(l, n)
        where r.id = :species and n > 1 and l <> '') x;
update pokemon p set gender = case s.gender_rate when -1 then 'None' when 0 then 'Male' when 8 then 'Female' else 'Both' end
from import.species s where s.species = p.species;
-- Forms that are one gender of a species with both.
update pokemon set gender = 'Female' where form_type = 'Gender' and id ~ 'FEMALE';
update pokemon set gender = 'Male' where alt_name ~ '\(Male\)';
