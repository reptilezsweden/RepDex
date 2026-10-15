import { displayName, type Pokemon } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { EventsClient, type EventData, type DexChoice } from "./events-client";

export type EventRow = { id: string; name: string; url: string; starts_at: string | null; ends_at: string | null };
export type EventMon = { event_id: string; category: string; name: string; shiny: boolean; species: number | null; pokemon_id: string | null; sort: number };

/**
 * The events page body. Prepares each event's Pokémon (display name, image, link, and for signed-in users
 * the dexes where it's missing); the client part splits running/upcoming by the viewer's clock and filters.
 */
export function EventsView({ events: list, pokemon, all, now, lang, t, missingIn, user }: {
  events: EventRow[];
  pokemon: EventMon[];
  all: Pokemon[];
  now: string;
  lang: string;
  t: Dict;
  /** For signed-in users: dexes where a row is missing (shiny dexes only count when the event says it can be shiny). */
  missingIn?: (rowId: string, shiny: boolean) => string[];
  user?: { id: string; dexes: DexChoice[]; hidden: string[] };
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

  const events: EventData[] = list.map((e) => {
    const ms = byEvent.get(e.id) ?? [];
    // The "Shiny" section repeats Pokémon already shown (with ✨); keep only the ones listed nowhere else.
    const elsewhere = new Set(ms.filter((m) => !/^shiny$/i.test(m.category)).map((m) => m.pokemon_id ?? m.name));
    const groups = new Map<string, EventData["groups"][number]["items"]>();
    for (const m of ms) {
      if (/^shiny$/i.test(m.category) && elsewhere.has(m.pokemon_id ?? m.name)) continue;
      const row = m.pokemon_id ? byId.get(m.pokemon_id) : undefined;
      const shown = row ?? (m.species ? regular.get(m.species) : undefined);
      groups.set(m.category, [...(groups.get(m.category) ?? []), {
        key: `${m.category}|${m.name}`,
        name: row ? displayName(row) : m.name,
        image: shown?.image_regular ?? null,
        species: shown?.species ?? null,
        shiny: m.shiny,
        missingIn: row && missingIn ? missingIn(row.id, m.shiny) : null,
      }]);
    }
    return {
      id: e.id,
      name: e.name,
      start: e.starts_at,
      end: e.ends_at,
      endsLabel: t.eventEnds.replace("{date}", d(e.ends_at, true)),
      datesLabel: `${d(e.starts_at)}${e.ends_at && e.ends_at.slice(0, 10) !== e.starts_at?.slice(0, 10) ? ` – ${d(e.ends_at)}` : ""}`,
      groups: [...groups].map(([category, items]) => ({ category, items })),
    };
  });

  return (
    <div className="events-page">
      <h1>{t.events}</h1>
      <p className="hint">{t.eventsIntro}</p>
      <EventsClient
        events={events}
        serverNow={now}
        user={user}
        labels={{
          current: t.currentEvents, upcoming: t.upcomingEvents, noCurrent: t.noCurrentEvents, noUpcoming: t.noUpcomingEvents,
          noPokemon: t.eventNoPokemon, count: t.eventPokemonCount, missingCount: t.eventMissingCount, canBeShiny: t.canBeShiny,
          all: t.showAll, missing: t.showMissing, show: t.show, dexes: t.dexes, dexesHint: t.eventDexesHint,
          nothingMissing: t.eventNothingMissing, notSaved: t.fullColumnsNotSaved,
        }}
      />
      <p className="hint event-source">
        {t.eventsSource.split("{source}")[0]}
        <a href="https://leekduck.com/events/" target="_blank" rel="noreferrer">Leek Duck</a>
        {t.eventsSource.split("{source}")[1]}
      </p>
    </div>
  );
}
