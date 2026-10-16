-- Which genders a Pokémon (row) comes in: Both, Male, Female or None (genderless).
-- Filled from PokeAPI's species gender_rate (-1 genderless, 0 male only, 8 female only, else both);
-- rows that are one gender's form (Indeedee ♀, Oinkologne ♂ …) get that gender. See scripts/gender.sql.
alter table public.pokemon add column if not exists gender text check (gender in ('Both', 'Male', 'Female', 'None'));
