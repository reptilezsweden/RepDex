import Link from "next/link";
import { MonImage } from "@/components/mon-ui";
import { displayName, type Pokemon } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { EventSplit } from "./event-split";

export type EventRow = { id: string; name: string; url: string; starts_at: string | null; ends_at: string | null };
export type EventMon = { event_id: string; category: string; name: string; shiny: boolean; species: number | null; pokemon_id: string | null; sort: number };

/**
 * The events page body: events running now with their Pokémon, then upcoming events by date (Pokémon folded away).
 * Which events are running is decided in the browser, by the viewer's own clock (EventSplit).
 */
export function EventsView({ events: list, pokemon, all, now, lang, t }: {
  events: EventRow[]; pokemon: EventMon[]; all: Pokemon[]; now: string; lang: string; t: Dict;
}) {
  const byEvent = new Map<string, EventMon[]>();
  for (const m of pokemon) byEvent.set(m.event_id, [...(byEvent.get(m.event_id) ?? []), m]);
  const byId = new Map(all.map((p) => [p.id, p]));
  const regular = new Map<number, Pokemon>();
  for (const p of all) if (p.form_type === "Regular" && !regular.has(p.species)) regular.set(p.species, p);


  const locale = lang === "sv" ? "sv-SE" : "en-GB";
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const d = (s: string | null, withTime = false) => (s ? (withTime ? dateTime : date).format(new Date(`${s}Z`)) : "?");

  const groups = (e: EventRow) => {
    const ms = byEvent.get(e.id) ?? [];
    // The "Shiny" section repeats Pokémon already shown (with ✨); keep only the ones listed nowhere else.
    const elsewhere = new Set(ms.filter((m) => !/^shiny$/i.test(m.category)).map((m) => m.pokemon_id ?? m.name));
    const out = new Map<string, EventMon[]>();
    for (const m of ms) {
      if (/^shiny$/i.test(m.category) && elsewhere.has(m.pokemon_id ?? m.name)) continue;
      out.set(m.category, [...(out.get(m.category) ?? []), m]);
    }
    return [...out];
  };
  const mon = (m: EventMon) => {
    const row = m.pokemon_id ? byId.get(m.pokemon_id) : undefined;
    const shown = row ?? (m.species ? regular.get(m.species) : undefined);
    return { row, shown };
  };

  const pokemonList = (e: EventRow) => {
    const g = groups(e);
    if (g.length === 0) return <p className="empty">{t.eventNoPokemon}</p>;
    return g.map(([cat, ms]) => (
      <section key={cat} className="upcoming event-cat">
        <h3>{cat}</h3>
        <ul>
          {ms.map((m) => {
            const { row, shown } = mon(m);
            const inner = (
              <>
                <span className="imgs"><MonImage file={shown?.image_regular ?? null} size={48} /></span>
                <span className="nm">{row ? displayName(row) : m.name}</span>
                {m.shiny && <span className="type" title={t.canBeShiny} aria-label={t.canBeShiny}>✨</span>}
              </>
            );
            return (
              <li key={`${cat}|${m.name}`}>
                {shown ? <Link href={`/pokemon/${shown.species}`}>{inner}</Link> : <span className="no-link">{inner}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    ));
  };

  return (
    <div className="events-page">
      <h1>{t.events}</h1>
      <p className="hint">{t.eventsIntro}</p>

      <EventSplit
        serverNow={now}
        labels={{ current: t.currentEvents, upcoming: t.upcomingEvents, noCurrent: t.noCurrentEvents, noUpcoming: t.noUpcomingEvents }}
        events={list.map((e) => {
          const n = (byEvent.get(e.id) ?? []).length;
          return {
            id: e.id,
            start: e.starts_at,
            end: e.ends_at,
            card: (
              <article className="event-card">
                <header>
                  <h3 className="event-name">{e.name}</h3>
                  <span className="event-when">{t.eventEnds.replace("{date}", d(e.ends_at, true))}</span>
                </header>
                {pokemonList(e)}
              </article>
            ),
            row: (
              <details className="event-row">
                <summary>
                  <span className="event-dates">{d(e.starts_at)}{e.ends_at && e.ends_at.slice(0, 10) !== e.starts_at?.slice(0, 10) ? ` – ${d(e.ends_at)}` : ""}</span>
                  <span className="event-name">{e.name}</span>
                  <span className="event-count">{n ? t.eventPokemonCount.replace("{n}", String(n)) : ""}</span>
                </summary>
                <div className="event-body">{pokemonList(e)}</div>
              </details>
            ),
          };
        })}
      />

      <p className="hint event-source">
        {t.eventsSource.split("{source}")[0]}
        <a href="https://leekduck.com/events/" target="_blank" rel="noreferrer">Leek Duck</a>
        {t.eventsSource.split("{source}")[1]}
      </p>
    </div>
  );
}
