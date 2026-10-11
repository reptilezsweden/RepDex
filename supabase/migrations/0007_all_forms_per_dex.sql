-- All forms is now chosen per dex (Caught, Lucky, XXL/XXS, Shadow/Purified, 100%) instead of
-- one switch for every dex. Users who had it on keep it on for all of them.
alter table public.profiles add column if not exists all_forms_dexes text[] not null default '{}';

update public.profiles
   set all_forms_dexes = array['caught', 'lucky', 'xxl', 'xxs', 'shadow', 'purified', 'perfect']
 where all_forms and all_forms_dexes = '{}';
