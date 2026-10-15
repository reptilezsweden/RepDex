-- Event Pokémon the page explicitly calls Shadow (in its name or section): only these count for the Shadow/Purified dexes.
alter table public.event_pokemon add column if not exists shadow boolean not null default false;
