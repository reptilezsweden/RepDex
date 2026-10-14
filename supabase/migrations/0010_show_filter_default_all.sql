-- New accounts start on All; the choice is remembered after that.
alter table public.profiles alter column show_filter set default 'all';
update public.profiles set show_filter = 'all' where show_filter = 'missing';
