import Link from "next/link";
import { notFound } from "next/navigation";
import { FORM_TYPES, POKEMON_FIELDS, requireAdmin } from "@/lib/admin";
import { getGens } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { deletePokemon } from "../../actions";
import { DeleteButton } from "../delete-button";
import { PokemonForm } from "../pokemon-form";

export const dynamic = "force-dynamic";

export default async function EditPokemon({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const [{ id: rawId }, { saved, error }] = await Promise.all([params, searchParams]);
  const id = decodeURIComponent(rawId);
  const supabase = await createClient();
  const [{ data }, gens] = await Promise.all([supabase.from("pokemon").select("*").eq("id", id).maybeSingle(), getGens()]);
  if (!data) notFound();

  return (
    <>
      <p className="back"><Link href="/admin/pokemon">← Pokémon</Link></p>
      <div className="dex-head">
        <h1>{data.alt_name || data.name}</h1>
        <span className="count mono">{id}</span>
        <span className="admin-actions">
          <Link className="btn ghost" href={`/pokemon/${data.species}`}>View in app</Link>
          <Link className="btn ghost" href={`/admin/pokemon/new?copy=${encodeURIComponent(id)}`}>Copy as new</Link>
        </span>
      </div>
      {error && <p className="msg error" role="alert">{error}</p>}
      <PokemonForm
        key={id}
        fields={POKEMON_FIELDS}
        formTypes={FORM_TYPES}
        gens={gens.map((g) => ({ gen_nr: g.gen_nr, region: g.region }))}
        values={data}
        originalId={id}
        initialMessage={saved ? "Saved." : undefined}
      />
      <section className="panel danger-zone">
        <h2>Delete</h2>
        <p className="note">Deleting removes this entry from every dex and deletes all users&apos; ticks for it. This can&apos;t be undone.</p>
        <DeleteButton action={deletePokemon} id={id} name={String(data.alt_name || data.name)} />
      </section>
    </>
  );
}
