// The collection spreadsheet (docs/DESIGN.md, "Spreadsheet download and upload"): the whole collection
// for the dexes the user has switched on, one tab per dex group after an Instructions tab, and how an
// uploaded copy turns into tick changes. English only.
import {
  CAUGHT_LINKED, DEXES, canWant, collectible, dexByKey, dexRows, displayName, genderOn, isOn, pageDexes,
  shinyToggles, statusOf, type Dex, type Pokemon, type Tick,
} from "./dexes";
import { sheetName, type Cell, type SheetSpec } from "./xlsx";

type TickState = { collected: boolean; wanted: boolean };
export type SheetChanges = Map<string, Map<string, TickState | null>>;
type TickMap = Map<string, Map<string, Tick>>;
type Profile = { visible_dexes?: string[] | null; gender_dexes?: string[] | null };

const INFO_COLUMNS = ["ID", "No", "Name", "Form type"];

/** A tab: a dex group (as on the Dexes page) with a column per dex in it that's switched on. */
export interface SheetTab { name: string; columns: Dex[] }

/** Tabs for the dexes the user shows: the group's own dex, its shiny stars, then each peer (XXS, Purified) with its shiny. */
export function sheetTabs(profile: Profile): SheetTab[] {
  const visible = profile.visible_dexes;
  return pageDexes(visible).map((d) => {
    const columns: Dex[] = [];
    const add = (x: Dex) => {
      if (isOn(x.key, visible)) columns.push(x);
      for (const s of shinyToggles(x, visible)) columns.push(s.dex);
    };
    add(d);
    for (const k of d.peers ?? []) add(dexByKey(k)!);
    return { name: sheetName((d.groupName ?? d.name).en), columns };
  }).filter((t) => t.columns.length > 0);
}

/**
 * The tick a dex's tick depends on: a shiny on its regular dex (Shiny ⭐⭐⭐ on Shiny), Lucky, XXL,
 * XXS and 100% on Caught. Ticking needs the parent ticked; unticking the parent unticks it.
 */
export function parentOf(dex: string): string | null {
  for (const d of DEXES) {
    if (d.shinyKey === dex) return d.key;
    if (d.shiny3Key === dex) return d.shinyKey ?? d.key;
  }
  return CAUGHT_LINKED.includes(dex) ? "caught" : null;
}
const childrenOf = (dex: string) => DEXES.map((d) => d.key).filter((k) => parentOf(k) === dex);

/** A row of a tab: an original row, or a female twin where gender is tracked for some column. */
interface SheetRow { p: Pokemon; base: Pokemon; female: boolean }

/** Whether a column's cell is in use for a row: the version is released, and ♀ rows only where that dex tracks gender. */
function cellOpen(r: SheetRow, dex: Dex, day: string, profile: Profile): "open" | "unreleased" | "genderOff" | "notInDex" {
  if (!dex.includes(r.base)) return "notInDex";
  if (r.female && !genderOn(dex.key, profile)) return "genderOff";
  return statusOf(r.p, dex, day) === "available" ? "open" : "unreleased";
}

/** Every form that can be ticked in a tab, with ♀ rows after their original where gender is on. */
function tabRows(tab: SheetTab, all: Pokemon[], day: string, profile: Profile): SheetRow[] {
  const twins = new Map<string, Pokemon>();
  for (const p of all) if (p.gender_of) twins.set(p.gender_of, p);
  const seen = new Set<string>();
  const rows: Pokemon[] = [];
  for (const d of tab.columns) for (const p of dexRows(all, d)) if (!seen.has(p.id)) { seen.add(p.id); rows.push(p); }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  const out: SheetRow[] = [];
  for (const p of rows) {
    if (!collectible(p)) continue;
    const sides: SheetRow[] = [{ p, base: p, female: false }];
    const twin = twins.get(p.id);
    if (twin && collectible(twin) && tab.columns.some((d) => genderOn(d.key, profile))) sides.push({ p: twin, base: p, female: true });
    for (const r of sides) if (tab.columns.some((d) => cellOpen(r, d, day, profile) === "open")) out.push(r);
  }
  return out;
}

const value = (ticks: TickMap, dex: string, id: string): Cell => {
  const t = ticks.get(dex)?.get(id);
  return !t?.collected ? false : t.wanted ? "WANTED" : true;
};

const INSTRUCTIONS = (tabs: SheetTab[], nickname: string, day: string): Cell[][] => [
  [`RepDex collection${nickname ? ` – ${nickname}` : ""} (${day})`],
  [],
  ["This file holds your whole collection for the dexes you show in RepDex: one tab per dex group, one row per form."],
  ["Change the tick columns, save the file as .xlsx (or a tab as .csv) and upload it under Settings → Spreadsheet."],
  ["You'll see a summary of the changes before anything is saved."],
  [],
  ["Tick columns"],
  ["TRUE", "Ticked (you have it)."],
  ["FALSE or empty", "Not ticked."],
  ["WANTED", "Ticked, and marked as wanted (it shows on your wishlists, e.g. for a better one). Not for Shadow or Purified."],
  ["(empty, greyed)", "Cells left empty in the download are versions that aren't released yet, or ♀ rows where that dex doesn't track gender. They're ignored."],
  [],
  ["Rules (the same as in the app)"],
  ["", "A shiny needs its regular tick: shiny needs caught, shiny3 needs shiny, shadow_shiny needs shadow, and so on."],
  ["", "Lucky, XXL, XXS and 100% also tick Caught. If caught is FALSE on the same row, the row is reported instead."],
  ["", "Unticking a dex unticks what depends on it: unticking caught also unticks shiny, shiny3, lucky, xxl, xxs and 100%."],
  ["", "Changes made by these rules are listed separately in the summary."],
  [],
  ["Rows and columns"],
  ["", "Rows are matched by ID. Don't change IDs; the other info columns (No, Name, Form type) are only for you."],
  ["", "Name ends in ♂ or ♀ where you tick male and female separately."],
  ["", "Column names are the dex keys. A tab or column you delete leaves that dex as it is."],
  ["", "Dexes you've switched off in Settings aren't in the file and are never changed by an upload."],
  [],
  ["Tabs in this file"],
  ...tabs.map((t) => [t.name, t.columns.map((c) => c.key).join(", ")]),
];

/** The spreadsheet's sheets: Instructions, then one tab per dex group. */
export function buildWorkbook(all: Pokemon[], ticks: TickMap, day: string, profile: Profile & { nickname?: string | null }): SheetSpec[] {
  const tabs = sheetTabs(profile);
  const hasTwin = new Set(all.filter((x) => x.gender_of).map((x) => x.gender_of!));
  const sheets: SheetSpec[] = [{ name: "Instructions", rows: INSTRUCTIONS(tabs, profile.nickname ?? "", day), colWidths: [22, 110], header: false }];
  for (const tab of tabs) {
    const rows: Cell[][] = [[...INFO_COLUMNS, ...tab.columns.map((c) => c.key)]];
    for (const r of tabRows(tab, all, day, profile)) {
      const gendered = tab.columns.some((d) => genderOn(d.key, profile)) && hasTwin.has(r.base.id);
      rows.push([
        r.p.id, r.p.species,
        gendered ? `${displayName(r.p)} ${r.female ? "♀" : "♂"}` : displayName(r.p),
        r.p.form_type,
        ...tab.columns.map((d) => (cellOpen(r, d, day, profile) === "open" ? value(ticks, d.key, r.p.id) : null)),
      ]);
    }
    sheets.push({ name: tab.name, rows, colWidths: [24, 7, 34, 14, ...tab.columns.map(() => 14)] });
  }
  return sheets;
}

// ---- upload ----

export type FaultReason =
  | "noId" | "unknownId" | "notInTab" | "duplicate" | "badValue" | "notReleased" | "genderOff"
  | "cantWant" | "needsParent";
export interface Faulty { tab: string; row: number; id: string; column?: string; reason: FaultReason; detail?: string }

export const FAULT_TEXT: Record<FaultReason, string> = {
  noId: "ID is empty",
  unknownId: "Unknown ID",
  notInTab: "This Pokémon isn't in this tab's dexes",
  duplicate: "Appears more than once for this dex",
  badValue: "Must be TRUE, FALSE, WANTED or empty",
  notReleased: "Not released yet, can't be ticked",
  genderOff: "♀ row, but this dex doesn't track gender",
  cantWant: "WANTED isn't used in this dex",
  needsParent: "Can't be ticked while its regular tick is FALSE",
};

/** Per dex: what the file changes, and what the rules change on top. */
export interface DexSummary {
  dex: string; tab: string;
  ticked: number; unticked: number; wantedOn: number; wantedOff: number; unchanged: number;
  alsoTicked: number; alsoUnticked: number;
}

export interface SheetResult {
  summary: DexSummary[];
  faulty: Faulty[];
  changes: SheetChanges;
  /** Sheets that weren't read (no ID column or no dex columns), columns that weren't used, dexes left as they are. */
  ignoredTabs: string[];
  ignoredColumns: { tab: string; column: string; why: string }[];
  untouched: string[];
  error?: "noTabs";
}

/** TRUE/FALSE/WANTED as spreadsheets store them (Swedish Excel writes SANT/FALSKT in CSV). Empty means FALSE. */
function parse(v: Cell): TickState | null | "bad" {
  if (v === null) return null;
  if (typeof v === "boolean") return v ? { collected: true, wanted: false } : null;
  if (typeof v === "number") return v === 1 ? { collected: true, wanted: false } : v === 0 ? null : "bad";
  const s = v.trim().toUpperCase();
  if (s === "" || s === "FALSE" || s === "FALSKT") return null;
  if (s === "TRUE" || s === "SANT") return { collected: true, wanted: false };
  if (s === "WANTED") return { collected: true, wanted: true };
  return "bad";
}

/** Turns uploaded sheets into tick changes, following the app's tick rules. Nothing is saved here. */
export function applyWorkbook(sheets: { name: string; rows: Cell[][] }[], all: Pokemon[], ticks: TickMap, day: string, profile: Profile): SheetResult {
  const result: SheetResult = { summary: [], faulty: [], changes: new Map(), ignoredTabs: [], ignoredColumns: [], untouched: [] };
  const visible = profile.visible_dexes;
  const byId = new Map(all.map((p) => [p.id, p]));
  const tabOf = new Map<string, string>(); // dex → tab it was read from
  /** What the file asks for, per dex and row (null = not ticked). */
  const wanted = new Map<string, Map<string, TickState | null>>();
  const fileSays = (dex: string, id: string) => wanted.get(dex)?.get(id);
  const rowAt = new Map<string, number>(); // "dex|id" → spreadsheet row, for reports

  for (const sheet of sheets) {
    const headerAt = sheet.rows.findIndex((r) => r.some((c) => c !== null && String(c).trim() !== ""));
    const header = (sheet.rows[headerAt] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
    const cId = header.indexOf("id");
    const cols: { i: number; dex: Dex }[] = [];
    header.forEach((h, i) => {
      if (i === cId || !h || INFO_COLUMNS.some((x) => x.toLowerCase() === h)) return;
      const dex = dexByKey(h);
      if (!dex) result.ignoredColumns.push({ tab: sheet.name, column: h, why: "not a dex" });
      else if (!isOn(dex.key, visible)) result.ignoredColumns.push({ tab: sheet.name, column: h, why: "switched off in Settings" });
      else if (tabOf.has(dex.key)) result.ignoredColumns.push({ tab: sheet.name, column: h, why: `already read from ${tabOf.get(dex.key)}` });
      else cols.push({ i, dex });
    });
    if (cId < 0 || cols.length === 0) {
      if (sheet.name.toLowerCase() !== "instructions") result.ignoredTabs.push(sheet.name);
      continue;
    }
    for (const { dex } of cols) { tabOf.set(dex.key, sheet.name); wanted.set(dex.key, new Map()); }

    for (let i = headerAt + 1; i < sheet.rows.length; i++) {
      const r = sheet.rows[i] ?? [];
      if (r.every((c) => c === null || String(c).trim() === "")) continue;
      const id = String(r[cId] ?? "").trim();
      const fail = (reason: FaultReason, column?: string) => result.faulty.push({ tab: sheet.name, row: i + 1, id, column, reason });
      if (!id) { fail("noId"); continue; }
      const p = byId.get(id);
      if (!p) { fail("unknownId"); continue; }
      const base = p.gender_of ? byId.get(p.gender_of) ?? p : p;
      const row: SheetRow = { p, base, female: !!p.gender_of };
      if (!collectible(p) || !cols.some(({ dex }) => dex.includes(base))) { fail("notInTab"); continue; }
      for (const { i: c, dex } of cols) {
        const v = parse(r[c] ?? null);
        if (v === "bad") { fail("badValue", dex.key); continue; }
        const open = cellOpen(row, dex, day, profile);
        if (open !== "open") {
          // Ignored cells: only a tick there is a mistake worth reporting.
          if (v && open !== "notInDex") fail(open === "genderOff" ? "genderOff" : "notReleased", dex.key);
          continue;
        }
        if (v?.wanted && !canWant(dex.key)) { fail("cantWant", dex.key); continue; }
        const m = wanted.get(dex.key)!;
        if (m.has(id)) { fail("duplicate", dex.key); continue; }
        m.set(id, v);
        rowAt.set(`${dex.key}|${id}`, i + 1);
      }
    }
  }
  if (wanted.size === 0) return { ...result, error: "noTabs" };

  // A tick needs its parent: a parent the file unticks makes it a fault; one the file leaves out gets ticked too.
  const current = (dex: string, id: string) => ticks.get(dex)?.get(id);
  const final = new Map<string, Map<string, TickState | null>>();
  const set = (dex: string, id: string, v: TickState | null) => {
    let m = final.get(dex);
    if (!m) final.set(dex, (m = new Map()));
    m.set(id, v);
  };
  const ruleTicked = new Map<string, Set<string>>();
  const ruleUnticked = new Map<string, Set<string>>();
  const mark = (m: Map<string, Set<string>>, dex: string, id: string) => {
    let s = m.get(dex);
    if (!s) m.set(dex, (s = new Set()));
    s.add(id);
  };
  for (const [dex, m] of wanted) {
    for (const [id, v] of m) {
      if (v) {
        // Walk up: shiny3 → shiny → caught.
        let parent = parentOf(dex);
        let ok = true;
        const toTick: string[] = [];
        while (parent) {
          const says = fileSays(parent, id);
          if (says === null) { ok = false; break; }
          if (says === undefined && !current(parent, id)?.collected) toTick.push(parent);
          if (says !== undefined) break;
          parent = parentOf(parent);
        }
        if (!ok) {
          // Still ticked from before while its parent is unticked: the rule unticks it, no need to report.
          if (current(dex, id)?.collected) { m.delete(id); continue; }
          result.faulty.push({ tab: tabOf.get(dex)!, row: rowAt.get(`${dex}|${id}`) ?? 0, id, column: dex, reason: "needsParent", detail: parentOf(dex) ?? undefined });
          m.delete(id);
          continue;
        }
        for (const t of toTick) { set(t, id, { collected: true, wanted: false }); mark(ruleTicked, t, id); }
      }
      set(dex, id, v);
    }
  }
  // Unticking unticks what depends on it (wherever it is, even in dexes not in the file).
  const untickBelow = (dex: string, id: string) => {
    for (const c of childrenOf(dex)) {
      if (final.get(c)?.get(id)) continue; // ticked by the file (already checked above)
      if (current(c, id)?.collected && final.get(c)?.get(id) !== null) { set(c, id, null); mark(ruleUnticked, c, id); }
      untickBelow(c, id);
    }
  };
  for (const [dex, m] of [...final]) for (const [id, v] of [...m]) if (v === null) untickBelow(dex, id);

  // Changes against the current ticks, and the summary.
  const keys = new Set([...wanted.keys(), ...final.keys()]);
  for (const dex of DEXES.map((d) => d.key).filter((k) => keys.has(k))) {
    const s: DexSummary = { dex, tab: tabOf.get(dex) ?? "", ticked: 0, unticked: 0, wantedOn: 0, wantedOff: 0, unchanged: 0, alsoTicked: 0, alsoUnticked: 0 };
    const changes = new Map<string, TickState | null>();
    for (const [id, v] of final.get(dex) ?? []) {
      const cur = current(dex, id);
      const was = cur?.collected ? { collected: true, wanted: !!cur.wanted } : null;
      const byRule = ruleTicked.get(dex)?.has(id) || ruleUnticked.get(dex)?.has(id);
      if (!was && !v) { s.unchanged++; continue; }
      if (was && v && was.wanted === v.wanted) { s.unchanged++; continue; }
      changes.set(id, v);
      if (byRule) { if (v) s.alsoTicked++; else s.alsoUnticked++; continue; }
      if (!was) { s.ticked++; if (v!.wanted) s.wantedOn++; } else if (!v) s.unticked++;
      else if (v.wanted) s.wantedOn++; else s.wantedOff++;
    }
    if (changes.size) result.changes.set(dex, changes);
    result.summary.push(s);
  }
  // Switched-on dexes the file didn't include (and the rules didn't touch) stay as they are.
  result.untouched = sheetTabs(profile).flatMap((t) => t.columns.map((c) => c.key)).filter((k) => !wanted.has(k) && !result.changes.has(k));
  result.faulty.sort((a, b) => a.tab.localeCompare(b.tab) || a.row - b.row);
  return result;
}
