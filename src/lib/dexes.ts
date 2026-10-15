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
  family: number | null;
  /** Evolution stage within the family: 1 for the lowest (babies included). */
  stage?: number | null;
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
  /** Always shows every row (no species grouping, no All forms version): Mega, Gigantamax, Dynamax, Costume/Event. */
  everyRow?: boolean;
  /** Set on shiny dexes: the regular dex whose pages show it as a star toggle. */
  shinyOf?: string;
  /** Set on regular dexes: the shiny dex shown as a single star. */
  shinyKey?: string;
  /** Set on Caught: the Shiny ⭐⭐⭐ dex shown as a triple star. */
  shiny3Key?: string;
  /** Tracked in RepDex only; Pokémon GO has no such dex. */
  notInGame?: boolean;
  /** Dexes shown on this dex's page as a tick of their own (XXS on XXL, Purified on Shadow). */
  peers?: string[];
  /** Set on those dexes: the dex whose page they are shown on. */
  mergedInto?: string;
  /** Name of the combined page, when it has peers. */
  groupName?: { en: string; sv: string };
}

const caught = (p: Pokemon) => p.dex_caught;
const formType = (...types: FormType[]) => (p: Pokemon) => types.includes(p.form_type);
const dynamaxForms = formType("Regular", "Regional", "Gender", "Form");

export const DEXES: Dex[] = [
  { key: "caught", name: { en: "Caught", sv: "Fångade" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  // Shiny has a page of its own, with Shiny ⭐⭐⭐ as its triple star; both follow Caught.
  { key: "shiny", name: { en: "Shiny", sv: "Shiny" }, includes: caught, dateField: "release_shiny", defaultOn: true, shiny: true, shiny3Key: "shiny3" },
  { key: "shiny3", name: { en: "Shiny ⭐⭐⭐", sv: "Shiny ⭐⭐⭐" }, includes: caught, dateField: "release_shiny", defaultOn: false, shiny: true, shinyOf: "shiny", notInGame: true },
  { key: "lucky", name: { en: "Lucky", sv: "Lucky" }, includes: (p) => p.dex_lucky && p.dex_caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "xxl", name: { en: "XXL", sv: "XXL" }, includes: caught, dateField: "released", defaultOn: true, shiny: false, peers: ["xxs"], groupName: { en: "XXL/XXS", sv: "XXL/XXS" } },
  { key: "xxs", name: { en: "XXS", sv: "XXS" }, includes: caught, dateField: "released", defaultOn: true, shiny: false, mergedInto: "xxl" },
  { key: "gigantamax", name: { en: "Gigantamax", sv: "Gigantamax" }, includes: formType("Gigantamax"), dateField: "released", defaultOn: true, shiny: false, everyRow: true, shinyKey: "gigantamax_shiny" },
  { key: "mega", name: { en: "Mega", sv: "Mega" }, includes: formType("Mega"), dateField: "released", defaultOn: true, shiny: false, everyRow: true, shinyKey: "mega_shiny" },
  { key: "shadow", name: { en: "Shadow", sv: "Shadow" }, includes: caught, dateField: "release_shadow", defaultOn: true, shiny: false, shinyKey: "shadow_shiny", peers: ["purified"], groupName: { en: "Shadow/Purified", sv: "Shadow/Purified" } },
  { key: "purified", name: { en: "Purified", sv: "Purified" }, includes: caught, dateField: "release_shadow", defaultOn: true, shiny: false, shinyKey: "purified_shiny", mergedInto: "shadow" },
  { key: "perfect", name: { en: "100%", sv: "100%" }, includes: caught, dateField: "released", defaultOn: true, shiny: false },
  { key: "dynamax", name: { en: "Dynamax", sv: "Dynamax" }, includes: dynamaxForms, dateField: "release_dynamax", defaultOn: false, shiny: false, hideWithoutDate: true, everyRow: true, shinyKey: "dynamax_shiny", notInGame: true },
  { key: "costumes", name: { en: "Costume/Event", sv: "Kostym/Event" }, includes: formType("Costume"), dateField: "released", defaultOn: false, shiny: false, everyRow: true, shinyKey: "costumes_shiny", notInGame: true },

  // Shiny dexes: ticked with a star on their regular dex's pages, not shown as dexes of their own.
  { key: "shadow_shiny", name: { en: "Shadow shiny", sv: "Shadow shiny" }, includes: caught, dateField: "release_shadow_shiny", defaultOn: true, shiny: true, shinyOf: "shadow" },
  { key: "purified_shiny", name: { en: "Purified shiny", sv: "Purified shiny" }, includes: caught, dateField: "release_shadow_shiny", defaultOn: true, shiny: true, shinyOf: "purified" },
  { key: "mega_shiny", name: { en: "Mega shiny", sv: "Mega shiny" }, includes: formType("Mega"), dateField: "release_shiny", defaultOn: true, shiny: true, everyRow: true, shinyOf: "mega" },
  { key: "gigantamax_shiny", name: { en: "Gigantamax shiny", sv: "Gigantamax shiny" }, includes: formType("Gigantamax"), dateField: "release_shiny", defaultOn: true, shiny: true, everyRow: true, shinyOf: "gigantamax" },
  { key: "dynamax_shiny", name: { en: "Dynamax shiny", sv: "Dynamax shiny" }, includes: dynamaxForms, dateField: "release_dynamax_shiny", defaultOn: true, shiny: true, hideWithoutDate: true, everyRow: true, shinyOf: "dynamax", notInGame: true },
  { key: "costumes_shiny", name: { en: "Costume/Event shiny", sv: "Kostym/Event shiny" }, includes: formType("Costume"), dateField: "release_shiny", defaultOn: true, shiny: true, everyRow: true, shinyOf: "costumes", notInGame: true },
];

/** Regular dexes, i.e. the ones with their own page. */
export const BASE_DEXES = DEXES.filter((d) => !d.shinyOf);
/** Shiny dexes switched together by the "Show shiny" setting (Shiny ⭐⭐⭐ has its own setting). */
export const SHINY_KEYS = DEXES.filter((d) => d.shiny && d.key !== "shiny3").map((d) => d.key);
export const ALWAYS_ON = "caught";
/**
 * How dexes are grouped in the settings: one switch for each group's visibility and one for its
 * All forms version. Dexes that always show every row have no All forms switch.
 */
export const SETTING_GROUPS: { keys: string[]; name: { en: string; sv: string } }[] = [
  { keys: ["caught"], name: { en: "Caught", sv: "Fångade" } },
  { keys: ["lucky"], name: { en: "Lucky", sv: "Lucky" } },
  { keys: ["xxl", "xxs"], name: { en: "XXL/XXS", sv: "XXL/XXS" } },
  { keys: ["gigantamax"], name: { en: "Gigantamax", sv: "Gigantamax" } },
  { keys: ["mega"], name: { en: "Mega", sv: "Mega" } },
  { keys: ["shadow", "purified"], name: { en: "Shadow/Purified", sv: "Shadow/Purified" } },
  { keys: ["perfect"], name: { en: "100%", sv: "100%" } },
  { keys: ["dynamax"], name: { en: "Dynamax", sv: "Dynamax" } },
  { keys: ["costumes"], name: { en: "Costume/Event", sv: "Kostym/Event" } },
];

/** Whether the user has the All forms version of a dex switched on. */
export function allFormsOn(key: string, profile: { all_forms_dexes?: string[] | null; all_forms?: boolean }): boolean {
  const d = dexByKey(key);
  if (!d || d.everyRow) return false;
  // Shiny and Shiny ⭐⭐⭐ follow Caught's All forms choice.
  if (key === "shiny" || key === "shiny3") key = "caught";
  // Before migration 0007 there was one switch for every dex.
  if (!profile.all_forms_dexes) return !!profile.all_forms;
  return profile.all_forms_dexes.includes(key);
}

/** Dexes without the wanted (puzzle piece) feature. */
export const NO_WANTED = ["shadow", "purified", "shadow_shiny", "purified_shiny"];
export const canWant = (dex: string) => !NO_WANTED.includes(dex);

/** Dexes that follow Caught: ticking one also ticks Caught, and unticking Caught unticks them. */
export const CAUGHT_LINKED = ["shiny", "shiny3", "lucky", "xxl", "xxs", "perfect"];

export const dexByKey = (key: string) => DEXES.find((d) => d.key === key);

/** The dex whose page shows a dex: itself, or the page it's merged into (shiny dexes via their regular dex). */
export function pageDexOf(key: string): Dex | undefined {
  let d = dexByKey(key);
  if (d?.shinyOf) d = dexByKey(d.shinyOf);
  if (d?.mergedInto) d = dexByKey(d.mergedInto);
  return d;
}

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
/** Battle-only forms are shown for completeness but can't be ticked or counted. */
export const collectible = (p: Pokemon) => p.form_type !== "Battle-Only Form";

export function progress(entries: Entry[], dex: Dex, ticks: Map<string, Tick>, day: string) {
  let total = 0;
  let done = 0;
  for (const e of entries) {
    if (e.status !== "available") continue;
    const rows = e.rows.filter((r) => collectible(r) && statusOf(r, dex, day) === "available");
    if (rows.length === 0) continue;
    total++;
    if (rows.some((r) => ticks.get(r.id)?.collected)) done++;
  }
  return { done, total };
}

/** Missing list: available entries not collected, plus collected entries marked wanted. */
export function missing(entries: Entry[], dex: Dex, ticks: Map<string, Tick>, day: string): Entry[] {
  return entries.filter((e) => {
    if (e.status !== "available") return false;
    const avail = e.rows.filter((r) => statusOf(r, dex, day) === "available");
    const collected = avail.some((r) => ticks.get(r.id)?.collected);
    const wanted = canWant(dex.key) && avail.some((r) => ticks.get(r.id)?.wanted);
    return !collected || wanted;
  });
}

export const DATE_FIELDS: DateField[] = [
  "released", "release_shiny", "release_shadow", "release_shadow_shiny", "release_dynamax", "release_dynamax_shiny",
];

export interface Upcoming {
  date: string;
  /** forms: every form of the species this item stands for (set when more than one). */
  items: { pokemon: Pokemon; type: DateField; withShiny?: boolean; forms?: Pokemon[] }[];
}

/** The regular release a shiny date belongs to. */
const SHINY_BASE: Partial<Record<DateField, DateField>> = {
  release_shiny: "released",
  release_shadow_shiny: "release_shadow",
  release_dynamax_shiny: "release_dynamax",
};
/** The shiny date belonging to a regular release. */
const SHINY_FIELD = Object.fromEntries(Object.entries(SHINY_BASE).map(([s, b]) => [b, s])) as Partial<Record<DateField, DateField>>;

/**
 * Every release date after today, grouped by date, soonest first. When a form and its shiny come
 * out on the same date they are one item, marked withShiny.
 */
export function upcomingReleases(all: Pokemon[], day: string): Upcoming[] {
  return releasesWhere(all, (d) => d > day);
}

/** Releases from the last `days` days up to and including `day`, newest first. */
export function recentReleases(all: Pokemon[], day: string, days = 14): Upcoming[] {
  const from = new Date(Date.parse(`${day}T00:00:00Z`) - days * 86400_000).toISOString().slice(0, 10);
  return releasesWhere(all, (d) => d > from && d <= day).reverse();
}

/** Release dates matching `keep`, grouped by date (oldest first) in the upcoming-list format. */
function releasesWhere(all: Pokemon[], keep: (date: string) => boolean): Upcoming[] {
  const byDate = new Map<string, Upcoming["items"]>();
  for (const p of all) {
    for (const f of DATE_FIELDS) {
      const d = p[f];
      if (!d || !keep(d)) continue;
      const base = SHINY_BASE[f];
      if (base && p[base] === d) continue; // Shown with its regular release.
      const list = byDate.get(d) ?? [];
      list.push({ pokemon: p, type: f, ...(SHINY_FIELD[f] && p[SHINY_FIELD[f]!] === d ? { withShiny: true } : {}) });
      byDate.set(d, list);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => {
      items.sort((a, b) => a.pokemon.sort_order - b.pokemon.sort_order || DATE_FIELDS.indexOf(a.type) - DATE_FIELDS.indexOf(b.type));
      // Several forms of one species with the same kind of release that day become one item.
      const grouped = new Map<string, Upcoming["items"][number]>();
      for (const it of items) {
        const key = `${it.pokemon.species}|${it.type}|${it.withShiny ? 1 : 0}`;
        const first = grouped.get(key);
        if (first) first.forms = [...(first.forms ?? [first.pokemon]), it.pokemon];
        else grouped.set(key, { ...it });
      }
      return { date, items: [...grouped.values()] };
    });
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

/** Dex pages to list: one per dex or combined dex (XXL/XXS, Shadow/Purified) that is switched on. */
export function pageDexes(visible: string[] | null | undefined): Dex[] {
  return BASE_DEXES.filter((d) => !d.mergedInto && [d.key, ...(d.peers ?? [])].some((k) => isOn(k, visible)));
}

/** The shiny toggles a regular dex shows: its star and, for Caught, the triple star. */
export function shinyToggles(base: Dex, visible: string[] | null | undefined): { kind: "star" | "star3"; dex: Dex }[] {
  const out: { kind: "star" | "star3"; dex: Dex }[] = [];
  if (base.shinyKey && isOn(base.shinyKey, visible)) out.push({ kind: "star", dex: dexByKey(base.shinyKey)! });
  if (base.shiny3Key && isOn(base.shiny3Key, visible)) out.push({ kind: "star3", dex: dexByKey(base.shiny3Key)! });
  return out;
}
