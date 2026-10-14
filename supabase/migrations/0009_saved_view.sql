-- Saved view choices, shared by every dex page and Full collection.
alter table public.profiles add column if not exists show_filter text not null default 'missing'
  check (show_filter in ('all', 'missing', 'collected'));
alter table public.profiles add column if not exists search_family boolean not null default false;
