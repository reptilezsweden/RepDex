import Link from "next/link";
import { getAllPokemonFull, requireAdmin } from "@/lib/admin";
import { PokemonTable, type Row } from "./pokemon-table";

export const dynamic = "force-dynamic";

export default async function AdminPokemon({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const [{ deleted }, all] = await Promise.all([searchParams, getAllPokemonFull()]);
  const rows: Row[] = all.map((p) => ({
    id: String(p.id),
    species: Number(p.species),
    name: String(p.alt_name || p.name),
    form_type: String(p.form_type),
    released: (p.released as string | null) ?? "",
    release_shiny: (p.release_shiny as string | null) ?? "",
    image_regular: (p.image_regular as string | null) ?? "",
  }));

  return (
    <>
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <div className="dex-head">
        <h1>Pokémon</h1>
        <span className="count">{rows.length} entries</span>
        <span className="admin-actions">
          <a className="btn ghost" href="/admin/pokemon/export">Export CSV</a>
          <Link className="btn" href="/admin/pokemon/new">Add Pokémon</Link>
        </span>
      </div>
      {deleted && <p className="msg" role="status">Deleted {deleted}.</p>}
      <PokemonTable rows={rows} />
    </>
  );
}
