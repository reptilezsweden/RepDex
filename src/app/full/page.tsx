import { redirect } from "next/navigation";
import { columnIcon, columnOrder } from "@/lib/dex-columns";
import { canWant, collectible, dexRows, genderOn, isOn, speciesName, statusOf, today, twinsOf } from "@/lib/dexes";
import { getGens, getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";
import { FullTable, type Column, type Row } from "./full-table";

export const dynamic = "force-dynamic";

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
  // Gender tracked: a species counts ♂ and ♀ (shown as 1/2, 2/2).
  const twins = twinsOf(all);
  const gendered = dexes.map((d) => genderOn(d.key, profile));
  const columns: Column[] = dexes.map((d, i) => ({ key: d.key, name: d.name[lang], icon: columnIcon(d), counts: !!d.everyRow || gendered[i] }));

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
      const fIds = gendered[i] ? ids.map((id) => twins.get(id)?.id).filter((x): x is string => !!x) : [];
      const on = (id: string) => !!dt?.get(id)?.collected;
      const wanted = canWant(d.key) && [...ids, ...fIds].some((id) => dt?.get(id)?.wanted);
      if (d.everyRow) {
        const every = [...ids, ...fIds];
        return [every.filter(on).length, every.length, wanted ? 1 : 0];
      }
      const done = (ids.some(on) ? 1 : 0) + (fIds.some(on) ? 1 : 0);
      return [done, fIds.length ? 2 : 1, wanted ? 1 : 0];
    });
    if (cells.every((c) => c === null)) continue;
    const p = rep.get(no)!;
    rows.push({ no, name: speciesName(p, lang), image: p.image_regular, gen: speciesGen.get(no) ?? p.gen_nr, cells });
  }

  return (
    <FullTable
      title={t.fullCollection}
      columns={columns}
      rows={rows}
      gens={gens.map((g) => ({ gen_nr: g.gen_nr, region: g.region }))}
      userId={profile.id}
      initialHidden={profile.full_hidden ?? []}
      initialShow={profile.show_filter ?? "all"}
      t={t}
    />
  );
}
