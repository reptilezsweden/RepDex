-- Raid bosses: the current raids from Leek Duck (https://leekduck.com/raid-bosses/), read by the Edge Function
-- "events" into the event "raid-bosses" (no start or end, so it's always under "Happening now").
-- Each boss keeps its raid level ("1", "3", "5", "Mega" …) so the events page can show it in the boss's box.

alter table public.event_pokemon add column if not exists level text;

alter table public.event_crawler add column if not exists raids_last_run_at timestamptz;
alter table public.event_crawler add column if not exists raids_last_status text;
alter table public.event_crawler add column if not exists raids_last_message text;

-- Raid bosses at 06:01 and 10:01 Swedish time. pg_cron runs in UTC, so it calls at both possible UTC hours
-- (summer and winter time) and the function only runs when it's 06 or 10 in Sweden.
select cron.schedule('repdex-raids', '1 4,5,8,9 * * *', $cron$
  select net.http_post(
    url := 'https://wtkyumcsvybvzuolwmjr.supabase.co/functions/v1/events',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-crawler-secret', (select secret from public.crawler_settings where id = 1)),
    body := '{"raids": true, "hours": [6, 10]}'::jsonb,
    timeout_milliseconds := 60000)
$cron$);
