// Ties Leek Duck's Pokémon to RepDex rows: by image name first (pm393.cHALLOWEEN_2021_NOEVOLVE.icon.png,
// pokemon_icon_355_00.png), then by name ("Alolan Vulpix", "Zubat wearing a top hat").

export interface Row {
  id: string;
  species: number;
  name: string;
  alt_name: string | null;
  form_type: string;
  image_regular: string | null;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/♀/g, "f").replace(/♂/g, "m").replace(/[^a-z0-9]/g, "");

const REGIONAL: Record<string, string> = { alolan: "ALOLA", galarian: "GALARIAN", hisuian: "HISUIAN", paldean: "PALDEA" };

export function makeMatcher(allRows: (Row & { gender_of?: string | null })[]) {
  // Female twins (<id>_g2) share their original's image and names; events match the original.
  const rows = allRows.filter((r) => !r.gender_of);
  const byImage = new Map(rows.filter((r) => r.image_regular).map((r) => [r.image_regular!, r]));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const bySpecies = new Map<number, Row[]>();
  const speciesByName = new Map<string, number>();
  for (const r of rows) {
    bySpecies.set(r.species, [...(bySpecies.get(r.species) ?? []), r]);
    if (r.form_type === "Regular" || !speciesByName.has(norm(r.name))) speciesByName.set(norm(r.name), r.species);
  }
  // "Minior (Red Core)", "Zacian (Crowned Sword)": RepDex display names.
  const byAltName = new Map<string, Row>();
  for (const r of rows) if (r.alt_name && !byAltName.has(norm(r.alt_name))) byAltName.set(norm(r.alt_name), r);
  const regularOf = (nr: number) => {
    const list = (bySpecies.get(nr) ?? []).filter((r) => r.form_type === "Regular");
    return list.length === 1 ? list[0] : null;
  };

  return function match(name: string, image: string | null): { species: number | null; row: Row | null } {
    const file = image?.split("/").pop()?.replace(/_shiny(?=\.png$)/, "").replace(/\.s\.icon\.png$/, ".icon.png") ?? "";
    const byName = byAltName.get(norm(name));
    if (byName) return { species: byName.species, row: byName };
    // RepDex uses the same asset names.
    let m = file.match(/^pm(\d+)\.([A-Za-z0-9_]+)\.icon\.png$/);
    if (m) {
      const nr = Number(m[1]);
      const row = byImage.get(`pm${nr}.${m[2]}.icon.png`) ?? byId.get(`${String(nr).padStart(4, "0")}_${m[2]}`) ?? null;
      return { species: nr, row };
    }
    m = file.match(/^pm(\d+)\.icon\.png$/);
    if (m) return { species: Number(m[1]), row: regularOf(Number(m[1])) };
    m = file.match(/^pokemon_icon_(\d+)_(\d+)/);
    let nr: number | null = m ? Number(m[1]) : null;
    const plainForm = m ? m[2] === "00" : true;

    // From the name: the longest run of words that is a species name.
    const words = name.replace(/\(.*?\)/g, " ").split(/\s+/).filter(Boolean);
    let at = -1;
    let span = 0;
    if (nr == null) {
      for (let i = 0; i < words.length && nr == null; i++) {
        for (let j = Math.min(words.length, i + 3); j > i; j--) {
          const s = speciesByName.get(norm(words.slice(i, j).join(" ")));
          if (s) { nr = s; at = i; span = j - i; break; }
        }
      }
    }
    if (nr == null) return { species: null, row: null };
    const lower = name.toLowerCase();
    // Mega / Gigantamax: the species' row of that type ("Mega Charizard Y" picks the Y row).
    const special = /^mega\b/.test(lower) ? "Mega" : /^gigantamax\b/.test(lower) ? "Gigantamax" : null;
    if (special) {
      let list = (bySpecies.get(nr) ?? []).filter((r) => r.form_type === special);
      const xy = lower.match(/\b([xy])$/)?.[1]?.toUpperCase();
      if (xy) list = list.filter((r) => r.id.endsWith(`_${xy}`));
      return { species: nr, row: list.length === 1 ? list[0] : null };
    }
    if (/\bwearing\b|\bcostume\b/.test(lower)) return { species: nr, row: null }; // costume: matched later
    const regional = Object.keys(REGIONAL).find((w) => lower.includes(w));
    if (regional) {
      const row = (bySpecies.get(nr) ?? []).find((r) => r.form_type === "Regional" && r.id.includes(REGIONAL[regional])) ?? null;
      return { species: nr, row };
    }
    // Extra words around the species name mean a form we can't tell yet.
    const extra = at >= 0 && words.some((w, i) => (i < at || i >= at + span) && !/^(shadow|dynamax|mega|gigantamax)$/i.test(w));
    if (!plainForm || extra) return { species: nr, row: null };
    return { species: nr, row: regularOf(nr) };
  };
}
