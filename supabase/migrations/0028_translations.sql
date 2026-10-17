-- Translations of Pokémon text, one row per language. English stays in public.pokemon (the master
-- text the crawlers and the admin use); a missing translation falls back to English. Female twins
-- use their original row's text, so they have no rows of their own.
--
--   species_names     species name per species        (25, ja, ピカチュウ)
--   pokemon_names     form and alt name per row       (0037_fALOLA, ja, アローラのすがた, アローラロコン)
--   text_translations repeated phrases, by English    (evolution_requirement, Trade, ja, 通信交換)
--
-- Japanese is copied over from pokemon.name_ja / alt_name_ja; the form is the text in the closing
-- brackets of the Japanese alt name ("ライチュウ（探偵）" → "探偵"). The old columns stay until the
-- app reads from here (dropped in a later migration).
-- Also: indexes on the foreign keys that had none.

create table if not exists public.species_names (
  species integer not null,
  lang    text not null check (lang ~ '^[a-z]{2}$'),
  name    text not null,
  primary key (species, lang)
);

create table if not exists public.pokemon_names (
  pokemon_id text not null references public.pokemon (id) on update cascade on delete cascade,
  lang       text not null check (lang ~ '^[a-z]{2}$'),
  form       text,
  alt_name   text,
  primary key (pokemon_id, lang)
);

create table if not exists public.text_translations (
  kind   text not null,          -- what the phrase is, e.g. 'evolution_requirement'
  source text not null,          -- the English text it translates
  lang   text not null check (lang ~ '^[a-z]{2}$'),
  text   text not null,
  primary key (kind, source, lang)
);

-- Public data, like public.pokemon: anyone reads, admins write.
alter table public.species_names enable row level security;
alter table public.pokemon_names enable row level security;
alter table public.text_translations enable row level security;
do $$
declare t text;
begin
  foreach t in array array['species_names', 'pokemon_names', 'text_translations'] loop
    execute format('drop policy if exists "%1$s readable" on public.%1$s', t);
    execute format('create policy "%1$s readable" on public.%1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s admin insert" on public.%1$s', t);
    execute format('create policy "%1$s admin insert" on public.%1$s for insert with check ((select public.is_admin()))', t);
    execute format('drop policy if exists "%1$s admin update" on public.%1$s', t);
    execute format('create policy "%1$s admin update" on public.%1$s for update using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('drop policy if exists "%1$s admin delete" on public.%1$s', t);
    execute format('create policy "%1$s admin delete" on public.%1$s for delete using ((select public.is_admin()))', t);
  end loop;
end $$;

-- Japanese species names: one per species (every form carries the same one today).
insert into public.species_names (species, lang, name)
select distinct on (species) species, 'ja', name_ja
from public.pokemon
where gender_of is null and name_ja is not null and name_ja <> ''
order by species, (form_type = 'Regular') desc, sort_order
on conflict (species, lang) do update set name = excluded.name;

-- Japanese form and alt names per row.
insert into public.pokemon_names (pokemon_id, lang, form, alt_name)
select id, 'ja',
  substring(alt_name_ja from '[（(]([^（）()]+)[)）]\s*$'),
  alt_name_ja
from public.pokemon
where gender_of is null and alt_name_ja is not null and alt_name_ja <> ''
on conflict (pokemon_id, lang) do update set form = excluded.form, alt_name = excluded.alt_name;

-- Foreign keys without an index (Supabase performance advisor).
create index if not exists change_log_changed_by on public.change_log (changed_by);
create index if not exists crawler_aliases_pokemon_id on public.crawler_aliases (pokemon_id);
create index if not exists crawler_queue_pokemon_id on public.crawler_queue (pokemon_id);
create index if not exists pokemon_evolves_from on public.pokemon (evolves_from);
create index if not exists pokemon_gen_nr on public.pokemon (gen_nr);
create index if not exists ticks_pokemon_id on public.ticks (pokemon_id);
