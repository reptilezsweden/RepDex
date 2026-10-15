-- Extensions for the release-date crawler: HTTP calls from the database and scheduled jobs.
create extension if not exists pg_net;
create extension if not exists pg_cron;
