import { redirect } from "next/navigation";
import { DEX_ICON } from "@/lib/dex-icons";
import { DEXES, canWant, collectible, dexRows, isOn, statusOf, today, type Dex } from "@/lib/dexes";
import { getGens, getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";
import { FullTable, type Column, type Row } from "./full-table";

export const dynamic = "force-dynamic";

/** Icon shown in a column header: the dex's own icon, a star for shiny dexes, else the checkmark. */
const columnIcon = (d: Dex): Column["icon"] =>
  d.key === "shiny3" ? "star3" : DEX_ICON[d.key] ?? (d.shiny ? "star" : "check");

/** Dexes in page order, each followed by its shiny dexes (Caught, Shiny, Shiny ⭐⭐⭐, Lucky, …). */
function columnOrder(): Dex[] {
  const out: Dex[] = [];
  const add = (d: Dex) => {
    if (out.includes(d)) return;
    out.push(d);
    for (const s of DEXES.filter((x) => x.shinyOf === d.key)) add(s);
    for (const k of d.peers ?? []) add(DEXES.find((x) => x.key === k)!);
  };
  for (const d of DEXES) if (!d.shinyOf && !d.mergedInto) add(d);
  return out;
}

/**
 * Full collection: every switched-on dex side by side, one row per species. A cell is one tick for
 * the usual dexes, and a count for dexes where every form counts (Mega, Gigantamax, Dynamax,
 * Costume/Event).
 */
export default async function FullCollectionPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const [{ lang, t }, all, gens, ticks] = await Promise.all([getDict(), getPokemon(), getGens(), getTicks()]);
  const day = today();
  const ticksBy = byDex(ticks);

  const dexes = columnOrder().filter((d) => isOn(d.key, profile.visible_dexes));
  const columns: Column[] = dexes.map((d) => ({ key: d.key, name: d.name[lang], icon: columnIcon(d), counts: !!d.everyRow }));

  // Released, collectible rows of each dex, by species.
  const bySpecies = dexes.map((d) => {
    const m = new Map<number, string[]>();
    for (const p of dexRows(all, d)) {
      if (!collectible(p) || statusOf(p, d, day) !== "available") continue;
      const list = m.get(p.species) ?? [];
      list.push(p.id);
      m.set(p.species, list);
    }
    return m;
  });

  // Species are shown by their regular form, under their original generation.
  const speciesGen = new Map<number, number>();
  const rep = new Map<number, (typeof all)[number]>();
  for (const p of [...all].sort((a, b) => a.sort_order - b.sort_order)) {
    speciesGen.set(p.species, Math.min(speciesGen.get(p.species) ?? Infinity, p.gen_nr));
    const cur = rep.get(p.species);
    if (!cur || (cur.form_type !== "Regular" && p.form_type === "Regular")) rep.set(p.species, p);
  }

  const rows: Row[] = [];
  for (const no of [...rep.keys()].sort((a, b) => a - b)) {
    const cells: Row["cells"] = dexes.map((d, i) => {
      const ids = bySpecies[i].get(no);
      if (!ids) return null;
      const dt = ticksBy.get(d.key);
      const done = ids.filter((id) => dt?.get(id)?.collected).length;
      const wanted = canWant(d.key) && ids.some((id) => dt?.get(id)?.wanted);
      return d.everyRow ? [done, ids.length, wanted ? 1 : 0] : [done > 0 ? 1 : 0, 1, wanted ? 1 : 0];
    });
    if (cells.every((c) => c === null)) continue;
    const p = rep.get(no)!;
    rows.push({ no, name: p.name, image: p.image_regular, gen: speciesGen.get(no) ?? p.gen_nr, cells });
  }

  return (
    <FullTable
      title={t.fullCollection}
      columns={columns}
      rows={rows}
      gens={gens.map((g) => ({ gen_nr: g.gen_nr, region: g.region }))}
      userId={profile.id}
      initialHidden={profile.full_hidden ?? []}
      t={t}
    />
  );
}
