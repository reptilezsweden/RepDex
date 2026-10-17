-- The app caches the Pokémon list (with translations) and the generations for a day. Any write to
-- those tables (admin, crawlers, the SQL editor) asks the app to clear that cache at once:
-- a statement-level trigger posts to <site>/api/revalidate with the crawler secret, which the app
-- checks with check_revalidate_secret().

alter table public.crawler_settings add column if not exists site_url text not null default 'https://repdex-beta.vercel.app';

-- Lets the app check the secret without being able to read it.
create or replace function public.check_revalidate_secret(p_secret text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crawler_settings where id = 1 and secret = p_secret and p_secret <> '')
$$;
revoke all on function public.check_revalidate_secret(text) from public;
grant execute on function public.check_revalidate_secret(text) to anon, authenticated;

create or replace function public.notify_revalidate() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select site_url, secret into s from public.crawler_settings where id = 1;
  if s.site_url is not null and s.secret is not null then
    -- pg_net sends it in the background, after the transaction commits; a failure never blocks the write.
    perform net.http_post(
      url := rtrim(s.site_url, '/') || '/api/revalidate',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', s.secret),
      body := '{}'::jsonb
    );
  end if;
  return null;
end;
$$;
revoke all on function public.notify_revalidate() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['pokemon', 'gens', 'species_names', 'pokemon_names', 'text_translations'] loop
    execute format('drop trigger if exists %1$s_revalidate on public.%1$s', t);
    execute format('create trigger %1$s_revalidate after insert or update or delete on public.%1$s
      for each statement execute function public.notify_revalidate()', t);
  end loop;
end $$;
