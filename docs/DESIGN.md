# Pokédex App – Design Document

Last updated 2026-10-10

The app tracks a player's Pokémon collection across several dexes, built in three steps: the availability list, the dexes, then user functions.

## General requirements

- Mobile and desktop friendly: one responsive layout that works on phone, tablet and desktop browsers.
- Built as a PWA (installable web app): users add it to the home screen from the browser and get its own icon and full-screen view. No App Store or Google Play listing for now; the PWA can be wrapped for the stores later.
- Online only: no offline mode needed.
- Touch targets sized for fingers on mobile; the Pokémon grid shows more columns on wider screens.

## 1. Availability list

The availability list is the shared master data every dex is built from: 11 generations and 1,823 Pokémon entries (1,025 species plus forms, costumes, Megas and Gigantamax). Users never edit it; it is maintained centrally and updated when new Pokémon are released.

### Gens (11 rows)

| Field | Type | Example | Purpose |
| --- | --- | --- | --- |
| gen\_nr | Number (key) | 1, 7.5, 8.5 | Generation; decimals for Meltan (7.5) and Hisui (8.5) |
| region | Text | Kanto | Shown as group header and filter |
| prefix\_name | Text | Kantonian | Adjective form of the region |

### Pokemon (1,823 rows)

One row per collectible variant. Key = ID, which must be unique: it is the primary key, so admin edits, imports and crawlers that would create a duplicate ID are rejected. It is built from the 4-digit species number plus a form code: `0001_REGULAR`, `0001_fFALL_2019` (form), `0001_cJAN_2020_NOEVOLVE` (costume).

| Group | Fields | Notes |
| --- | --- | --- |
| Identity | ID, species, name, alt\_name, gen\_nr → gens | alt\_name is the display name for variants, e.g. "Halloween Bulbasaur" |
| Dex membership | dex\_caught, dex\_lucky | TRUE/FALSE flags that decide which rows count in a dex |
| Form | form\_type, form, regional | 8 form types: Regular, Costume, Form, Mega, Regional, Gigantamax, Battle-Only Form, Gender |
| Images | image\_regular, image\_shiny | File names, e.g. pm1.icon.png / pm1.s.icon.png |
| Types | type1, type2 | 18 types; type2 optional |
| Evolution | family, family\_search, stage, evolve\_candy, evolves\_from → ID, evolution\_requirement | stage 1–3; evolves\_from points to another row's ID |
| Classification | classification, region\_lock | Legendary, Mythical, Baby, Ultra Beast; region lock as free text |
| Origin | release event, how to get | Mostly filled for costumes and event forms |
| Release dates | released, released\_shiny, release\_shadow, release\_shadow\_shiny, release\_dynamax, release\_dynamax\_shiny | Empty = not released yet; drives availability |

### Availability rule

An entry is available in a dex when its date field is filled and is on or before today. A future date means it is announced but not yet counted, so it switches on automatically on that day.

- 247 entries have no `released` date (unreleased): 124 Forms, 66 Regular, 36 Mega, 15 Gigantamax, 5 Battle-Only, 1 Gender.
- Scheduled ahead as of today: 14 `released`, 4 `released_shiny`, 9 Dynamax and 9 Dynamax shiny dates.

### Data issues found in the file

| Issue | Where | Fix | Decision |
| --- | --- | --- | --- |
| Empty text instead of empty date | `released` on 6 Mega rows (0150\_fMEGA\_X, 0150\_fMEGA\_Y, four MEGA\_Z) | Clear the cells so they read as "not released" | Approved |
| Trailing spaces | `release event` (182 rows), `region_lock` (1 row) | Trim on import; this also merges duplicate evolution text | Approved |
| Numbers stored as text | `evolve_candy` empty values are "" not blank | Store as number or blank | Approved |
| Inconsistent column names | `release event` and `how to get` have spaces; `released` vs `release_shadow` | Rename to snake\_case: `release_event`, `how_to_get`, `release_shiny` | Approved |
| Derived column | `family_search` repeats what `family` already gives | Generate it in the app instead of storing it | Approved |
| Gender rows missing from Caught | 0876\_fFEMALE, 0902\_fFEMALE, 0916\_fFEMALE | Set `dex_caught` = TRUE | Approved |
| Regular rows without \_REGULAR ID | e.g. 0201\_fUNOWN\_F, 0327\_f00, 0493\_fNORMAL | None | Expected: form-only species have no plain version |

### Decisions

| Topic | Decision |
| --- | --- |
| Mythicals | Not in the Lucky dex, as intended (they can't be traded) |
| Gender rows | Bug: set `dex_caught` = TRUE on 0876\_fFEMALE, 0902\_fFEMALE and 0916\_fFEMALE |
| Unreleased entries | Shown greyed out |
| Upcoming entries (future date) | Shown greyed out with a green border |
| Images | Hosted in the RepDex repo, folder `Images/Pokemon - 256x256/Addressable Assets` (main branch), kept up to date by an automatic pull from another source; the app builds each URL from that folder plus `image_regular` / `image_shiny` |
| Crawler updates | Filling an empty field is automatic; changing an existing value needs admin approval |

### Admin function

Admins maintain the availability list in the app; normal users only read it.

- Roles: `user` and `admin`. You are the first admin; an admin can promote other users to admin or demote them later.
- Admins can add, edit and delete rows in gens and pokemon, including every field and all release dates.
- Every change is logged: who, when, field, old value and new value, so mistakes can be undone.
- Bulk import and export of the full list (xlsx or CSV), for big updates like a new generation.

### Crawlers for release dates

Scheduled crawlers read pages on the [Pokémon GO Wiki](https://pokemongo.fandom.com/wiki/) and compare the dates they find with the list.

1. The crawler runs once a day (Supabase Edge Function `crawler`, started by pg_cron at 04:17 UTC; admins can also press "Run now").
2. Only wiki dates from 14 days ago onwards are used; older dates are settled by hand. It reads each enabled page and matches Pokémon by name and form to an ID (form words are compared with the ID code and the display name).
3. A date found for an empty field is written automatically and logged with source "crawler".
4. A date that differs from an existing value, or an entry it can't place, goes to a review queue. The earliest date per row and field counts.
5. An admin approves or rejects each queued item at /admin/crawler; approved ones are logged as "crawler (approved)". The row picked for an unknown entry, or "ignore", is remembered for later runs. A rejected finding is never queued again.

Admins switch sources on and off and see the last run status at /admin/crawler.

New costume/event Pokémon on the event list (within the 14-day window) that RepDex doesn't have are added as Costume rows (logged as "(added)" by "crawler"). Species details are copied from the regular row; the image is the unused `pm<nr>.<CODE>.icon.png` in the asset folder that shares words or the year with the wiki entry, and the row ID follows it (`0025_fHALLOWEEN_2026`). Without an image the ID is made from the wiki name. An entry is not added when a costume of that species already has the same date; it goes to the review queue instead. Entries naming a group ("Minior (color core)") apply to every matching form.

| Source page | Feeds field | Dexes affected | Notes |
| --- | --- | --- | --- |
| [List of Pokémon forms by release date](https://pokemongo.fandom.com/wiki/List_of_Pok%C3%A9mon_forms_by_release_date) (one page per year, /2016 onwards) | `released`, `release_shiny` on every row except Costume | Caught, Lucky, XXL, XXS, 100%, Shiny, Shiny ⭐⭐⭐, Mega, Gigantamax and their shiny dexes | Headings like "January 4" without the year; `{{P}}`/`{{PS}}` entries with `form=`, `mega=t`, `gigantamax=t` |
| [List of Event Pokémon by release date](https://pokemongo.fandom.com/wiki/List_of_Event_Pok%C3%A9mon_by_release_date) | `released`, `release_shiny` on rows where `form_type` = Costume | Costumes, Costumes shiny | `{{PC|Name|code}}` entries; the wiki's costume codes rarely match ours, so most entries are placed once by hand |
| [List of Shadow Pokémon by release date](https://pokemongo.fandom.com/wiki/List_of_Shadow_Pok%C3%A9mon_by_release_date) | `release_shadow`, `release_shadow_shiny` | Shadow, Purified, Shadow shiny, Purified shiny | Dates written as "July 22nd, 2019"; shiny on a separate tab |
| [List of Dynamax Pokémon by release date](https://pokemongo.fandom.com/wiki/List_of_Dynamax_Pok%C3%A9mon_by_release_date) | `release_dynamax`, `release_dynamax_shiny` | Dynamax, Dynamax shiny | Gigantamax entries on this page are skipped (they come from the forms pages) |

### Event crawler

A second crawler (Edge Function `events`, daily at 04:47 UTC, "Run now" at /admin/events) reads current and upcoming events from [Leek Duck](https://leekduck.com/events/). Only the "Event" type for now (`event_crawler.event_types`); GO Battle League, raids and the like are skipped.

- `events`: name, start and end (as listed, usually local time), page URL.
- `event_pokemon`: each Pokémon an event page lists, with its category ("Spawns", "Raids – One-Star Raids", "Egg 7 km", "Shiny" …), whether it can be shiny, its species number and the matched RepDex row when it can be told (by image name, display name, Mega/regional prefix). "Pokémon Debut" and "Shiny Debut" sections are skipped since they repeat Pokémon listed below.
- An event's Pokémon are replaced on every run, so edits on Leek Duck carry over. Past events stay in the table.
- Raid bosses: the same function reads the current regular and Shadow raid bosses from [Leek Duck's raid page](https://leekduck.com/raid-bosses/) into the event `raid-bosses` (no start or end), at 06:01 and 10:01 Swedish time (pg_cron job `repdex-raids`, body `{"raids": true, "hours": [6, 10]}`) and on every events run. Each boss keeps its level (`event_pokemon.level`: "1", "3", "5", "Mega" …), Shadow and shiny marks (the shiny icon on its card). The events page shows it as the first card under "Happening now", one list with the level in each box. For Missing, raid bosses match like other event Pokémon: a Shadow boss counts for Shadow/Purified as well as the other dexes, shiny dexes only when it can be shiny; forms match their own row. Raid bosses never count for Dynamax or Gigantamax.
- Planned: a page showing users which Pokémon in current events they are missing.

### Gender

Users can tick male and female separately, per dex group (Settings → Gender ♂ / ♀; Shiny and Shiny ⭐⭐⭐ have their own switch, other shiny dexes follow their dex, XXS follows XXL, Purified follows Shadow). Stored in `profiles.gender_dexes`. On a dex page whose own tick isn't split, the ♀ row shows only the split ticks (e.g. Caught off, Shiny on: the ♀ row holds just the stars).

- Every row whose `gender` is `Both` has a female twin `<id>_g2` with `form_type = Gender`, `row_gender = Female` and `gender_of` = the original row. The original (`row_gender = Male`) keeps its ID, so existing ticks count as ♂. Indeedee, Basculegion and Oinkologne already have a row per gender and get no twins.
- `gender_diff`: `no_change` (same image), `image_change` (a `.g2` image exists: `pm3.g2.icon.png`, `pm3.g2.s.icon.png`) or `dex_form_change` (the three above).
- Twins evolve from the female twin of the previous Pokémon; female-only evolutions (Froslass, Vespiquen …) come from the female twin too.
- No dex includes twins by itself. Where gender is on, each card gets a ♀ side made of the twins of its rows: a second row of ticks, counted on its own. Counters then read "[both genders] or [either gender] / total · % or %".
- A trigger copies every shared field (dates, names, types, candy …) from the original to its twin, so the crawlers and admin edits keep both in step; new two-gender rows get their twin automatically. The crawlers ignore twins.

## 2. Dexes

The app has 19 dexes, each a filtered view of the availability list. A dex is defined by three settings. Dex names, order and rules are maintained in code only; there is no admin screen for them.

| Setting | Meaning | Example |
| --- | --- | --- |
| Check field + value | Which rows belong to the dex | `dex_caught` = TRUE |
| Date field | Which release date decides availability | `released_shiny` |
| Default on/off | Whether the dex is shown for new users | On |

### Two versions of every dex

- **In game dex:** exists for every dex. Counts unique species, like the game's own Pokédex; a species is complete when any of its rows is collected. Exception: the two Costume dexes count every costume row, so their In game dex already holds all forms.
- **All forms dex:** counts every row, so each form is its own entry. Each user switches it on or off in their settings; off by default. Costume dexes have no All forms version.

### Dex list

Sizes count entries released as of today; upcoming entries are not yet included.

| Dex | Default | Includes rows where | Date field | In game today | All forms today |
| --- | --- | --- | --- | --- | --- |
| Caught | On | dex\_caught = TRUE | released | 956 | 1,164 |
| Shiny | On | dex\_caught = TRUE | released\_shiny | 898 | 1,085 |
| Shiny ⭐⭐⭐ | Off | dex\_caught = TRUE | released\_shiny | 898 | 1,085 |
| Lucky | On | dex\_lucky = TRUE | released | 938 | 1,136 |
| XXL | On | dex\_caught = TRUE | released | 956 | 1,164 |
| XXS | On | dex\_caught = TRUE | released | 956 | 1,164 |
| Gigantamax | On | form\_type = Gigantamax | released | 17 | 17 |
| Gigantamax shiny | Off | form\_type = Gigantamax | released\_shiny | 16 | 16 |
| Mega | On | form\_type = Mega | released | 58 | 60 |
| Mega shiny | Off | form\_type = Mega | released\_shiny | 58 | 60 |
| Shadow | On | dex\_caught = TRUE | release\_shadow | 467 | 486 |
| Shadow shiny | Off | dex\_caught = TRUE | release\_shadow\_shiny | 341 | 353 |
| Purified | On | dex\_caught = TRUE | release\_shadow | 467 | 486 |
| Purified shiny | Off | dex\_caught = TRUE | release\_shadow\_shiny | 341 | 353 |
| 100% | On | dex\_caught = TRUE | released | 956 | 1,164 |
| Dynamax | Off | form\_type = Regular, Regional, Gender or Form | release\_dynamax | 143 | 145 |
| Dynamax shiny | Off | form\_type = Regular, Regional, Gender or Form | release\_dynamax\_shiny | 141 | 142 |
| Costumes | Off | form\_type = Costume | released | 321 (all costumes) | No All forms version |
| Costumes shiny | Off | form\_type = Costume | released\_shiny | 311 (all costumes) | No All forms version |

In the two Dynamax dexes, rows with no date in their date field are hidden instead of greyed out, since most Pokémon will never get a Dynamax version. Rows with a future date still show greyed out with a green border.

The Mega and Gigantamax dexes read only `released` and `released_shiny`; their Shadow and Dynamax date fields are ignored.

## 3. User functions

Each user ticks off Pokémon per dex, and the app shows their progress.

### User values

Stored per user, per Pokémon entry, per dex.

| Field | Type | Purpose |
| --- | --- | --- |
| user\_id | Reference → user | Whose collection |
| pokemon\_id | Reference → pokemon.ID | Which entry |
| dex | Dex key, e.g. `shiny` | Which dex it is ticked in |
| collected | Yes / No | First tick: the user has it |
| wanted | Yes / No | Second tick, available once collected is ticked; puts the entry on the user's missing list again |
| collected\_at | Date and time | Set automatically when ticked |

In game progress is calculated, not stored: a species counts as collected when any of its entries in that dex is ticked.

### Sign-in

- Email and password.
- Password reset by email: the user gets a link to set a new password.
- "Remember me" checkbox on the sign-in screen keeps the user signed in on that device.

### User settings

| Setting | Options | Default |
| --- | --- | --- |
| Language | English, Swedish, Japanese | English |
| Visible dexes | On/off per dex | The Default column in the dex list |
| All forms dex | On / Off | Off |
| Dex order | Fixed in code | — |

### Spreadsheet download and upload

Users can fill in their collection in a spreadsheet instead of tapping through the app.

1. Download a spreadsheet of all entries as .xlsx, which opens in both Excel and Google Sheets.
2. Fill it in, changing TRUE/FALSE in the two tick columns.
3. Upload it; the app updates the Caught and Shiny dexes from the tick columns, matching rows by ID.

| Column | Content | Editable |
| --- | --- | --- |
| caught | TRUE/FALSE, the user's current Caught tick | Yes |
| caught\_shiny | TRUE/FALSE, the user's current Shiny tick | Yes |
| ID | Entry key | No, used to match rows |
| form\_type | Regular, Costume, Mega… | No |
| species | Species number | No |
| name | alt\_name when filled, otherwise name | No |

Faulty rows, such as an unknown ID or a tick value other than TRUE/FALSE, are skipped and the rest of the upload goes through. Afterwards the user sees a report:

- x unchanged rows
- x updated rows
- A list of the faulty rows with the reason for each

### Functions

- Sign in and keep the collection in the account, so it is the same on phone and desktop.
- Tick or untick an entry with one tap in the dex grid.
- Progress per dex: collected / total, In game and All forms.
- Search by name and filter by generation, type and collected / missing.
- Upcoming entries shown greyed out with a green border, unreleased greyed out (step 1).

### Missing lists and sharing

Users share missing lists, not their whole collection.

- A missing list exists per dex and holds every released entry the user hasn't collected, plus collected entries ticked as wanted.
- The user can share a missing list with others, e.g. to find trades, as a read-only link anyone can open and as a text list to paste into chats. The rest of the collection stays private.
- Search phrases come in English and Japanese, since a trading partner pastes them into their own game. Japanese keywords are from Niantic's Japanese help page on searching: 色違い (shiny), こうかん (traded), xxs, xxl, だいまっくす, きょだいまっくす, とくべつ (event/costume). The phrase's game language is chosen next to it (default: Japanese on the Japanese site, else English) and remembered per browser.

### Japanese

With the site in Japanese, Pokémon show their Japanese names: species and main-series forms from PokeAPI, Mega/Gigantamax/regional forms by rule (メガリザードンX, ロコン（アローラのすがた）), and costumes with the labels Japanese players use (みんポケ's costume Pokédex, e.g. ピカチュウ（魔女帽子）), since the game itself doesn't name costumes. How they were filled, with sources: scripts/japanese_names.sql. Rows added later show English until filled. Event names, evolution requirements and admin pages stay English.

## 4. Tech stack

| Part | Choice | Notes |
| --- | --- | --- |
| App | Next.js, built as a PWA | One codebase for phone and desktop |
| Database and sign-in | Supabase (Postgres), free plan | Email/password, reset emails and roles built in; upgrade to Pro if needed |
| Hosting | Vercel | Deploys from the RepDex repo |
| Crawlers | Supabase Edge Function + pg_cron, daily | Code in supabase/functions/crawler |
| Images | RepDex Images folder via the jsDelivr CDN | Cached delivery of the 256x256 assets |
| Languages | English, Swedish and Japanese translation files; Pokémon text translated in `species_names`, `pokemon_names` and `text_translations` (English stays in `pokemon`) | English default |

Supabase free plan: 500 MB database, 50,000 monthly active users, and the project pauses after a week without activity ([pricing](https://supabase.com/pricing)).
