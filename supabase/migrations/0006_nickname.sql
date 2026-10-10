-- In-game nickname: required for every user, unique (ignoring case), Pokémon GO rules: 1–15 letters or digits.

alter table public.profiles add column if not exists nickname text;

alter table public.profiles drop constraint if exists profiles_nickname_format;
alter table public.profiles add constraint profiles_nickname_format
  check (nickname is null or nickname ~ '^[A-Za-z0-9]{1,15}$');

create unique index if not exists profiles_nickname_unique on public.profiles (lower(nickname));

-- Lets the sign-up form check a nickname before the account exists.
create or replace function public.nickname_available(name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(nickname) = lower(name));
$$;
grant execute on function public.nickname_available(text) to anon, authenticated;

-- New sign-ups get their nickname from the sign-up form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nickname)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'nickname', ''));
  return new;
end;
$$;
