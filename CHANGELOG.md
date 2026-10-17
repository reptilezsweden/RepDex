# Changelog

RepDex follows [semantic versioning](https://semver.org): `0.x` during the beta, the middle number for
new features, the last for fixes. The version lives in `package.json` and shows in the top bar and at
the bottom of Settings (with the build, the commit it was built from).

## 0.10.2 – 2026-10-17

- Every wishlist marks each Pokémon with the icon of the dex it's missing in (XXS, XXL, Gigantamax, Dynamax, Costume/Event and its shiny too), on the page and in saved images.

## 0.10.1 – 2026-10-17

- Wishlist images follow the light or dark theme, with the RepDex logo (icon, "Rep" and a green "Dex") as in the top bar.

## 0.10.0 – 2026-10-17

- **Collection spreadsheet** now holds the whole collection for the dexes you show: an Instructions tab,
  then one tab per dex group with a column per dex (shiny included), every form, ♀ rows where gender is
  tracked, and TRUE / FALSE / WANTED. Uploads are checked first: a per-tab summary, changes made by the
  tick rules, and skipped cells (copyable), saved only after **Save changes**. Old one-tab files are no
  longer read.
- **Check all / Uncheck all** says when both ♂ and ♀ are changed.
- **Wishlists**: Save as image (share sheet on phones, PNG on desktop; long lists split into several images).
- **Help**: guides for getting started, settings, dexes, icons, events, wishlists, Full collection, Pokémon
  pages, the spreadsheet, installing the app, sharing, release dates and an FAQ (English and Swedish), a
  Help link in the menu and a ? next to each page title. A Getting started card on the start page.

## 0.9.0 – 2026-10-17 (first numbered beta)

Everything built so far, as the starting point for the beta:

- **Dexes**: Caught, Shiny (and Shiny ⭐⭐⭐), Lucky, XXL/XXS, Shadow/Purified, Mega, Gigantamax,
  Dynamax, Costume/Event and 100%, with in-game or All forms views, counters and Check all.
- **Gender tracking** per dex: ♂ and ♀ ticked separately, counters as "both or either".
- **Full collection** table, **Pokémon pages** with forms, types, gender and evolutions.
- **Wishlists** with Pokémon GO search phrases (English and Japanese), public wishlist pages,
  links to each list, and dex marks on combined lists.
- **Events**: current and upcoming Leek Duck events and raid bosses, with what you're missing.
- **Start page** with recent and upcoming releases.
- **Settings**: visible dexes, shiny switches per dex, All forms, gender, language
  (English, Svenska, 日本語), collection spreadsheet download and upload.
- **Admin**: Pokémon editor with translations, generations, users, release-date crawler,
  event crawler, translations of repeated texts, change log with revert.
- Installable as a web app (Add to Home Screen).
