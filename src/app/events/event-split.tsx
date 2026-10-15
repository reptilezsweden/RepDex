"use client";

import { useEffect, useState, type ReactNode } from "react";

type Item = { id: string; start: string | null; end: string | null; card: ReactNode; row: ReactNode };

/** The viewer's local time written like Leek Duck's local event times: "2026-10-15T16:04:00". */
function browserNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Splits events into "happening now" and "upcoming" by the viewer's clock. Leek Duck lists most event
 * times as local time, so an event starts at 10:00 wherever the viewer is. The server's guess (Swedish
 * time) is shown until the browser takes over, and the split is refreshed every minute.
 */
export function EventSplit({ events, serverNow, labels }: {
  events: Item[];
  serverNow: string;
  labels: { current: string; upcoming: string; noCurrent: string; noUpcoming: string };
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(browserNow());
    const id = setInterval(() => setNow(browserNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const live = events.filter((e) => !e.end || e.end >= now);
  const current = live.filter((e) => !e.start || e.start <= now);
  const upcoming = live.filter((e) => e.start && e.start > now);

  return (
    <>
      <h2 className="section-title">{labels.current}</h2>
      {current.length === 0 && <p className="empty">{labels.noCurrent}</p>}
      {current.map((e) => <div key={e.id}>{e.card}</div>)}

      <h2 className="section-title">{labels.upcoming}</h2>
      {upcoming.length === 0 && <p className="empty">{labels.noUpcoming}</p>}
      <div className="event-upcoming">
        {upcoming.map((e) => <div key={e.id}>{e.row}</div>)}
      </div>
    </>
  );
}
