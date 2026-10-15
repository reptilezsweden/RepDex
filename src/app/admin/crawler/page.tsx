import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getPokemon } from "@/lib/data";
import { displayName } from "@/lib/dexes";
import { decideQueue, runCrawler, toggleSource } from "./actions";

export const dynamic = "force-dynamic";

const FIELD_LABEL: Record<string, string> = {
  released: "Released",
  release_shiny: "Shiny",
  release_shadow: "Shadow",
  release_shadow_shiny: "Shadow shiny",
  release_dynamax: "Dynamax",
  release_dynamax_shiny: "Dynamax shiny",
};

const WIKI = "https://pokemongo.fandom.com/wiki/";

type QueueRow = {
  id: number; source: string; entry_key: string; label: string; pokemon_id: string | null;
  candidates: string[] | null; field: string; found_date: string; current_value: string | null;
  reason: "changed" | "unmatched"; status: string; decided_at: string | null;
};

export default async function AdminCrawler({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; started?: string; done?: string; show?: string }>;
}) {
  await requireAdmin();
  const { error, started, done, show } = await searchParams;
  const supabase = await createClient();
  const [{ data: sources }, { data: pending }, { data: decided }, all] = await Promise.all([
    supabase.from("crawler_sources").select("*").order("key"),
    supabase.from("crawler_queue").select("*").eq("status", "pending").order("reason").order("source").order("label").limit(1000),
    show === "decided"
      ? supabase.from("crawler_queue").select("*").neq("status", "pending").order("decided_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as QueueRow[] }),
    getPokemon(),
  ]);
  const names = new Map(all.map((p) => [p.id, displayName(p)]));
  const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });
  const queue = (pending ?? []) as QueueRow[];
  const changed = queue.filter((q) => q.reason === "changed");
  const unmatched = queue.filter((q) => q.reason === "unmatched");

  const rowLink = (id: string | null) =>
    id ? <Link href={`/admin/pokemon/${encodeURIComponent(id)}`}>{names.get(id) ?? id}</Link> : "—";

  return (
    <div className="crawler">
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <div className="dex-head">
        <h1>Release-date crawler</h1>
        <form action={runCrawler}><button className="btn">Run now</button></form>
      </div>
      <p className="hint">
        Reads the Pokémon GO Wiki every night (04:17 UTC). Empty date fields are filled straight away (shown as
        “crawler” in the change log). Dates that differ from ours, and wiki entries it can’t place, wait here
        for you to decide.
      </p>
      {error && <p className="msg error" role="alert">{error}</p>}
      {started && <p className="msg" role="status">Started. A run takes about a minute — reload this page to see the result.</p>}
      {done && !error && <p className="msg" role="status">{done} decided.</p>}

      <h2>Sources</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>On</th><th>Source</th><th>Last run</th><th>Result</th></tr></thead>
          <tbody>
            {(sources ?? []).map((s) => (
              <tr key={s.key}>
                <td>
                  <form action={toggleSource}>
                    <input type="hidden" name="key" value={s.key} />
                    <input type="hidden" name="enabled" value={String(!s.enabled)} />
                    <button className="switch" role="switch" aria-checked={s.enabled} aria-label={`Crawl ${s.name}`}>
                      <span className="track" /><span className="knob" />
                    </button>
                  </form>
                </td>
                <td>
                  {s.name}
                  <br />
                  <a className="small-link" href={WIKI + encodeURIComponent(s.page.replaceAll(" ", "_"))} target="_blank" rel="noreferrer">
                    {s.page}{s.key === "forms" ? " (yearly pages)" : ""}
                  </a>
                </td>
                <td className="num">{s.last_run_at ? fmt.format(new Date(s.last_run_at)) : "—"}</td>
                <td className={s.last_status === "error" ? "error-text" : undefined}>{s.last_message ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={decideQueue}>
        <h2>Changed dates <span className="count">{changed.length}</span></h2>
        {changed.length === 0 ? (
          <p className="empty">Nothing to review.</p>
        ) : (
          <>
            <div className="bulk-actions">
              <button className="btn ghost small" name="do" value="approve-selected">Use wiki date for ticked</button>
              <button className="btn ghost small" name="do" value="reject-selected">Keep ours for ticked</button>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th /><th>Pokémon</th><th>Field</th><th>Ours</th><th>Wiki</th><th>Wiki entry</th><th /></tr>
                </thead>
                <tbody>
                  {changed.map((q) => (
                    <tr key={q.id}>
                      <td><input type="checkbox" name="ids" value={q.id} aria-label={`Select ${q.label}`} /></td>
                      <td>{rowLink(q.pokemon_id)}</td>
                      <td>{FIELD_LABEL[q.field] ?? q.field}</td>
                      <td className="num">{q.current_value ?? "—"}</td>
                      <td className="num"><strong>{q.found_date}</strong></td>
                      <td className="muted">{q.source}: {q.label}</td>
                      <td className="row-actions">
                        <button className="btn small" name="do" value={`approve:${q.id}`}>Use wiki</button>
                        <button className="btn ghost small" name="do" value={`reject:${q.id}`}>Keep ours</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2>Unknown entries <span className="count">{unmatched.length}</span></h2>
        <p className="hint">
          Pick which Pokémon the wiki means and its date is used; the choice is remembered for later runs.
          “Ignore” skips the entry from now on.
        </p>
        {unmatched.length === 0 ? (
          <p className="empty">Nothing to review.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Wiki entry</th><th>Field</th><th>Wiki</th><th>Which Pokémon?</th><th /></tr></thead>
              <tbody>
                {unmatched.map((q) => {
                  const options = q.candidates ?? [];
                  return (
                    <tr key={q.id}>
                      <td>{q.label}<br /><span className="muted">{q.source}</span></td>
                      <td>{FIELD_LABEL[q.field] ?? q.field}</td>
                      <td className="num">{q.found_date}</td>
                      <td>
                        {options.length > 0 && options.length <= 30 ? (
                          <select name={`pick_${q.id}`} defaultValue="" aria-label={`Pokémon for ${q.label}`}>
                            <option value="" disabled>Choose…</option>
                            {options.map((id) => <option key={id} value={id}>{names.get(id) ?? id} · {id}</option>)}
                          </select>
                        ) : (
                          <>
                            <input
                              name={`pick_${q.id}`} list={`cand_${q.id}`} placeholder="ID, e.g. 0025_fWCS_2026"
                              aria-label={`Pokémon ID for ${q.label}`} className="mono"
                            />
                            {options.length > 0 && (
                              <datalist id={`cand_${q.id}`}>
                                {options.map((id) => <option key={id} value={id}>{names.get(id) ?? id}</option>)}
                              </datalist>
                            )}
                          </>
                        )}
                      </td>
                      <td className="row-actions">
                        <button className="btn small" name="do" value={`approve:${q.id}`}>Use</button>
                        <button className="btn ghost small" name="do" value={`ignore:${q.id}`}>Ignore</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </form>

      <h2>Decided</h2>
      {show !== "decided" ? (
        <p><Link href="/admin/crawler?show=decided">Show the latest 200 decisions</Link></p>
      ) : (decided ?? []).length === 0 ? (
        <p className="empty">No decisions yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Decision</th><th>Pokémon</th><th>Field</th><th>Wiki</th><th>Wiki entry</th></tr></thead>
            <tbody>
              {(decided as QueueRow[]).map((q) => (
                <tr key={q.id}>
                  <td className="num">{q.decided_at ? fmt.format(new Date(q.decided_at)) : "—"}</td>
                  <td>{q.status === "approved" ? "Used wiki date" : q.reason === "unmatched" ? "Ignored" : "Kept ours"}</td>
                  <td>{rowLink(q.pokemon_id)}</td>
                  <td>{FIELD_LABEL[q.field] ?? q.field}</td>
                  <td className="num">{q.found_date}</td>
                  <td className="muted">{q.source}: {q.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
