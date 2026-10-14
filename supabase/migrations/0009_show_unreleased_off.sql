-- "Show unreleased" is off by default for new accounts. Existing accounts keep their choice;
-- to switch it off for everyone now as well, also run the update below.
alter table public.profiles alter column show_unreleased set default false;
-- update public.profiles set show_unreleased = false;
