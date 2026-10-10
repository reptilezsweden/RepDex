-- One setting for all dex pages: show or hide upcoming and unreleased entries.
alter table public.profiles add column if not exists show_unavailable boolean not null default true;
