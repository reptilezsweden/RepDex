-- Crawler dates approved by an admin are logged with their own source.
alter table public.change_log drop constraint change_log_source_check;
alter table public.change_log add constraint change_log_source_check
  check (source = any (array['admin', 'crawler', 'crawler (approved)', 'import']));
