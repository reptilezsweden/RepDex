"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MonImage } from "@/components/mon-ui";
import { ColumnIcon } from "@/app/full/full-table";
import type { ColumnIcon as Icon } from "@/lib/dex-columns";
import { createClient } from "@/lib/supabase/client";

export interface EventItem {
  key: string;
  name: string;
  image: string | null;
  species: number | null;
  shiny: boolean;
  /** Raid level as shown ("5★", "Mega"/"メガ" …), for raid bosses only. */
  level?: string | null;
  /** A Shadow raid boss. */
  shadow?: boolean;
  /** Dexes where the signed-in user is missing it; null when unknown (not signed in, or not tied to a RepDex row). */
  missingIn: string[] | null;
}

export interface EventData {
  id: string;
  name: string;
  /** The event's page on Leek Duck. */
  url: string;
  start: string | null;
  end: string | null;
  endsLabel: string;
  datesLabel: string;
  /** One list without category headings (the raid bosses). */
  flat?: boolean;
  groups: { category: string; items: EventItem[] }[];
}

export interface DexChoice { key: string; name: string; icon: Icon }

type Labels = Record<
  "current" | "upcoming" | "noCurrent" | "noUpcoming" | "noPokemon" | "count" | "missingCount" | "canBeShiny" | "shadow" |
  "all" | "missing" | "show" | "dexes" | "dexesHint" | "nothingMissing" | "notSaved" | "openOnSource",
  string
>;

/** The viewer's local time written like Leek Duck's local event times: "2026-10-15T16:04:00". */
function browserNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Events running now (in full) and upcoming events (folded). Running/upcoming follows the viewer's clock,
 * since Leek Duck lists most event times as local time. Signed-in users can show only the Pokémon they're
 * missing, in the dexes picked in the Dexes menu (saved separately from the Full collection page).
 */
export function EventsClient({ events, serverNow, labels, user }: {
  events: EventData[];
  serverNow: string;
  labels: Labels;
  user?: { id: string; dexes: DexChoice[]; hidden: string[] };
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(browserNow());
    const id = setInterval(() => setNow(browserNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Not remembered for now: every visit starts at All.
  const [show, setShow] = useState<"all" | "missing">("all");
  const [hidden, setHidden] = useState(() => new Set(user?.hidden ?? []));
  const [saveFailed, setSaveFailed] = useState(false);
  function toggleDex(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
    // Saved on its own, apart from the Full collection page's choice. Supabase only sends the request once awaited, hence .then().
    if (user) {
      void createClient().from("profiles").update({ events_hidden: [...next] }).eq("id", user.id)
        .then(({ error }: { error: unknown }) => setSaveFailed(!!error));
    }
  }

  const missingOnly = !!user && show === "missing";
  const dexByKey = new Map((user?.dexes ?? []).map((x) => [x.key, x]));
  const keep = (it: EventItem) => !missingOnly || (it.missingIn ?? []).some((k) => !hidden.has(k));
  const filtered = (e: EventData) =>
    e.groups.map((g) => ({ ...g, items: g.items.filter(keep) })).filter((g) => g.items.length > 0);

  const live = events.filter((e) => !e.end || e.end >= now);
  // The raid bosses (flat, no start) come first.
  const current = live.filter((e) => !e.start || e.start <= now).sort((a, b) => Number(!!b.flat) - Number(!!a.flat));
  const upcoming = live.filter((e) => e.start && e.start > now);

  const list = (e: EventData) => {
    const groups = filtered(e);
    if (groups.length === 0) return <p className="empty">{missingOnly && e.groups.length ? labels.nothingMissing : labels.noPokemon}</p>;
    return groups.map((g) => (
      <section key={g.category} className="upcoming event-cat">
        {!e.flat && <h3>{g.category}</h3>}
        <ul>
          {g.items.map((it) => {
            const inner = (
              <>
                <span className="imgs"><MonImage file={it.image} size={48} /></span>
                <span className="nm">
                  {it.name}
                  {(it.level || it.shadow) && (
                    <span className="raid-tags">
                      {it.level && <span className="raid-level">{it.level}</span>}
                      {it.shadow && <span className="raid-shadow">{labels.shadow}</span>}
                    </span>
                  )}
                  {missingOnly && (
                    <span className="missing-in">
                      {(it.missingIn ?? []).filter((k) => !hidden.has(k)).map((k) => {
                        const dex = dexByKey.get(k);
                        return dex ? <span key={k} title={dex.name} aria-label={dex.name}><ColumnIcon icon={dex.icon} /></span> : null;
                      })}
                    </span>
                  )}
                </span>
                {it.shiny && <span className="type" title={labels.canBeShiny} aria-label={labels.canBeShiny}>✨</span>}
              </>
            );
            return (
              <li key={it.key}>
                {it.species ? <Link href={`/pokemon/${it.species}`}>{inner}</Link> : <span className="no-link">{inner}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    ));
  };
  const count = (e: EventData) => {
    const n = filtered(e).reduce((s, g) => s + g.items.length, 0);
    if (!n) return "";
    return (missingOnly ? labels.missingCount : labels.count).replace("{n}", String(n));
  };

  return (
    <>
      {user && (
        <div className="filters event-filters">
          <span className="seg" role="group" aria-label={labels.show}>
            {(["all", "missing"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)}>
                {s === "all" ? labels.all : labels.missing}
              </button>
            ))}
          </span>
          <details className={`col-picker${missingOnly ? "" : " inactive"}`}>
            <summary title={missingOnly ? undefined : labels.dexesHint}>
              {labels.dexes} ({user.dexes.filter((x) => !hidden.has(x.key)).length}/{user.dexes.length}) ▾
            </summary>
            <div className="col-list">
              {user.dexes.map((c) => (
                <label key={c.key} className="check">
                  <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleDex(c.key)} />
                  <ColumnIcon icon={c.icon} /> {c.name}
                </label>
              ))}
            </div>
          </details>
          {!missingOnly && <span className="note">{labels.dexesHint}</span>}
        </div>
      )}
      {saveFailed && <p className="msg error" role="alert">{labels.notSaved}</p>}

      <h2 className="section-title">{labels.current}</h2>
      {current.length === 0 && <p className="empty">{labels.noCurrent}</p>}
      {current.map((e) => (
        <article key={e.id} className="event-card">
          <header>
            <h3 className="event-name">{e.name} <SourceLink url={e.url} label={labels.openOnSource} /></h3>
            <span className="event-when">{e.endsLabel}</span>
          </header>
          {list(e)}
        </article>
      ))}

      <h2 className="section-title">{labels.upcoming}</h2>
      {upcoming.length === 0 && <p className="empty">{labels.noUpcoming}</p>}
      <div className="event-upcoming">
        {upcoming.map((e) => (
          <details key={e.id} className="event-row">
            <summary>
              <span className="event-dates">{e.datesLabel}</span>
              <span className="event-name">{e.name} <SourceLink url={e.url} label={labels.openOnSource} /></span>
              <span className="event-count">{count(e)}</span>
            </summary>
            <div className="event-body">{list(e)}</div>
          </details>
        ))}
      </div>
    </>
  );
}

/** Small ↗ link to the event's own page on Leek Duck, in a new tab (doesn't fold the row open). */
function SourceLink({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="source-link" title={label} aria-label={label}
      onClick={(e) => e.stopPropagation()}>
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
