import Link from "next/link";
import { FORM_TYPES, POKEMON_FIELDS, requireAdmin } from "@/lib/admin";
import { getGens } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PokemonForm } from "../pokemon-form";

export const dynamic = "force-dynamic";

/** Add a Pokémon. "?copy=<ID>" starts from an existing entry, e.g. for a new costume. */
export default async function NewPokemon({ searchParams }: { searchParams: Promise<{ copy?: string }> }) {
  await requireAdmin();
  const { copy } = await searchParams;
  const supabase = await createClient();
  const [gens, source, last] = await Promise.all([
    getGens(),
    copy ? supabase.from("pokemon").select("*").eq("id", copy).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("pokemon").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const values: Record<string, unknown> = source.data
    ? { ...source.data, id: `${source.data.id}_COPY` }
    : { form_type: "Regular", dex_caught: true, dex_lucky: true };
  values.sort_order = source.data ? Number(source.data.sort_order) : Number(last.data?.sort_order ?? 0) + 1;

  return (
    <>
      <p className="back"><Link href="/admin/pokemon">← Pokémon</Link></p>
      <h1>{source.data ? `Add a copy of ${source.data.alt_name || source.data.name}` : "Add Pokémon"}</h1>
      <p className="note">
        The ID must be unique, e.g. <code>0025_cNEW_EVENT</code>. Sort order decides where it appears; copying an entry
        places the new one right next to it.
      </p>
      <PokemonForm
        fields={POKEMON_FIELDS}
        formTypes={FORM_TYPES}
        gens={gens.map((g) => ({ gen_nr: g.gen_nr, region: g.region }))}
        values={values}
        originalId={null}
      />
    </>
  );
}
