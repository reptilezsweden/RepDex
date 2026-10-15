-- Event crawler: current and upcoming Pokémon GO events from Leek Duck (https://leekduck.com/events/)
-- with the Pokémon each event features, by category (Spawns, Raids, Eggs, Research …).
-- Read by the Edge Function "events" (daily via pg_cron, or "Run now" in admin).
-- Later used to show users which event Pokémon they are missing.

create table if not exists public.events (
  id           text primary key,            -- Leek Duck occurrence ID, e.g. 2026-10-27-halloween-2026-part-1
  slug         text not null,               -- page slug, e.g. halloween-2026-part-1
  name         text not null,
  event_type   text not null,               -- Leek Duck type: event, community-day, …
  url          text not null,
  image        text,
  starts_at    timestamp,                   -- as listed; local time when local_time is true
  ends_at      timestamp,
  local_time   boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index if not exists events_ends_at on public.events (ends_at);

create table if not exists public.event_pokemon (
  id         bigserial primary key,
  event_id   text not null references public.events (id) on delete cascade,
  category   text not null,                 -- "Spawns", "Raids – One-Star Raids", "Eggs – 7 km", "Shiny" …
  name       text not null,                 -- as written, e.g. "Zubat wearing a top hat"
  image      text,
  shiny      boolean not null default false, -- marked "can be shiny" on the page
  species    integer,                       -- national dex number, when it could be read
  pokemon_id text references public.pokemon (id) on update cascade on delete set null, -- matched RepDex row
  sort       integer not null default 0
);
create unique index if not exists event_pokemon_unique on public.event_pokemon (event_id, category, name);
create index if not exists event_pokemon_row on public.event_pokemon (pokemon_id);

-- Settings and status for the event crawler (one row).
create table if not exists public.event_crawler (
  id           int primary key default 1 check (id = 1),
  enabled      boolean not null default true,
  event_types  text[] not null default array['event'],
  last_run_at  timestamptz,
  last_status  text,
  last_message text
);
insert into public.event_crawler (id) values (1) on conflict (id) do nothing;

alter table public.events        enable row level security;
alter table public.event_pokemon enable row level security;
alter table public.event_crawler enable row level security;
-- Events are public information; everyone can read them.
create policy "events readable"        on public.events        for select using (true);
create policy "event pokemon readable" on public.event_pokemon for select using (true);
create policy "event crawler admin"    on public.event_crawler for all using (public.is_admin()) with check (public.is_admin());

-- Admin "Run now" for the event crawler.
create or replace function public.events_run_now() returns bigint
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return net.http_post(
    url := 'https://wtkyumcsvybvzuolwmjr.supabase.co/functions/v1/events',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-crawler-secret', (select secret from public.crawler_settings where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000);
end;
$$;
revoke all on function public.events_run_now() from public, anon;
grant execute on function public.events_run_now() to authenticated;

-- Daily at 04:47 UTC, after the release-date crawler.
select cron.schedule('repdex-events', '47 4 * * *', $cron$
  select net.http_post(
    url := 'https://wtkyumcsvybvzuolwmjr.supabase.co/functions/v1/events',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-crawler-secret', (select secret from public.crawler_settings where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000)
$cron$);
