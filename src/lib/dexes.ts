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
  /** Set on shiny dexes: the regular dex whose pages show it as a star toggle. */
  shinyOf?: string;
  /** Set on regular dexes: the shiny dex shown as a single star. */
  shinyKey?: string;
  /** Set on Caught: the Shiny ⭐⭐⭐ dex shown as a triple star. */
  shiny3Key?: string;
  /** Tracked in RepDex only; Pokémon GO has no such dex. */
  notInGame?: boolean;
}

const caught = (p: Pokemon) => p.dex_caught;
const formType = (...types: FormType[]) => (p: Pokemon) => types.includes(p.form_type);
const dynamaxForms = formType("Regular", "Regional", "Gender", "Form");

export const DEXES: Dex[] = [
  { key: "caught", name: { en: "Caught", sv: "Fångade" }, includes: caught, dateField: "released", defaultOn: true, shiny: false, shinyKey: "shiny", shiny3Key: "shiny3" },
  { key: "lucky", name: { en: "Lucky", sv: "Lucky" }, includes: (p) => p.dex_lucky, dateField: "released", defaultOn: true, shiny: false },
  { key: "xxl", name: { en: "XXL", sv: "XXL" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "xxs", name: { en: "XXS", sv: "XXS" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "perfect", name: { en: "Perfect", sv: "Perfekta" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "shadow", name: { en: "Shadow", sv: "Shadow" }, includes: caught, dateField: "release_shadow", defaultOn: true, shiny: false, shinyKey: "shadow_shiny" },
  { key: "purified", name: { en: "Purified", sv: "Purified" }, includes: caught, dateField: "release_shadow", defaultOn: true, shiny: false, shinyKey: "purified_shiny" },
  { key: "mega", name: { en: "Mega", sv: "Mega" }, includes: formType("Mega"), dateField: "released", defaultOn: true, shiny: false, shinyKey: "mega_shiny" },
  { key: "gigantamax", name: { en: "Gigantamax", sv: "Gigantamax" }, includes: formType("Gigantamax"), dateField: "released", defaultOn: true, shiny: false, shinyKey: "gigantamax_shiny" },
  { key: "dynamax", name: { en: "Dynamax", sv: "Dynamax" }, includes: dynamaxForms, dateField: "release_dynamax", defaultOn: false, shiny: false, hideWithoutDate: true, shinyKey: "dynamax_shiny", notInGame: true },
  { key: "costumes", name: { en: "Costume/Event", sv: "Kostym/Event" }, includes: formType("Costume"), dateField: "released", defaultOn: false, shiny: false, everyRow: true, shinyKey: "costumes_shiny", notInGame: true },

  // Shiny dexes: ticked with a star on their regular dex's pages, not shown as dexes of their own.
  { key: "shiny", name: { en: "Shiny", sv: "Shiny" }, includes: caught, dateField: "release_shiny", defaultOn: true, shiny: true, shinyOf: "caught" },
  { key: "shiny3", name: { en: "Shiny ⭐⭐⭐", sv: "Shiny ⭐⭐⭐" }, includes: caught, dateField: "release_shiny", defaultOn: false, shiny: true, shinyOf: "caught", notInGame: true },
  { key: "shadow_shiny", name: { en: "Shadow shiny", sv: "Shadow shiny" }, includes: caught, dateField: "release_shadow_shiny", defaultOn: true, shiny: true, shinyOf: "shadow" },
  { key: "purified_shiny", name: { en: "Purified shiny", sv: "Purified shiny" }, includes: caught, dateField: "release_shadow_shiny", defaultOn: true, shiny: true, shinyOf: "purified" },
  { key: "mega_shiny", name: { en: "Mega shiny", sv: "Mega shiny" }, includes: formType("Mega"), dateField: "release_shiny", defaultOn: true, shiny: true, shinyOf: "mega" },
  { key: "gigantamax_shiny", name: { en: "Gigantamax shiny", sv: "Gigantamax shiny" }, includes: formType("Gigantamax"), dateField: "release_shiny", defaultOn: true, shiny: true, shinyOf: "gigantamax" },
  { key: "dynamax_shiny", name: { en: "Dynamax shiny", sv: "Dynamax shiny" }, includes: dynamaxForms, dateField: "release_dynamax_shiny", defaultOn: true, shiny: true, hideWithoutDate: true, shinyOf: "dynamax", notInGame: true },
  { key: "costumes_shiny", name: { en: "Costume/Event shiny", sv: "Kostym/Event shiny" }, includes: formType("Costume"), dateField: "release_shiny", defaultOn: true, shiny: true, everyRow: true, shinyOf: "costumes", notInGame: true },
];

/** Regular dexes, i.e. the ones with their own page. */
export const BASE_DEXES = DEXES.filter((d) => !d.shinyOf);
/** Shiny dexes switched together by the "Show shiny" setting (Shiny ⭐⭐⭐ has its own setting). */
export const SHINY_KEYS = DEXES.filter((d) => d.shinyOf && d.key !== "shiny3").map((d) => d.key);
export const ALWAYS_ON = "caught";

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

/** Whether a dex (regular or shiny) is switched on. Caught is always on. */
export function isOn(key: string, visible: string[] | null | undefined): boolean {
  if (key === ALWAYS_ON) return true;
  const d = dexByKey(key);
  if (!d) return false;
  return visible ? visible.includes(key) : d.defaultOn;
}

/** Regular dexes shown on the start page, in order. */
export function visibleDexes(visible: string[] | null | undefined): Dex[] {
  return BASE_DEXES.filter((d) => isOn(d.key, visible));
}

/** The shiny toggles a regular dex shows: its star and, for Caught, the triple star. */
export function shinyToggles(base: Dex, visible: string[] | null | undefined): { kind: "star" | "star3"; dex: Dex }[] {
  const out: { kind: "star" | "star3"; dex: Dex }[] = [];
  if (base.shinyKey && isOn(base.shinyKey, visible)) out.push({ kind: "star", dex: dexByKey(base.shinyKey)! });
  if (base.shiny3Key && isOn(base.shiny3Key, visible)) out.push({ kind: "star3", dex: dexByKey(base.shiny3Key)! });
  return out;
}
