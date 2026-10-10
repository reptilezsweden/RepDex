"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface Row {
  id: string;
  species: number;
  name: string;
  form_type: string;
  released: string;
  release_shiny: string;
  image_regular: string;
}

const PAGE = 100;

export function PokemonTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [missing, setMissing] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const types = useMemo(() => [...new Set(rows.map((r) => r.form_type))].sort(), [rows]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!s || r.name.toLowerCase().includes(s) || r.id.toLowerCase().includes(s) || String(r.species) === s)
      && (!type || r.form_type === type)
      && (!missing || !r.released),
    );
  }, [rows, q, type, missing]);

  return (
    <>
      <div className="filters">
        <input type="search" placeholder="Search name, ID or number" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} aria-label="Search" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Form type">
          <option value="">All form types</option>
          {types.map((x) => <option key={x}>{x}</option>)}
        </select>
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={missing} onChange={(e) => setMissing(e.target.checked)} /> No release date
        </label>
      </div>
      <p className="note">{shown.length} matching</p>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>No.</th><th>Name</th><th>ID</th><th>Form type</th><th>Released</th><th>Shiny</th></tr>
          </thead>
          <tbody>
            {shown.slice(0, limit).map((r) => (
              <tr key={r.id}>
                <td className="num">{r.species}</td>
                <td><Link href={`/admin/pokemon/${encodeURIComponent(r.id)}`}>{r.name}</Link></td>
                <td className="mono">{r.id}</td>
                <td>{r.form_type}</td>
                <td className="num">{r.released || "—"}</td>
                <td className="num">{r.release_shiny || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={() => setLimit(limit + PAGE * 5)}>
          Show more ({shown.length - limit} left)
        </button>
      )}
    </>
  );
}
