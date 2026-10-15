import { createClient as createPlainClient } from "@supabase/supabase-js";
import { getPokemon } from "@/lib/data";
import { getDict } from "@/lib/session";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { EventsView, type EventMon, type EventRow } from "./events-view";

export const dynamic = "force-dynamic";

/** Now as Leek Duck writes its (local) times: "2026-10-15T16:04:00". Swedish time, the app's home. */
function localNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date()).replace(" ", "T");
}

function dayBefore(local: string): string {
  return new Date(Date.parse(`${local}Z`) - 86400_000).toISOString().slice(0, 19);
}

/** Public events page (no sign-in needed): events running now with their Pokémon, then upcoming events by date. */
export default async function EventsPage() {
  const { lang, t } = await getDict();
  const supabase = createPlainClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const now = localNow();
  const [{ data: events }, all] = await Promise.all([
    // A day of slack: viewers west of Sweden still see events that have ended here; the browser filters them.
    supabase.from("events").select("id, name, url, starts_at, ends_at").gte("ends_at", dayBefore(now)).order("starts_at").order("name"),
    getPokemon(),
  ]);
  const list = (events ?? []) as EventRow[];
  const ids = list.map((e) => e.id);
  const { data: mons } = ids.length
    ? await supabase.from("event_pokemon").select("*").in("event_id", ids).order("sort")
    : { data: [] as EventMon[] };

  return <EventsView events={list} pokemon={(mons ?? []) as EventMon[]} all={all} now={now} lang={lang} t={t} />;
}
