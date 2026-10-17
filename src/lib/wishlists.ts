// Wishlists: what the user is missing in a few dexes, with a Pokémon GO search phrase that a
// trading partner can paste to find matching Pokémon in their own storage.
import { collectible, dexByKey, dexEntries, displayName, femaleEntries, missing, speciesName, type Pokemon, type Tick } from "./dexes";
import type { Lang } from "./i18n";

export interface WishlistDef {
  key: string;
  name: { en: string; sv: string; ja: string };
  /** Dexes whose missing entries make up the list (Caught + Lucky share one list). */
  dexes: string[];
  /** Search phrase before the numbers, for an English game. */
  prefix: string;
  /**
   * The same for a Japanese game. Keywords from Niantic's Japanese help page on searching
   * (色違い shiny, こうかん traded, xxs/xxl, だいまっくす, きょだいまっくす, とくべつ event/costume).
   */
  prefixJa: string;
  /** Show shiny images. */
  shiny: boolean;
  /** "Show only lowest evolution" applies (forms that come from evolving keep the dex's trait). */
  evolves: boolean;
  /** Leave out rows that can't be traded (dex_lucky = false: mythicals, Zygarde, fused forms…). */
  tradeableOnly: boolean;
}

/** In display order. The keys are what profiles.public_wishlists stores. */
export const WISHLISTS: WishlistDef[] = [
  { key: "caught", name: { en: "Caught + Lucky", sv: "Fångade + Lucky", ja: "捕獲 + キラ" }, dexes: ["caught", "lucky"], prefix: "!traded&", prefixJa: "!こうかん&", shiny: false, evolves: true, tradeableOnly: true },
  { key: "shiny", name: { en: "Shiny", sv: "Shiny", ja: "色違い" }, dexes: ["shiny"], prefix: "shiny&!traded&", prefixJa: "色違い&!こうかん&", shiny: true, evolves: true, tradeableOnly: true },
  { key: "xxs", name: { en: "XXS", sv: "XXS", ja: "XXS" }, dexes: ["xxs"], prefix: "xxs&!traded&", prefixJa: "xxs&!こうかん&", shiny: false, evolves: true, tradeableOnly: true },
  { key: "xxl", name: { en: "XXL", sv: "XXL", ja: "XXL" }, dexes: ["xxl"], prefix: "xxl&!traded&", prefixJa: "xxl&!こうかん&", shiny: false, evolves: true, tradeableOnly: true },
  { key: "gigantamax", name: { en: "Gigantamax", sv: "Gigantamax", ja: "キョダイマックス" }, dexes: ["gigantamax"], prefix: "gigantamax&!traded&", prefixJa: "きょだいまっくす&!こうかん&", shiny: false, evolves: false, tradeableOnly: true },
  { key: "dynamax", name: { en: "Dynamax", sv: "Dynamax", ja: "ダイマックス" }, dexes: ["dynamax"], prefix: "dynamax&!traded&", prefixJa: "だいまっくす&!こうかん&", shiny: false, evolves: true, tradeableOnly: true },
  { key: "costumes", name: { en: "Costume/Event", sv: "Kostym/Event", ja: "コスチューム/イベント" }, dexes: ["costumes"], prefix: "costume&!traded&", prefixJa: "とくべつ&!こうかん&", shiny: false, evolves: false, tradeableOnly: true },
  { key: "costumes_shiny", name: { en: "Costume/Event shiny", sv: "Kostym/Event shiny", ja: "コスチューム/イベント色違い" }, dexes: ["costumes_shiny"], prefix: "costume&shiny&!traded&", prefixJa: "とくべつ&色違い&!こうかん&", shiny: true, evolves: false, tradeableOnly: true },
];

export const WISHLIST_KEYS = WISHLISTS.map((w) => w.key);

/** The lists for a user: with Shiny ⭐⭐⭐ switched on, the Shiny list also covers missing 3-star shinies. */
export function wishlistDefs(shiny3: boolean): WishlistDef[] {
  if (!shiny3) return WISHLISTS;
  return WISHLISTS.map((w) =>
    w.key === "shiny"
      ? { ...w, dexes: ["shiny", "shiny3"], name: { en: "Shiny + Shiny ⭐⭐⭐", sv: "Shiny + Shiny ⭐⭐⭐", ja: "色違い + 色違い ⭐⭐⭐" } }
      : w);
}

export interface WishItem {
  id: string; no: number; name: string; image: string | null; gender?: "♂" | "♀";
  /** The dexes it's missing in, in list order (two on Caught + Lucky and Shiny + ⭐⭐⭐). */
  dexes?: string[];
}
/** search: the phrase for an English game; searchJa: the same for a Japanese game. */
export interface Wishlist { key: string; name: string; search: string; searchJa: string; items: WishItem[] }

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
  def: WishlistDef, all: Pokemon[], ticks: Map<string, Map<string, Tick>>, day: string, lang: Lang,
  lowestOnly = false,
  /** Dexes with All forms on: each missing form is listed instead of each species. */
  allFormsFor: (dexKey: string) => boolean = () => false,
  /** Dexes with gender tracked: female twins by original ID (each gender is listed when missing), else null. */
  twinsFor: (dexKey: string) => Map<string, Pokemon> | null = () => null,
): Wishlist {
  const items = new Map<string, WishItem>();
  // Evolution family (per gender) and stage of each item, for "lowest evolution" below.
  const evo = new Map<string, { family: string; stage: number }>();
  for (const key of def.dexes) {
    const dex = dexByKey(key)!;
    const perForm = !!dex.everyRow || allFormsFor(key);
    const twins = twinsFor(key);
    const entries = dexEntries(all, dex, perForm, day);
    const dt = ticks.get(key) ?? new Map();
    // With gender tracked, the ♂ side (the original rows) and the ♀ side (their twins) are listed on their own.
    const sides: { list: typeof entries; gender?: "♂" | "♀" }[] = twins
      ? [{ list: entries, gender: "♂" }, { list: femaleEntries(entries, twins), gender: "♀" }]
      : [{ list: entries }];
    for (const side of sides)
    for (const e of missing(side.list, dex, dt, day)) {
      const p = e.rows.find((r) => collectible(r) && (!def.tradeableOnly || r.dex_lucky));
      if (!p) continue;
      // Keyed by row, so Caught (per form) and Lucky (per species) don't list the same Pokémon twice.
      const id = p.id;
      const have = items.get(id);
      if (have) {
        if (!have.dexes!.includes(key)) have.dexes!.push(key);
        continue;
      }
      // Only Pokémon that come in both genders get a ♂/♀ mark.
      const gender = side.gender === "♀" || (side.gender === "♂" && twins?.has(p.id)) ? side.gender : undefined;
      items.set(id, {
        id,
        no: p.species,
        name: perForm ? displayName(p, lang) : speciesName(e.pokemon, lang),
        image: (def.shiny ? p.image_shiny : null) ?? p.image_regular,
        ...(gender ? { gender } : {}),
        dexes: [key],
      });
      const evolving = p.form_type === "Regular" || p.form_type === "Form" || (p.form_type === "Gender" && !!p.gender_of);
      if (def.evolves && p.family != null && evolving) {
        evo.set(id, { family: `${p.family}${gender === "♀" ? "f" : ""}`, stage: p.stage ?? 9 });
      }
    }
  }
  // Lowest evolution: of the missing members of a family (regular forms and Form rows), keep
  // only those at the lowest missing stage, since the others can be evolved from them (keeping
  // shiny, size, Dynamax…). Missing only Venusaur still shows Venusaur; missing Ivysaur and
  // Venusaur shows just Ivysaur; split evolutions at the same stage (Flapple, Appletun) all stay.
  if (lowestOnly && def.evolves) {
    const minStage = new Map<string, number>();
    for (const x of evo.values()) minStage.set(x.family, Math.min(minStage.get(x.family) ?? Infinity, x.stage));
    for (const [id, x] of evo) if (x.stage > minStage.get(x.family)!) items.delete(id);
  }
  const list = [...items.values()].sort((a, b) => a.no - b.no || a.name.localeCompare(b.name) || (a.gender ?? "").localeCompare(b.gender ?? ""));
  return {
    key: def.key,
    name: def.name[lang],
    search: list.length ? `${def.prefix}${numberList(list.map((i) => i.no))}` : "",
    searchJa: list.length ? `${def.prefixJa}${numberList(list.map((i) => i.no))}` : "",
    items: list,
  };
}
