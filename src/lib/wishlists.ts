// Wishlists: what the user is missing in a few dexes, with a Pokémon GO search phrase that a
// trading partner can paste to find matching Pokémon in their own storage.
import { collectible, dexByKey, dexEntries, displayName, missing, type Pokemon, type Tick } from "./dexes";

export interface WishlistDef {
  key: string;
  name: { en: string; sv: string };
  /** Dexes whose missing entries make up the list (Caught + Lucky share one list). */
  dexes: string[];
  /** Search phrase before the numbers. */
  prefix: string;
  /** Show shiny images. */
  shiny: boolean;
  /** "Show only lowest evolution" applies (forms that come from evolving keep the dex's trait). */
  evolves: boolean;
}

/** In display order. The keys are what profiles.public_wishlists stores. */
export const WISHLISTS: WishlistDef[] = [
  { key: "caught", name: { en: "Caught + Lucky", sv: "Fångade + Lucky" }, dexes: ["caught", "lucky"], prefix: "!traded&", shiny: false, evolves: true },
  { key: "shiny", name: { en: "Shiny", sv: "Shiny" }, dexes: ["shiny"], prefix: "shiny&!traded&", shiny: true, evolves: true },
  { key: "xxs", name: { en: "XXS", sv: "XXS" }, dexes: ["xxs"], prefix: "xxs&!traded&", shiny: false, evolves: true },
  { key: "xxl", name: { en: "XXL", sv: "XXL" }, dexes: ["xxl"], prefix: "xxl&!traded&", shiny: false, evolves: true },
  { key: "gigantamax", name: { en: "Gigantamax", sv: "Gigantamax" }, dexes: ["gigantamax"], prefix: "gigantamax&!traded&", shiny: false, evolves: false },
  { key: "dynamax", name: { en: "Dynamax", sv: "Dynamax" }, dexes: ["dynamax"], prefix: "dynamax&!traded&", shiny: false, evolves: true },
  { key: "costumes", name: { en: "Costume/Event", sv: "Kostym/Event" }, dexes: ["costumes"], prefix: "costume&!traded&", shiny: false, evolves: false },
  { key: "costumes_shiny", name: { en: "Costume/Event shiny", sv: "Kostym/Event shiny" }, dexes: ["costumes_shiny"], prefix: "costume&shiny&!traded&", shiny: true, evolves: false },
];

export const WISHLIST_KEYS = WISHLISTS.map((w) => w.key);

/** The lists for a user: with Shiny ⭐⭐⭐ switched on, the Shiny list also covers missing 3-star shinies. */
export function wishlistDefs(shiny3: boolean): WishlistDef[] {
  if (!shiny3) return WISHLISTS;
  return WISHLISTS.map((w) =>
    w.key === "shiny"
      ? { ...w, dexes: ["shiny", "shiny3"], name: { en: "Shiny + Shiny ⭐⭐⭐", sv: "Shiny + Shiny ⭐⭐⭐" } }
      : w);
}

export interface WishItem { id: string; no: number; name: string; image: string | null }
export interface Wishlist { key: string; name: string; search: string; items: WishItem[] }

/** Dex numbers as a Pokémon GO search list, with runs shortened to ranges: 1-3,7,9-11. */
export function numberList(nos: number[]): string {
  const sorted = [...new Set(nos)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i ? `${sorted[i]}-${sorted[j]}` : String(sorted[i]));
    i = j;
  }
  return parts.join(",");
}

/**
 * Missing entries for one wishlist. Dexes that count every form (Gigantamax, Dynamax,
 * Costume/Event) list each missing form; the others list each missing species once.
 */
export function buildWishlist(
  def: WishlistDef, all: Pokemon[], ticks: Map<string, Map<string, Tick>>, day: string, lang: "en" | "sv",
  lowestOnly = false,
  /** Dexes with All forms on: each missing form is listed instead of each species. */
  allFormsFor: (dexKey: string) => boolean = () => false,
): Wishlist {
  const items = new Map<string, WishItem>();
  // Evolution family and stage of each item, for "lowest evolution" below.
  const evo = new Map<string, { family: number; stage: number }>();
  for (const key of def.dexes) {
    const dex = dexByKey(key)!;
    const perForm = !!dex.everyRow || allFormsFor(key);
    for (const e of missing(dexEntries(all, dex, perForm, day), dex, ticks.get(key) ?? new Map(), day)) {
      const p = e.rows.find(collectible);
      if (!p) continue;
      // Keyed by row, so Caught (per form) and Lucky (per species) don't list the same Pokémon twice.
      const id = p.id;
      if (items.has(id)) continue;
      items.set(id, {
        id,
        no: p.species,
        name: perForm ? displayName(p) : e.pokemon.name,
        image: (def.shiny ? p.image_shiny : null) ?? p.image_regular,
      });
      if (def.evolves && p.family != null && (p.form_type === "Regular" || p.form_type === "Form")) {
        evo.set(id, { family: p.family, stage: p.stage ?? 9 });
      }
    }
  }
  // Lowest evolution: of the missing members of a family (regular forms and Form rows), keep
  // only those at the lowest missing stage, since the others can be evolved from them (keeping
  // shiny, size, Dynamax…). Missing only Venusaur still shows Venusaur; missing Ivysaur and
  // Venusaur shows just Ivysaur; split evolutions at the same stage (Flapple, Appletun) all stay.
  if (lowestOnly && def.evolves) {
    const minStage = new Map<number, number>();
    for (const x of evo.values()) minStage.set(x.family, Math.min(minStage.get(x.family) ?? Infinity, x.stage));
    for (const [id, x] of evo) if (x.stage > minStage.get(x.family)!) items.delete(id);
  }
  const list = [...items.values()].sort((a, b) => a.no - b.no || a.name.localeCompare(b.name));
  return {
    key: def.key,
    name: def.name[lang],
    search: list.length ? `${def.prefix}${numberList(list.map((i) => i.no))}` : "",
    items: list,
  };
}
