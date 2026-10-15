-- Release-date crawler (docs/DESIGN.md "Crawlers for release dates").
-- A Supabase Edge Function ("crawler") reads Pokémon GO Wiki pages daily. Dates for empty fields
-- are written straight away (logged with source "crawler"); changed dates and entries it can't
-- match go to a review queue that admins approve or reject.

create table if not exists public.crawler_sources (
  key          text primary key,
  name         text not null,
  page         text not null,          -- wiki page title (Forms: the base title of the yearly pages)
  enabled      boolean not null default true,
  last_run_at  timestamptz,
  last_status  text,
  last_message text
);

insert into public.crawler_sources (key, name, page) values
  ('forms',    'Pokémon and forms (regular + shiny)', 'List of Pokémon forms by release date'),
  ('shadow',   'Shadow (regular + shiny)',            'List of Shadow Pokémon by release date'),
  ('dynamax',  'Dynamax (regular + shiny)',           'List of Dynamax Pokémon by release date'),
  ('costumes', 'Costume/Event (regular + shiny)',     'List of Event Pokémon by release date')
on conflict (key) do nothing;

-- Wiki entries matched by hand once, remembered for later runs. pokemon_id null = ignore the entry.
create table if not exists public.crawler_aliases (
  key        text primary key,
  pokemon_id text references public.pokemon (id) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.crawler_queue (
  id            bigserial primary key,
  source        text not null,
  entry_key     text not null,          -- source|name|form hint, also the alias key
  label         text not null,          -- what the wiki says, for people
  pokemon_id    text references public.pokemon (id) on update cascade on delete cascade,
  candidates    text[],                 -- rows it might be, when unmatched
  field         text not null,
  found_date    date not null,
  current_value date,
  reason        text not null check (reason in ('changed', 'unmatched')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid
);
-- The same finding is never queued twice, so a rejected one stays rejected.
create unique index if not exists crawler_queue_finding on public.crawler_queue (entry_key, field, found_date);
create index if not exists crawler_queue_pending on public.crawler_queue (status) where status = 'pending';

-- Shared secret for the scheduled call; readable only by the service role and definer functions.
create table if not exists public.crawler_settings (
  id     int primary key default 1 check (id = 1),
  secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
insert into public.crawler_settings (id) values (1) on conflict (id) do nothing;

alter table public.crawler_sources  enable row level security;
alter table public.crawler_aliases  enable row level security;
alter table public.crawler_queue    enable row level security;
alter table public.crawler_settings enable row level security;
create policy "crawler sources admin" on public.crawler_sources for all using (public.is_admin()) with check (public.is_admin());
create policy "crawler aliases admin" on public.crawler_aliases for select using (public.is_admin());
create policy "crawler queue admin"   on public.crawler_queue   for select using (public.is_admin());

-- Release-date fields the crawler may write.
create or replace function public.crawler_field_ok(p_field text) returns boolean
language sql immutable as $$
  select p_field in ('released', 'release_shiny', 'release_shadow', 'release_shadow_shiny', 'release_dynamax', 'release_dynamax_shiny')
$$;

-- Called by the crawler (service role): fill empty date fields, logged as source "crawler".
create or replace function public.crawler_apply(p_updates jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  u jsonb;
  n int := 0;
  c int;
begin
  perform set_config('repdex.source', 'crawler', true);
  for u in select * from jsonb_array_elements(p_updates) loop
    if not public.crawler_field_ok(u ->> 'field') then continue; end if;
    execute format('update public.pokemon set %I = $1 where id = $2 and %I is null', u ->> 'field', u ->> 'field')
      using (u ->> 'date')::date, u ->> 'id';
    get diagnostics c = row_count;
    n := n + c;
  end loop;
  return n;
end;
$$;
revoke all on function public.crawler_apply(jsonb) from public, anon, authenticated;

-- Admin decision on a queued finding. For an unmatched entry the admin picks the row
-- (remembered for later runs); p_pokemon_id null with p_approve false and p_ignore true
-- remembers to ignore the entry.
create or replace function public.crawler_decide(p_id bigint, p_approve boolean, p_pokemon_id text default null, p_ignore boolean default false)
returns text
language plpgsql security definer set search_path = public as $$
declare
  q public.crawler_queue;
  target text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into q from public.crawler_queue where id = p_id for update;
  if not found or q.status <> 'pending' then return 'not pending'; end if;

  if not p_approve then
    if p_ignore and q.reason = 'unmatched' then
      insert into public.crawler_aliases (key, pokemon_id) values (q.entry_key, null)
        on conflict (key) do update set pokemon_id = null;
      update public.crawler_queue set status = 'rejected', decided_at = now(), decided_by = auth.uid()
        where entry_key = q.entry_key and status = 'pending';
    else
      update public.crawler_queue set status = 'rejected', decided_at = now(), decided_by = auth.uid() where id = p_id;
    end if;
    return 'rejected';
  end if;

  target := coalesce(p_pokemon_id, q.pokemon_id);
  if target is null then raise exception 'Choose which Pokémon this is'; end if;
  if not public.crawler_field_ok(q.field) then raise exception 'Unknown field %', q.field; end if;
  if q.reason = 'unmatched' then
    insert into public.crawler_aliases (key, pokemon_id) values (q.entry_key, target)
      on conflict (key) do update set pokemon_id = excluded.pokemon_id;
    -- Other pending findings for the same wiki entry now know their row too.
    update public.crawler_queue set pokemon_id = target where entry_key = q.entry_key and status = 'pending' and pokemon_id is null;
  end if;

  perform set_config('repdex.source', 'crawler (approved)', true);
  execute format('update public.pokemon set %I = $1 where id = $2', q.field) using q.found_date, target;
  update public.crawler_queue set status = 'approved', pokemon_id = target, decided_at = now(), decided_by = auth.uid() where id = p_id;
  return 'approved';
end;
$$;
revoke all on function public.crawler_decide(bigint, boolean, text, boolean) from public, anon;
grant execute on function public.crawler_decide(bigint, boolean, text, boolean) to authenticated;

-- Admin "Run now": calls the crawler function the same way the schedule does.
create or replace function public.crawler_run_now() returns bigint
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return net.http_post(
    url := 'https://wtkyumcsvybvzuolwmjr.supabase.co/functions/v1/crawler',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-crawler-secret', (select secret from public.crawler_settings where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000);
end;
$$;
revoke all on function public.crawler_run_now() from public, anon;
grant execute on function public.crawler_run_now() to authenticated;

-- Daily run at 04:17 UTC.
select cron.schedule('repdex-crawler', '17 4 * * *', $cron$
  select net.http_post(
    url := 'https://wtkyumcsvybvzuolwmjr.supabase.co/functions/v1/crawler',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-crawler-secret', (select secret from public.crawler_settings where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000)
$cron$);

