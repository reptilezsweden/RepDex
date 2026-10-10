# Setting up RepDex

One-time steps to connect the app to Supabase and Vercel.

## 1. Create the database

In Supabase, open **SQL Editor → New query** and run these files from the repo, one at a time, in this order:

1. `supabase/migrations/0001_schema.sql`: tables, roles and security rules
2. `supabase/seed/1.sql`: generations and the first half of the Pokémon list
3. `supabase/seed/2.sql`: the second half
4. `supabase/seed/3.sql`: links evolutions together

Check: **Table Editor → pokemon** should show 1,823 rows.

Later migrations in `supabase/migrations/` (e.g. `0002_show_unavailable.sql`, `0003_show_upcoming_unreleased.sql`, `0004_admin_log.sql`) are run the same way, once each, in number order.

## 2. Configure sign-in

In Supabase, open **Authentication → URL Configuration**:

- **Site URL:** your Vercel address, e.g. `https://repdex.vercel.app`
- **Redirect URLs:** add `https://repdex.vercel.app/**` (and `http://localhost:3000/**` for local development)

Email confirmation and password reset links then come back to the app.

## 3. Connect Vercel

In Supabase, open **Project Settings → API Keys** and copy the project URL and the publishable key (or the legacy anon key).

In Vercel, open the RepDex project → **Settings → Environment Variables** and add:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) or the anon key |

Then **Deployments → … → Redeploy** so the new variables take effect.

Never put the secret / service-role key in Vercel's `NEXT_PUBLIC_` variables or in the repo.

## 4. Become admin

Sign up in the app with your email, confirm it, then run `supabase/make-admin.sql` in the SQL editor with your address filled in.

## Updating the Pokémon list from a spreadsheet

```
python3 scripts/build_seed.py path/to/Pokedex.xlsx
```

This regenerates `supabase/seed/*.sql` with the approved data fixes applied. Running it against a database that already has data needs the admin import (coming later) instead.

## Notes

- Vercel skips a deploy when a commit only touches `Images/` (the nightly asset sync), see `vercel.json`.
- Pokémon images load from the jsDelivr CDN, falling back to raw GitHub. 219 entries, mostly unreleased forms, have no image in the folder yet and show a placeholder.
