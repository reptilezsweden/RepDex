-- RepDex schema: availability list, user profiles, ticks, change log.
-- Run once in the Supabase SQL editor (or with `supabase db push`).

-- ───────────────────────── Availability list ─────────────────────────

create table public.gens (
  gen_nr      numeric primary key,
  region      text not null,
  prefix_name text not null
);

create table public.pokemon (
  id                    text primary key,            -- e.g. 0001_REGULAR; unique by design
  sort_order            integer not null,            -- row order from the master sheet
  dex_caught            boolean not null default false,
  dex_lucky             boolean not null default false,
  gen_nr                numeric not null references public.gens (gen_nr),
  form_type             text not null check (form_type in
                          ('Regular','Costume','Form','Mega','Regional','Gigantamax','Battle-Only Form','Gender')),
  image_regular         text,
  image_shiny           text,
  species               integer not null,
  name                  text not null,
  type1                 text,
  type2                 text,
  family                integer,
  stage                 smallint,
  evolve_candy          integer,
  evolves_from          text references public.pokemon (id) deferrable initially deferred,
  evolution_requirement text,
  regional              text,
  form                  text,
  alt_name              text,
  classification        text,
  region_lock           text,
  release_event         text,
  how_to_get            text,
  released              date,
  release_shiny         date,
  release_shadow        date,
  release_shadow_shiny  date,
  release_dynamax       date,
  release_dynamax_shiny date,
  updated_at            timestamptz not null default now()
);

create index pokemon_species_idx on public.pokemon (species);
create index pokemon_sort_idx on public.pokemon (sort_order);

-- ───────────────────────── Users ─────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  role          text not null default 'user' check (role in ('user','admin')),
  language      text not null default 'en' check (language in ('en','sv')),
  all_forms     boolean not null default false,
  visible_dexes text[],                               -- null = use each dex's default
  created_at    timestamptz not null default now()
);

-- Ticks: one row per user, entry and dex.
create table public.ticks (
  user_id      uuid not null references auth.users (id) on delete cascade,
  pokemon_id   text not null references public.pokemon (id) on update cascade on delete cascade,
  dex          text not null,
  collected    boolean not null default true,
  wanted       boolean not null default false,
  collected_at timestamptz not null default now(),
  primary key (user_id, pokemon_id, dex),
  check (collected or not wanted)                     -- wanted only on collected entries
);

-- ───────────────────────── Admin change log ─────────────────────────

create table public.change_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      text not null,
  field       text not null,
  old_value   text,
  new_value   text,
  source      text not null default 'admin' check (source in ('admin','crawler','import')),
  changed_by  uuid references auth.users (id),
  changed_at  timestamptz not null default now()
);

-- ───────────────────────── Helpers ─────────────────────────

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New sign-ups get a profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own settings but never their own role.
create or replace function public.protect_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

-- Every change to the availability list is logged field by field.
create or replace function public.log_pokemon_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  k text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
begin
  for k in select jsonb_object_keys(n) loop
    if k <> 'updated_at' and (o -> k) is distinct from (n -> k) then
      insert into public.change_log (table_name, row_id, field, old_value, new_value, source, changed_by)
      values ('pokemon', new.id, k, o ->> k, n ->> k,
              coalesce(current_setting('repdex.source', true), 'admin'), auth.uid());
    end if;
  end loop;
  new.updated_at := now();
  return new;
end;
$$;

create trigger pokemon_log_change
  before update on public.pokemon
  for each row execute function public.log_pokemon_change();

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.gens       enable row level security;
alter table public.pokemon    enable row level security;
alter table public.profiles   enable row level security;
alter table public.ticks      enable row level security;
alter table public.change_log enable row level security;

-- Availability list: everyone can read (shared missing lists work without sign-in); admins write.
create policy "gens readable"    on public.gens    for select using (true);
create policy "gens admin write" on public.gens    for all using (public.is_admin()) with check (public.is_admin());
create policy "pokemon readable"    on public.pokemon for select using (true);
create policy "pokemon admin write" on public.pokemon for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: own row, or any row for admins.
create policy "profile read own"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profile update own" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- Ticks: each user only sees and changes their own.
create policy "ticks own" on public.ticks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Change log: admins only.
create policy "change log admin" on public.change_log for select using (public.is_admin());
