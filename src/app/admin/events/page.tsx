import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getPokemon } from "@/lib/data";
import { displayName } from "@/lib/dexes";
import { runEvents, toggleEvents } from "./actions";

export const dynamic = "force-dynamic";

type EventRow = { id: string; name: string; url: string; starts_at: string | null; ends_at: string | null; local_time: boolean };
type EventMon = { event_id: string; category: string; name: string; shiny: boolean; species: number | null; pokemon_id: string | null; sort: number };

const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
/** Event times are stored as written on Leek Duck (usually local time), so they're shown without converting. */
const when = (s: string | null) => (s ? day.format(new Date(`${s}Z`)) : "?");

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ error?: string; started?: string; past?: string }> }) {
  await requireAdmin();
  const { error, started, past } = await searchParams;
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 86400_000).toISOString().slice(0, 19);
  let q = supabase.from("events").select("*").order("starts_at");
  if (!past) q = q.gte("ends_at", cutoff);
  const [{ data: settings }, { data: events }, all] = await Promise.all([
    supabase.from("event_crawler").select("*").eq("id", 1).maybeSingle(),
    q,
    getPokemon(),
  ]);
  const ids = (events ?? []).map((e) => e.id);
  const { data: mons } = ids.length
    ? await supabase.from("event_pokemon").select("*").in("event_id", ids).order("sort")
    : { data: [] as EventMon[] };
  const names = new Map(all.map((p) => [p.id, displayName(p)]));
  const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });
  const byEvent = new Map<string, EventMon[]>();
  for (const m of (mons ?? []) as EventMon[]) byEvent.set(m.event_id, [...(byEvent.get(m.event_id) ?? []), m]);

  return (
    <div className="crawler">
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <div className="dex-head">
        <h1>Events</h1>
        <form action={runEvents}><button className="btn">Run now</button></form>
      </div>
      <p className="hint">
        Current and upcoming events from <a href="https://leekduck.com/events/" target="_blank" rel="noreferrer">Leek Duck</a>,
        read every night (04:47 UTC). Only the “Event” type for now. The current
        <a href="https://leekduck.com/raid-bosses/" target="_blank" rel="noreferrer"> raid bosses</a> are read at 06:01 and 10:01
        Swedish time and on every run, into the “Raid bosses” card. Pokémon in “Pokémon Debut” and “Shiny Debut”
        sections are skipped since they’re listed again further down.
      </p>
      {error && <p className="msg error" role="alert">{error}</p>}
      {started && <p className="msg" role="status">Started. A run takes about half a minute — reload this page to see the result.</p>}

      <div className="table-wrap">
        <table className="admin-table">
          <tbody>
            <tr>
              <td>
                <form action={toggleEvents}>
                  <input type="hidden" name="enabled" value={String(!settings?.enabled)} />
                  <button className="switch" role="switch" aria-checked={!!settings?.enabled} aria-label="Read events every night">
                    <span className="track" /><span className="knob" />
                  </button>
                </form>
              </td>
              <td>Last run: {settings?.last_run_at ? fmt.format(new Date(settings.last_run_at)) : "—"}</td>
              <td className={settings?.last_status === "error" ? "error-text" : undefined}>{settings?.last_message ?? "—"}</td>
            </tr>
            <tr>
              <td><span className="muted">Raids</span></td>
              <td>Raid bosses, last run: {settings?.raids_last_run_at ? fmt.format(new Date(settings.raids_last_run_at)) : "—"}</td>
              <td className={settings?.raids_last_status === "error" ? "error-text" : undefined}>{settings?.raids_last_message ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>{past ? "All events" : "Current and upcoming"} <span className="count">{(events ?? []).length}</span></h2>
      <p>{past ? <Link href="/admin/events">Hide past events</Link> : <Link href="/admin/events?past=1">Show past events too</Link>}</p>
      {(events ?? []).length === 0 && <p className="empty">No events yet. Press “Run now”.</p>}
      {((events ?? []) as EventRow[]).map((e) => {
        const list = byEvent.get(e.id) ?? [];
        const groups = new Map<string, EventMon[]>();
        for (const m of list) groups.set(m.category, [...(groups.get(m.category) ?? []), m]);
        return (
          <details key={e.id} className="event-box">
            <summary>
              <strong>{e.name}</strong>
              <span className="muted"> {when(e.starts_at)} – {when(e.ends_at)}{e.local_time ? " local time" : " UTC"} · {list.length} Pokémon</span>
            </summary>
            <p className="small-link"><a href={e.url} target="_blank" rel="noreferrer">{e.url}</a></p>
            {[...groups].map(([cat, ms]) => (
              <div key={cat} className="event-cat">
                <div className="event-cat-name">{cat}</div>
                <ul>
                  {ms.map((m) => (
                    <li key={m.name}>
                      {m.name}{m.shiny ? " ✨" : ""}{" "}
                      <span className="muted">
                        {m.pokemon_id
                          ? <>→ <Link href={`/admin/pokemon/${encodeURIComponent(m.pokemon_id)}`}>{names.get(m.pokemon_id) ?? m.pokemon_id}</Link></>
                          : m.species ? `→ #${m.species}, form not matched` : "→ not matched"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        );
      })}
    </div>
  );
}
