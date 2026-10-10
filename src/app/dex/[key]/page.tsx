import { notFound, redirect } from "next/navigation";
import { dexByKey, dexEntries, displayName, statusOf, today } from "@/lib/dexes";
import { getGens, getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { getTicks } from "@/lib/ticks";
import { DexGrid, type Card } from "./dex-grid";

export const dynamic = "force-dynamic";

export default async function DexPage({
  params, searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ forms?: string }>;
}) {
  const [{ key }, { forms }] = await Promise.all([params, searchParams]);
  const dex = dexByKey(key);
  if (!dex) notFound();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const allForms = forms === "all" && profile.all_forms && !dex.everyRow;
  const [{ lang, t }, all, gens, ticks] = await Promise.all([getDict(), getPokemon(), getGens(), getTicks(dex.key)]);
  const day = today();

  // Forms are grouped under their species' original generation (e.g. Alolan Rattata under Kanto).
  const speciesGen = new Map<number, number>();
  for (const p of all) speciesGen.set(p.species, Math.min(speciesGen.get(p.species) ?? Infinity, p.gen_nr));

  const cards: Card[] = dexEntries(all, dex, allForms, day).map((e) => {
    const p = e.pokemon;
    return {
      id: p.id,
      no: p.species,
      name: allForms || dex.everyRow ? displayName(p) : p.name,
      gen: speciesGen.get(p.species) ?? p.gen_nr,
      image: dex.shiny ? p.image_shiny : p.image_regular,
      status: e.status,
      date: p[dex.dateField],
      // Rows a tap on this card can tick: the available ones behind it.
      rows: e.rows.filter((r) => statusOf(r, dex, day) === "available").map((r) => r.id),
    };
  });
  cards.sort((a, b) => a.no - b.no);

  return (
    <DexGrid
      dexKey={dex.key}
      title={`${dex.name[lang]}${allForms ? ` · ${t.allForms}` : ""}`}
      cards={cards}
      gens={gens.map((g) => ({ gen_nr: g.gen_nr, region: g.region }))}
      initialTicks={ticks.map(({ pokemon_id, collected, wanted }) => ({ pokemon_id, collected, wanted }))}
      userId={profile.id}
      initialShowUnavailable={profile.show_unavailable ?? true}
      canSwitchForms={profile.all_forms && !dex.everyRow}
      allForms={allForms}
      t={t}
    />
  );
}
