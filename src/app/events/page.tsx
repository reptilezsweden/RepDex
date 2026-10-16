import { createClient as createPlainClient } from "@supabase/supabase-js";
import { getPokemon } from "@/lib/data";
import { columnIcon, columnOrder } from "@/lib/dex-columns";
import { collectible, dexRows, isOn, statusOf, today } from "@/lib/dexes";
import { getDict, getProfile } from "@/lib/session";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { byDex, getTicks } from "@/lib/ticks";
import { EventsView, RAID_EVENT, type EventMon, type EventRow } from "./events-view";

export const dynamic = "force-dynamic";

/** Now as Leek Duck writes its (local) times: "2026-10-15T16:04:00". Swedish time; the browser corrects it. */
function localNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date()).replace(" ", "T");
}

function dayBefore(local: string): string {
  return new Date(Date.parse(`${local}Z`) - 86400_000).toISOString().slice(0, 19);
}

/**
 * Public events page (no sign-in needed): events running now with their Pokémon, then upcoming events by date.
 * Signed-in users can also show only what they're missing, per dex.
 */
export default async function EventsPage() {
  const { lang, t } = await getDict();
  const supabase = createPlainClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const now = localNow();
  const cols = "id, name, url, starts_at, ends_at, event_type, last_seen_at";
  const [{ data: events }, { data: raids }, all, profile] = await Promise.all([
    // A day of slack: viewers west of Sweden still see events that have ended here; the browser filters them.
    supabase.from("events").select(cols).gte("ends_at", dayBefore(now)).order("starts_at").order("name"),
    // The current raid bosses: an event without start or end, shown first under "Happening now".
    supabase.from("events").select(cols).eq("id", RAID_EVENT),
    getPokemon(),
    getProfile(),
  ]);
  const list = [...((raids ?? []) as EventRow[]), ...((events ?? []) as EventRow[])];
  const ids = list.map((e) => e.id);
  const { data: mons } = ids.length
    ? await supabase.from("event_pokemon").select("*").in("event_id", ids).order("sort")
    : { data: [] as EventMon[] };

  let user: { id: string; dexes: { key: string; name: string; icon: ReturnType<typeof columnIcon> }[]; hidden: string[] } | undefined;
  let missingIn: ((rowId: string, shiny: boolean, shadow: boolean) => string[]) | undefined;
  if (profile) {
    const ticksBy = byDex(await getTicks());
    const day = today();
    const dexes = columnOrder().filter((d) => isOn(d.key, profile.visible_dexes));
    // Released, collectible rows of each dex.
    const members = dexes.map((d) => ({
      d,
      ids: new Set(dexRows(all, d).filter((p) => collectible(p) && statusOf(p, d, day) === "available").map((p) => p.id)),
    }));
    // Shadow and Purified (and their shinies) only count for Pokémon the event explicitly calls Shadow.
    const shadowDex = (key: string) => /^(shadow|purified)/.test(key);
    missingIn = (rowId, shiny, shadow) =>
      members
        .filter(({ d, ids }) => ids.has(rowId) && (!d.shiny || shiny) && (!shadowDex(d.key) || shadow)
          && !ticksBy.get(d.key)?.get(rowId)?.collected)
        .map(({ d }) => d.key);
    user = {
      id: profile.id,
      dexes: dexes.map((d) => ({ key: d.key, name: d.name[lang], icon: columnIcon(d) })),
      hidden: profile.events_hidden ?? [],
    };
  }

  return (
    <EventsView
      events={list} pokemon={(mons ?? []) as EventMon[]} all={all} now={now} lang={lang} t={t}
      missingIn={missingIn} user={user}
    />
  );
}
