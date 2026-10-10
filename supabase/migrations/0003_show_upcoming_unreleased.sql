-- Separate switches for upcoming and unreleased entries on dex pages (replaces show_unavailable).
alter table public.profiles add column if not exists show_upcoming boolean not null default true;
alter table public.profiles add column if not exists show_unreleased boolean not null default true;
