-- Events page: dexes the user left out of the Missing filter (kept apart from the Full collection choice).
alter table public.profiles add column if not exists events_hidden text[] not null default '{}';
