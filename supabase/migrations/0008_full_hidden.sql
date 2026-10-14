-- Full collection: dex columns the user has hidden (new dexes show up by default).
alter table public.profiles add column if not exists full_hidden text[] not null default '{}';
