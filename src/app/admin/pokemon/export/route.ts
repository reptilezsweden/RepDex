import { getAllPokemonFull, POKEMON_FIELDS, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** The whole availability list as CSV (opens in Excel and Google Sheets). */
export async function GET() {
  await requireAdmin();
  const rows = await getAllPokemonFull();
  const cols = POKEMON_FIELDS.map((f) => f.name);
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  // A byte-order mark makes Excel read the file as UTF-8 (é in Pokémon, Swedish letters).
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="repdex-pokemon-${day}.csv"`,
    },
  });
}
