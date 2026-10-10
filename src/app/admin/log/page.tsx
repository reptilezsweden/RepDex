import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { revertChange } from "../actions";

export const dynamic = "force-dynamic";

const LIMIT = 300;

function short(v: string | null) {
  if (v === null || v === "") return "—";
  return v.length > 60 ? `${v.slice(0, 57)}…` : v;
}

export default async function AdminLog({ searchParams }: { searchParams: Promise<{ error?: string; reverted?: string; q?: string }> }) {
  await requireAdmin();
  const { error, reverted, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("change_log").select("*").order("changed_at", { ascending: false }).limit(LIMIT);
  if (q) query = query.ilike("row_id", `%${q}%`);
  const [{ data }, { data: people }] = await Promise.all([query, supabase.from("profiles").select("id,email")]);
  const emails = new Map((people ?? []).map((p) => [p.id as string, p.email as string | null]));
  const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

  return (
    <>
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <div className="dex-head">
        <h1>Change log</h1>
        <span className="count">Latest {LIMIT}</span>
      </div>
      <form className="filters" style={{ gridTemplateColumns: "1fr auto" }}>
        <input type="search" name="q" defaultValue={q} placeholder="Filter by ID, e.g. 0150" aria-label="Filter by ID" />
        <button className="btn ghost">Filter</button>
      </form>
      {error && <p className="msg error" role="alert">{error}</p>}
      {reverted && <p className="msg" role="status">Change reverted. The revert itself is logged as a new change.</p>}
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>When</th><th>Who</th><th>Row</th><th>Field</th><th>Old</th><th>New</th><th /></tr></thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="num">{fmt.format(new Date(e.changed_at))}</td>
                <td>{e.source === "admin" ? emails.get(e.changed_by) ?? "—" : e.source}</td>
                <td className="mono">
                  {e.table_name === "pokemon" && !String(e.field).includes("deleted")
                    ? <Link href={`/admin/pokemon/${encodeURIComponent(e.row_id)}`}>{e.row_id}</Link>
                    : `${e.table_name === "gens" ? "Gen " : ""}${e.row_id}`}
                </td>
                <td className="mono">{e.field}</td>
                <td className="mono">{short(e.old_value)}</td>
                <td className="mono">{short(e.new_value)}</td>
                <td>
                  {!String(e.field).startsWith("(") && (
                    <form action={revertChange}>
                      <input type="hidden" name="log_id" value={e.id} />
                      <button className="btn ghost small">Revert</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data ?? []).length === 0 && <p className="empty">No changes logged yet.</p>}
    </>
  );
}
