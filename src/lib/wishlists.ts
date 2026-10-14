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
}

/** In display order. The keys are what profiles.public_wishlists stores. */
export const WISHLISTS: WishlistDef[] = [
  { key: "caught", name: { en: "Caught + Lucky", sv: "Fångade + Lucky" }, dexes: ["caught", "lucky"], prefix: "!traded&", shiny: false },
  { key: "shiny", name: { en: "Shiny", sv: "Shiny" }, dexes: ["shiny"], prefix: "shiny&!traded&", shiny: true },
  { key: "xxs", name: { en: "XXS", sv: "XXS" }, dexes: ["xxs"], prefix: "xxs&!traded&", shiny: false },
  { key: "xxl", name: { en: "XXL", sv: "XXL" }, dexes: ["xxl"], prefix: "xxl&!traded&", shiny: false },
  { key: "gigantamax", name: { en: "Gigantamax", sv: "Gigantamax" }, dexes: ["gigantamax"], prefix: "gigantamax&!traded&", shiny: false },
  { key: "dynamax", name: { en: "Dynamax", sv: "Dynamax" }, dexes: ["dynamax"], prefix: "dynamax&!traded&", shiny: false },
  { key: "costumes", name: { en: "Costume/Event", sv: "Kostym/Event" }, dexes: ["costumes"], prefix: "costume&!traded&", shiny: false },
  { key: "costumes_shiny", name: { en: "Costume/Event shiny", sv: "Kostym/Event shiny" }, dexes: ["costumes_shiny"], prefix: "costume&shiny&!traded&", shiny: true },
];

export const WISHLIST_KEYS = WISHLISTS.map((w) => w.key);

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
): Wishlist {
  const items = new Map<string, WishItem>();
  for (const key of def.dexes) {
    const dex = dexByKey(key)!;
    for (const e of missing(dexEntries(all, dex, false, day), dex, ticks.get(key) ?? new Map(), day)) {
      const p = e.rows.find(collectible);
      if (!p) continue;
      const id = dex.everyRow ? p.id : `s${p.species}`;
      if (items.has(id)) continue;
      items.set(id, {
        id,
        no: p.species,
        name: dex.everyRow ? displayName(p) : e.pokemon.name,
        image: (def.shiny ? p.image_shiny : null) ?? p.image_regular,
      });
    }
  }
  const list = [...items.values()].sort((a, b) => a.no - b.no || a.name.localeCompare(b.name));
  return {
    key: def.key,
    name: def.name[lang],
    search: list.length ? `${def.prefix}${numberList(list.map((i) => i.no))}` : "",
    items: list,
  };
}
