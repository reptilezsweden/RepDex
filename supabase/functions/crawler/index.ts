// Release-date crawler. Called daily by pg_cron (and by admins via crawler_run_now) with the
// x-crawler-secret header. Reads the Pokémon GO Wiki "…by release date" lists, fills empty date
// fields straight away and queues changed dates and unknown entries for review.
// Only wiki dates from the last 14 days onwards are used (older dates are settled by hand).
// POST body {"dry": true} returns what it would do without writing anything;
// {"since": "YYYY-MM-DD"} looks further back for a one-off check.
// New costume/event Pokémon are added as rows, with their image when the asset folder has one.

import { createClient } from "npm:@supabase/supabase-js@2";
import { parsePage, type Entry } from "./parse.ts";
import { fieldFor, makeMatcher, norm, type Row, type SourceKey } from "./match.ts";
import { imageFiles, newCostumeRow, pickCode, unusedCodes } from "./costume.ts";

const UA = "RepDex release-date crawler (https://github.com/reptilezsweden/RepDex)";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 1), { status, headers: { "Content-Type": "application/json" } });

async function wikitext(title: string): Promise<string | null> {
  const url = `https://pokemongo.fandom.com/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${title}: HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) {
    if (data.error.code === "missingtitle") return null;
    throw new Error(`${title}: ${data.error.info ?? data.error.code}`);
  }
  return data.parse?.wikitext ?? null;
}

/** Wiki pages for a source, with the year to use for headings that leave it out. */
function pagesFor(key: string, page: string, since: string): { title: string; year?: number }[] {
  if (key !== "forms") return [{ title: page }];
  const now = new Date().getUTCFullYear();
  const out = [];
  for (let y = Math.max(2016, Number(since.slice(0, 4))); y <= now; y++) out.push({ title: `${page}/${y}`, year: y });
  return out;
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: settings } = await db.from("crawler_settings").select("secret").eq("id", 1).single();
  if (!settings || req.headers.get("x-crawler-secret") !== settings.secret) return json({ error: "forbidden" }, 403);

  let body: { dry?: boolean; sources?: string[]; since?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const dry = body.dry === true;
  const since = /^\d{4}-\d{2}-\d{2}$/.test(body.since ?? "")
    ? body.since!
    : new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);

  // Everything the matcher needs.
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("pokemon")
      .select("*")
      .order("id").range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    rows.push(...(data as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  const aliases = new Map<string, string | null>();
  {
    const { data } = await db.from("crawler_aliases").select("key, pokemon_id");
    for (const a of data ?? []) aliases.set(a.key, a.pokemon_id);
  }
  const match = makeMatcher(rows);
  const speciesOf = new Map<string, number>();
  for (const r of rows) if (r.form_type === "Regular" || !speciesOf.has(norm(r.name))) speciesOf.set(norm(r.name), r.species);

  let srcQuery = db.from("crawler_sources").select("key, page, enabled").order("key");
  if (body.sources?.length) srcQuery = srcQuery.in("key", body.sources);
  else srcQuery = srcQuery.eq("enabled", true);
  const { data: sources } = await srcQuery;

  // Earliest date per (row, field), and per unmatched (entry, field).
  type Found = { date: string; key: string; label: string; source: string };
  const matched = new Map<string, Found & { id: string; field: string }>();
  const unmatched = new Map<string, Found & { field: string; candidates: string[] }>();
  const report: Record<string, { status: string; message: string; entries: number }> = {};
  // Costume entries RepDex doesn't have: wiki key → entry, dates per field, possible rows.
  const fresh = new Map<string, { e: Entry; label: string; dates: Record<string, string>; candidates: string[] }>();

  for (const src of sources ?? []) {
    const key = src.key as SourceKey;
    let entries: Entry[] = [];
    const missing: string[] = [];
    try {
      for (const p of pagesFor(key, src.page, since)) {
        const wt = await wikitext(p.title);
        if (wt == null) { missing.push(p.title); continue; }
        entries = entries.concat(parsePage(wt, p.year));
      }
    } catch (e) {
      report[key] = { status: "error", message: String((e as Error).message ?? e), entries: 0 };
      continue;
    }
    // A missing year page is normal for the current year early on; anything else is a problem.
    const thisYear = String(new Date().getUTCFullYear());
    const badMissing = missing.filter((t) => !t.endsWith(thisYear));
    if (entries.length === 0 || badMissing.length) {
      report[key] = { status: "error", message: entries.length === 0 ? "No entries found — the page layout may have changed" : `Missing pages: ${badMissing.join(", ")}`, entries: entries.length };
      if (entries.length === 0) continue;
    }

    for (const e of entries) {
      if (e.date < since) continue;
      const field = fieldFor(key, e);
      if (!field) continue;
      const m = match(key, e, field);
      let targets = m.rows ?? (m.row ? [m.row] : []);
      const known = aliases.has(m.key);
      if (known) {
        const id = aliases.get(m.key);
        if (id == null) continue; // ignored entry
        targets = byId.has(id) ? [byId.get(id)!] : [];
      }
      // A recent costume that only resembles an old one (released before the window) is a new costume.
      if (key === "costumes" && !known && targets.length === 1) {
        const have = targets[0][field] as string | null;
        if (have && have < since) targets = [];
      }
      for (const row of targets) {
        const k = `${row.id}|${field}`;
        const prev = matched.get(k);
        if (!prev || e.date < prev.date) matched.set(k, { id: row.id, field, date: e.date, key: m.key, label: m.label, source: key });
      }
      if (targets.length) continue;
      if (key === "costumes" && !known) {
        const f = fresh.get(m.key) ?? { e, label: m.label, dates: {}, candidates: m.candidates.map((r) => r.id) };
        if (!f.dates[field] || e.date < f.dates[field]) f.dates[field] = e.date;
        fresh.set(m.key, f);
      } else {
        const k = `${m.key}|${field}`;
        const prev = unmatched.get(k);
        if (!prev || e.date < prev.date) unmatched.set(k, { field, date: e.date, key: m.key, label: m.label, source: key, candidates: m.candidates.map((r) => r.id) });
      }
    }
    report[key] ??= { status: "ok", message: "", entries: entries.length };
  }

  // New costumes: added as rows unless RepDex may already have them (a costume of that species with the same date).
  const added: Record<string, unknown>[] = [];
  const newAliases: { key: string; pokemon_id: string }[] = [];
  if (fresh.size) {
    const files = await imageFiles(UA);
    const fileSet = new Set(files);
    const unused = unusedCodes(files, rows);
    const taken = new Set(rows.map((r) => r.id));
    for (const [k, f] of fresh) {
      const nr = speciesOf.get(norm(f.e.name));
      const speciesRows = rows.filter((r) => r.species === nr);
      const base = speciesRows.find((r) => r.form_type === "Regular") ?? speciesRows[0];
      const maybeHave = speciesRows.some((r) => r.form_type === "Costume" && Object.entries(f.dates).some(([fl, d]) => r[fl] === d));
      if (!base || maybeHave) {
        for (const [field, date] of Object.entries(f.dates)) {
          unmatched.set(`${k}|${field}`, { field, date, key: k, label: f.label, source: "costumes", candidates: f.candidates });
        }
        continue;
      }
      const codes = unused.get(base.species) ?? [];
      const code = pickCode(f.e, codes);
      if (code) unused.set(base.species, codes.filter((c) => c !== code));
      const row = newCostumeRow(f.e, base, speciesRows, code, fileSet, taken);
      Object.assign(row, f.dates);
      added.push(row);
      newAliases.push({ key: k, pokemon_id: row.id as string });
    }
  }

  const fill: { id: string; field: string; date: string }[] = [];
  const queue: Record<string, unknown>[] = [];
  for (const f of matched.values()) {
    const current = byId.get(f.id)?.[f.field] as string | null | undefined;
    if (current == null) fill.push({ id: f.id, field: f.field, date: f.date });
    else if (current !== f.date) {
      queue.push({ source: f.source, entry_key: f.key, label: f.label, pokemon_id: f.id, field: f.field, found_date: f.date, current_value: current, reason: "changed" });
    }
  }
  for (const u of unmatched.values()) {
    queue.push({ source: u.source, entry_key: u.key, label: u.label, pokemon_id: null, candidates: u.candidates, field: u.field, found_date: u.date, current_value: null, reason: "unmatched" });
  }

  if (dry) {
    return json({
      dry: true, since, report, rows: rows.length, added,
      fill: fill.length, changed: queue.filter((q) => q.reason === "changed").length, unmatched: unmatched.size,
      fillList: fill, queue,
    });
  }

  if (added.length) {
    const { error } = await db.rpc("crawler_add", { p_rows: added });
    if (error) return json({ error: error.message }, 500);
    await db.from("crawler_aliases").upsert(newAliases, { onConflict: "key" });
  }

  let filled = 0;
  for (let i = 0; i < fill.length; i += 200) {
    const { data, error } = await db.rpc("crawler_apply", { p_updates: fill.slice(i, i + 200) });
    if (error) return json({ error: error.message }, 500);
    filled += data as number;
  }
  let queued = 0;
  for (let i = 0; i < queue.length; i += 200) {
    const { data, error } = await db.from("crawler_queue")
      .upsert(queue.slice(i, i + 200), { onConflict: "entry_key,field,found_date", ignoreDuplicates: true })
      .select("id");
    if (error) return json({ error: error.message }, 500);
    queued += data?.length ?? 0;
  }

  const now = new Date().toISOString();
  for (const [key, r] of Object.entries(report)) {
    const bySource = (s: string) => fill.filter((f) => matched.get(`${f.id}|${f.field}`)?.source === s).length;
    const extra = key === "costumes" && added.length ? `, ${added.length} new costume${added.length === 1 ? "" : "s"} added` : "";
    const msg = r.status === "ok" ? `${r.entries} entries read, ${bySource(key)} dates filled${extra}` : r.message;
    await db.from("crawler_sources").update({ last_run_at: now, last_status: r.status, last_message: msg }).eq("key", key);
  }

  return json({ since, report, added: added.map((a) => a.id), filled, queued });
});
