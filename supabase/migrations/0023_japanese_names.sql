-- Japanese names: the species name (フシギダネ) and, for forms, Mega/Gigantamax, regional forms and costumes,
-- the full Japanese display name (ロコン（アローラのすがた）). Empty alt_name_ja means the species name is used,
-- or for a form without a Japanese name yet, the English name.
-- Filled once with scripts/japanese_names.sql (sources listed there).
alter table public.pokemon add column if not exists name_ja text;
alter table public.pokemon add column if not exists alt_name_ja text;
