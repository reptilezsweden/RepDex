// Event crawler. Reads current and upcoming events from Leek Duck (https://leekduck.com/events/),
// keeps the types set in event_crawler.event_types (default: "event"), and stores each event's name,
// start and end with the Pokémon its page lists, by category. "Pokémon Debut"/"Shiny Debut" sections
// are skipped since those Pokémon are listed again further down.
// Also reads the current raid bosses (https://leekduck.com/raid-bosses/) into the event "raid-bosses",
// one list with each boss's raid level, Shadow and shiny marks.
// Called daily by pg_cron and by admins via events_run_now(), with the x-crawler-secret header.
// POST body {"dry": true} returns what it found without saving. {"raids": true} reads only the raid bosses;
// with "hours": [6, 10] it only runs when it's one of those hours in Sweden (pg_cron runs in UTC).

import { createClient } from "npm:@supabase/supabase-js@2";
import { parseEvent, parseList, parseRaids, type EventPokemon } from "./parse.ts";
import { makeMatcher, type Row } from "./match.ts";

const UA = "RepDex event crawler (https://github.com/reptilezsweden/RepDex)";
const LIST = "https://leekduck.com/events/";
const RAIDS = "https://leekduck.com/raid-bosses/";
const RAID_EVENT = "raid-bosses";

/** The hour in Sweden, 0–23. */
const swedishHour = () =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", hourCycle: "h23" }).format(new Date()));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), { status, headers: { "Content-Type": "application/json" } });

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return await res.text();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: secret } = await db.from("crawler_settings").select("secret").eq("id", 1).single();
  if (!secret || req.headers.get("x-crawler-secret") !== secret.secret) return json({ error: "forbidden" }, 403);

  let body: { dry?: boolean; raids?: boolean; hours?: number[] } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const dry = body.dry === true;
  if (body.hours && !body.hours.includes(swedishHour())) return json({ skipped: "not the hour" });

  const { data: settings } = await db.from("event_crawler").select("*").eq("id", 1).single();
  if (!dry && settings && !settings.enabled) return json({ skipped: "disabled" });
  const types = new Set<string>(settings?.event_types ?? ["event"]);

  const status = async (s: string, message: string) => {
    if (!dry) await db.from("event_crawler").update({ last_run_at: new Date().toISOString(), last_status: s, last_message: message }).eq("id", 1);
  };

  const raidStatus = async (s: string, message: string) => {
    if (!dry) await db.from("event_crawler").update({ raids_last_run_at: new Date().toISOString(), raids_last_status: s, raids_last_message: message }).eq("id", 1);
  };

  try {
    const rows: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("pokemon").select("id, species, name, alt_name, form_type, image_regular")
        .order("id").range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...(data as Row[]));
      if (!data || data.length < 1000) break;
    }
    const match = makeMatcher(rows);

    // Raid bosses: one list, the page is the truth. A failure here doesn't stop the events.
    let raids: unknown = null;
    try {
      const bosses = parseRaids(await get(RAIDS)).map((b) => {
        const m = match(b.name, b.image);
        return { ...b, species: m.species, pokemon_id: m.row?.id ?? null };
      });
      if (bosses.length === 0) throw new Error("No raid bosses found — the layout may have changed");
      if (dry) {
        raids = bosses.map((b) => `${b.level}${b.shadow ? " Shadow" : ""}: ${b.name}${b.shiny ? " ✨" : ""} → ${b.pokemon_id ?? (b.species ? `#${b.species}` : "?")}`);
      } else {
        const { error } = await db.from("events").upsert({
          id: RAID_EVENT, slug: RAID_EVENT, name: "Raid bosses", event_type: "raids", url: RAIDS, image: null,
          starts_at: null, ends_at: null, local_time: true, last_seen_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) throw new Error(error.message);
        await db.from("event_pokemon").delete().eq("event_id", RAID_EVENT);
        const { error: e2 } = await db.from("event_pokemon").insert(bosses.map((b) => ({
          event_id: RAID_EVENT, category: "Raid bosses", name: b.name, image: b.image, shiny: b.shiny, shadow: b.shadow,
          level: b.level, species: b.species, pokemon_id: b.pokemon_id, sort: b.sort,
        })));
        if (e2) throw new Error(e2.message);
        const unmatched = bosses.filter((b) => !b.pokemon_id).length;
        raids = { bosses: bosses.length, unmatched };
        await raidStatus("ok", `${bosses.length} raid bosses (${unmatched} not tied to a RepDex row)`);
      }
    } catch (e) {
      console.error(String(e));
      await raidStatus("error", String((e as Error).message ?? e));
      raids = { error: String(e) };
    }
    if (body.raids) return json({ dry, raids });

    const listed = parseList(await get(LIST)).filter((e) => types.has(e.type));
    if (listed.length === 0) {
      await status("error", "No events found on the list page — the layout may have changed");
      return json({ error: "no events found" }, 500);
    }

    const found: { event: typeof listed[number]; pokemon: (EventPokemon & { species: number | null; pokemon_id: string | null })[] }[] = [];
    for (const ev of listed) {
      await sleep(400); // be gentle with Leek Duck
      let pokemon: EventPokemon[] = [];
      try {
        pokemon = parseEvent(await get(ev.url));
      } catch (e) {
        console.error(String(e));
        continue; // keep what we had for this event
      }
      found.push({
        event: ev,
        pokemon: pokemon.map((p) => {
          const m = match(p.name, p.image);
          return { ...p, species: m.species, pokemon_id: m.row?.id ?? null };
        }),
      });
    }

    if (dry) {
      return json({
        dry: true,
        raids,
        events: found.map((f) => ({
          ...f.event,
          pokemon: f.pokemon.map((p) => `${p.category}: ${p.name}${p.shiny ? " ✨" : ""} → ${p.pokemon_id ?? (p.species ? `#${p.species}` : "?")}`),
        })),
      });
    }

    const now = new Date().toISOString();
    let saved = 0;
    for (const f of found) {
      const e = f.event;
      const { error } = await db.from("events").upsert({
        id: e.id, slug: e.slug, name: e.name, event_type: e.type, url: e.url, image: e.image,
        starts_at: e.start, ends_at: e.end, local_time: e.localTime, last_seen_at: now,
      }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      // The page is the truth: replace this event's Pokémon (only when the page listed some).
      if (f.pokemon.length) {
        await db.from("event_pokemon").delete().eq("event_id", e.id);
        const { error: e2 } = await db.from("event_pokemon").insert(f.pokemon.map((p) => ({
          event_id: e.id, category: p.category, name: p.name, image: p.image, shiny: p.shiny, shadow: p.shadow,
          species: p.species, pokemon_id: p.pokemon_id, sort: p.sort,
        })));
        if (e2) throw new Error(e2.message);
        saved += f.pokemon.length;
      }
    }
    const unmatched = found.flatMap((f) => f.pokemon).filter((p) => !p.pokemon_id).length;
    const msg = `${found.length} events, ${saved} Pokémon listed (${unmatched} not tied to a RepDex row)`;
    await status(found.length < listed.length ? "error" : "ok", found.length < listed.length ? `${msg}; ${listed.length - found.length} pages failed` : msg);
    return json({ events: found.length, pokemon: saved, unmatched, raids });
  } catch (e) {
    await status("error", String((e as Error).message ?? e));
    return json({ error: String(e) }, 500);
  }
});
