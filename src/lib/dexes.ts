// Dex definitions and selection rules. Names, order and rules live here only (docs/DESIGN.md §2).

export type FormType =
  | "Regular" | "Costume" | "Form" | "Mega" | "Regional"
  | "Gigantamax" | "Battle-Only Form" | "Gender";

export type DateField =
  | "released" | "release_shiny" | "release_shadow" | "release_shadow_shiny"
  | "release_dynamax" | "release_dynamax_shiny";

export interface Pokemon {
  id: string;
  sort_order: number;
  dex_caught: boolean;
  dex_lucky: boolean;
  gen_nr: number;
  form_type: FormType;
  image_regular: string | null;
  image_shiny: string | null;
  species: number;
  name: string;
  alt_name: string | null;
  type1: string | null;
  type2: string | null;
  released: string | null;
  release_shiny: string | null;
  release_shadow: string | null;
  release_shadow_shiny: string | null;
  release_dynamax: string | null;
  release_dynamax_shiny: string | null;
}

export interface Dex {
  key: string;
  name: { en: string; sv: string };
  includes: (p: Pokemon) => boolean;
  dateField: DateField;
  defaultOn: boolean;
  shiny: boolean;
  /** Rows with no date in dateField are hidden instead of greyed out. */
  hideWithoutDate?: boolean;
  /** In game version counts every row (no species grouping, no All forms version). */
  everyRow?: boolean;
}

const caught = (p: Pokemon) => p.dex_caught;
const formType = (...types: FormType[]) => (p: Pokemon) => types.includes(p.form_type);

export const DEXES: Dex[] = [
  { key: "caught", name: { en: "Caught", sv: "Fångade" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "lucky", name: { en: "Lucky", sv: "Lucky" }, includes: (p) => p.dex_lucky, dateField: "released", defaultOn: true, shiny: false },
  { key: "xxl", name: { en: "XXL", sv: "XXL" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "xxs", name: { en: "XXS", sv: "XXS" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "perfect", name: { en: "Perfect", sv: "Perfekta" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "shiny", name: { en: "Shiny", sv: "Shiny" }, includes: caught, dateField: "release_shiny", defaultOn: true, shiny: true },
  { key: "shiny3", name: { en: "Shiny ⭐⭐⭐", sv: "Shiny ⭐⭐⭐" }, includes: caught, dateField: "release_shiny", defaultOn: false, shiny: true },
  { key: "shadow", name: { en: "Shadow", sv: "Shadow" }, includes: caught, dateField: "release_shadow", defaultOn: true, shiny: false },
  { key: "purified", name: { en: "Purified", sv: "Purified" }, includes: caught, dateField: "release_shadow", defaultOn: true, shiny: false },
  { key: "shadow_shiny", name: { en: "Shadow shiny", sv: "Shadow shiny" }, includes: caught, dateField: "release_shadow_shiny", defaultOn: false, shiny: true },
  { key: "purified_shiny", name: { en: "Purified shiny", sv: "Purified shiny" }, includes: caught, dateField: "release_shadow_shiny", defaultOn: false, shiny: true },
  { key: "mega", name: { en: "Mega", sv: "Mega" }, includes: formType("Mega"), dateField: "released", defaultOn: true, shiny: false },
  { key: "mega_shiny", name: { en: "Mega shiny", sv: "Mega shiny" }, includes: formType("Mega"), dateField: "release_shiny", defaultOn: false, shiny: true },
  { key: "gigantamax", name: { en: "Gigantamax", sv: "Gigantamax" }, includes: formType("Gigantamax"), dateField: "released", defaultOn: true, shiny: false },
  { key: "gigantamax_shiny", name: { en: "Gigantamax shiny", sv: "Gigantamax shiny" }, includes: formType("Gigantamax"), dateField: "release_shiny", defaultOn: false, shiny: true },
  { key: "dynamax", name: { en: "Dynamax", sv: "Dynamax" }, includes: formType("Regular", "Regional", "Gender", "Form"), dateField: "release_dynamax", defaultOn: false, shiny: false, hideWithoutDate: true },
  { key: "dynamax_shiny", name: { en: "Dynamax shiny", sv: "Dynamax shiny" }, includes: formType("Regular", "Regional", "Gender", "Form"), dateField: "release_dynamax_shiny", defaultOn: false, shiny: true, hideWithoutDate: true },
  { key: "costumes", name: { en: "Costumes", sv: "Kostymer" }, includes: formType("Costume"), dateField: "released", defaultOn: false, shiny: false, everyRow: true },
  { key: "costumes_shiny", name: { en: "Costumes shiny", sv: "Kostymer shiny" }, includes: formType("Costume"), dateField: "release_shiny", defaultOn: false, shiny: true, everyRow: true },
];

export const dexByKey = (key: string) => DEXES.find((d) => d.key === key);

export type Status = "available" | "upcoming" | "unreleased";

/** today as YYYY-MM-DD in the viewer's time zone (dates in the list are calendar dates). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function statusOf(p: Pokemon, dex: Dex, day: string): Status {
  const date = p[dex.dateField];
  if (!date) return "unreleased";
  return date <= day ? "available" : "upcoming";
}

export interface Entry {
  /** Row ticked when the card is tapped; for a species card, its first available row. */
  pokemon: Pokemon;
  /** All rows behind this card (one in All forms mode). */
  rows: Pokemon[];
  status: Status;
}

const statusRank: Record<Status, number> = { available: 0, upcoming: 1, unreleased: 2 };

/** Rows of a dex in sheet order, with hidden rows removed. */
export function dexRows(all: Pokemon[], dex: Dex): Pokemon[] {
  return all
    .filter((p) => dex.includes(p) && !(dex.hideWithoutDate && !p[dex.dateField]))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Cards shown in a dex. In game = one card per species; All forms = one per row. */
export function dexEntries(all: Pokemon[], dex: Dex, allForms: boolean, day: string): Entry[] {
  const rows = dexRows(all, dex);
  if (allForms || dex.everyRow) {
    return rows.map((p) => ({ pokemon: p, rows: [p], status: statusOf(p, dex, day) }));
  }
  const bySpecies = new Map<number, Pokemon[]>();
  for (const p of rows) {
    const list = bySpecies.get(p.species);
    if (list) list.push(p);
    else bySpecies.set(p.species, [p]);
  }
  return [...bySpecies.values()].map((group) => {
    const best = [...group].sort(
      (a, b) => statusRank[statusOf(a, dex, day)] - statusRank[statusOf(b, dex, day)] || a.sort_order - b.sort_order,
    )[0];
    return { pokemon: best, rows: group, status: statusOf(best, dex, day) };
  });
}

export interface Tick { pokemon_id: string; dex: string; collected: boolean; wanted: boolean }

/** Collected / total over available entries. A species card counts when any of its available rows is collected. */
export function progress(entries: Entry[], dex: Dex, ticks: Map<string, Tick>, day: string) {
  let total = 0;
  let done = 0;
  for (const e of entries) {
    if (e.status !== "available") continue;
    total++;
    if (e.rows.some((r) => statusOf(r, dex, day) === "available" && ticks.get(r.id)?.collected)) done++;
  }
  return { done, total };
}

/** Missing list: available entries not collected, plus collected entries marked wanted. */
export function missing(entries: Entry[], dex: Dex, ticks: Map<string, Tick>, day: string): Entry[] {
  return entries.filter((e) => {
    if (e.status !== "available") return false;
    const avail = e.rows.filter((r) => statusOf(r, dex, day) === "available");
    const collected = avail.some((r) => ticks.get(r.id)?.collected);
    const wanted = avail.some((r) => ticks.get(r.id)?.wanted);
    return !collected || wanted;
  });
}

export const DATE_FIELDS: DateField[] = [
  "released", "release_shiny", "release_shadow", "release_shadow_shiny", "release_dynamax", "release_dynamax_shiny",
];

export interface Upcoming { date: string; items: { pokemon: Pokemon; type: DateField }[] }

/** Every release date after today, grouped by date, soonest first. */
export function upcomingReleases(all: Pokemon[], day: string): Upcoming[] {
  const byDate = new Map<string, Upcoming["items"]>();
  for (const p of all) {
    for (const f of DATE_FIELDS) {
      const d = p[f];
      if (d && d > day) {
        const list = byDate.get(d) ?? [];
        list.push({ pokemon: p, type: f });
        byDate.set(d, list);
      }
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => a.pokemon.sort_order - b.pokemon.sort_order || DATE_FIELDS.indexOf(a.type) - DATE_FIELDS.indexOf(b.type)),
    }));
}

export function displayName(p: Pokemon): string {
  return p.alt_name || p.name;
}

export function visibleDexes(visible: string[] | null | undefined): Dex[] {
  return DEXES.filter((d) => (visible ? visible.includes(d.key) : d.defaultOn));
}
