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

1. Crawler runs on a schedule, e.g. once a day.
2. It reads each configured page and matches Pokémon by name and form to an ID.
3. A date found for an empty field is written automatically and logged as a crawler edit.
4. A date that differs from an existing value, or a Pokémon not found in the list, goes to a review queue.
5. An admin approves or rejects each queued item; approved ones are written and logged like a manual edit.

Admins manage the crawler sources in the app: page URL, which date field it fills (released, shiny, shadow, Dynamax…), on/off, and last run status.

| Source page | Feeds field | Dexes affected | Notes |
| --- | --- | --- | --- |
| [List of Pokémon with different forms](https://pokemongo.fandom.com/wiki/List_of_Pok%C3%A9mon_with_different_forms#Regular) | `released`, `released_shiny` on every row except Costume | Caught, Lucky, XXL, XXS, Perfect, Shiny, Shiny ⭐⭐⭐, Mega, Gigantamax and their shiny dexes | Covers Regular, Form, Regional, Mega, Gigantamax, Battle-Only Form and Gender rows; lists both release and shiny dates for plain Regular Pokémon |
| [List of Event Pokémon by release date](https://pokemongo.fandom.com/wiki/List_of_Event_Pok%C3%A9mon_by_release_date) | `released`, `released_shiny`, `release_event` on rows where `form_type` = Costume | Costumes, Costumes shiny | Only updates Costume rows; layout still to be checked when the crawler is built |
| [List of Shadow Pokémon by release date](https://pokemongo.fandom.com/wiki/List_of_Shadow_Pok%C3%A9mon_by_release_date) | `release_shadow`, `release_shadow_shiny` | Shadow, Purified, Shadow shiny, Purified shiny | Dates written as "July 22nd, 2019"; Pokémon listed under each date; Shadow shiny dates are on a separate tab of the same page |
| [List of Dynamax Pokémon by release date](https://pokemongo.fandom.com/wiki/List_of_Dynamax_Pok%C3%A9mon_by_release_date) | `release_dynamax`, `release_dynamax_shiny` | Dynamax, Dynamax shiny | Grouped under date headings; shiny releases appear as entries named "Shiny Dynamax \<name>"; upcoming dates are marked |

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
| Lucky | On | dex\_lucky = TRUE | released | 938 | 1,136 |
| XXL | On | dex\_caught = TRUE | released | 956 | 1,164 |
| XXS | On | dex\_caught = TRUE | released | 956 | 1,164 |
| Perfect | On | dex\_caught = TRUE | released | 956 | 1,164 |
| Shiny | On | dex\_caught = TRUE | released\_shiny | 898 | 1,085 |
| Shiny ⭐⭐⭐ | Off | dex\_caught = TRUE | released\_shiny | 898 | 1,085 |
| Shadow | On | dex\_caught = TRUE | release\_shadow | 467 | 486 |
| Purified | On | dex\_caught = TRUE | release\_shadow | 467 | 486 |
| Shadow shiny | Off | dex\_caught = TRUE | release\_shadow\_shiny | 341 | 353 |
| Purified shiny | Off | dex\_caught = TRUE | release\_shadow\_shiny | 341 | 353 |
| Mega | On | form\_type = Mega | released | 58 | 60 |
| Mega shiny | Off | form\_type = Mega | released\_shiny | 58 | 60 |
| Gigantamax | On | form\_type = Gigantamax | released | 17 | 17 |
| Gigantamax shiny | Off | form\_type = Gigantamax | released\_shiny | 16 | 16 |
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
| Language | English, Swedish | English |
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

## 4. Tech stack

| Part | Choice | Notes |
| --- | --- | --- |
| App | Next.js, built as a PWA | One codebase for phone and desktop |
| Database and sign-in | Supabase (Postgres), free plan | Email/password, reset emails and roles built in; upgrade to Pro if needed |
| Hosting | Vercel | Deploys from the RepDex repo |
| Crawlers | GitHub Actions, daily schedule | Same setup as the existing image sync |
| Images | RepDex Images folder via the jsDelivr CDN | Cached delivery of the 256x256 assets |
| Languages | English and Swedish translation files | English default |

Supabase free plan: 500 MB database, 50,000 monthly active users, and the project pauses after a week without activity ([pricing](https://supabase.com/pricing)).
