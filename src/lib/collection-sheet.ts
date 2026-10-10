// The collection spreadsheet (docs/DESIGN.md, "Spreadsheet download and upload"): which rows it
// holds, and how an uploaded copy turns into tick changes.
import { CAUGHT_LINKED, collectible, dexByKey, dexRows, displayName, statusOf, type Pokemon, type Tick } from "./dexes";
import type { Cell } from "./xlsx";

type TickState = { collected: boolean; wanted: boolean };
export type SheetChanges = Map<string, Map<string, TickState | null>>;

export const SHEET_HEADER = ["caught", "caught_shiny", "ID", "form_type", "species", "name"];
/** Dexes the upload reads and may change: Caught and Shiny, plus the ones unticked along with them. */
export const SHEET_DEXES = ["caught", "shiny", "shiny3", ...CAUGHT_LINKED];

const caughtDex = () => dexByKey("caught")!;
const shinyDex = () => dexByKey("shiny")!;

/** Rows in the spreadsheet: everything that can be ticked in the Caught dex today. */
export function sheetRows(all: Pokemon[], day: string): Pokemon[] {
  const caught = caughtDex();
  return dexRows(all, caught).filter((p) => collectible(p) && statusOf(p, caught, day) === "available");
}

type TickMap = Map<string, Map<string, Tick>>;
const ticked = (ticks: TickMap, dex: string, id: string) => !!ticks.get(dex)?.get(id)?.collected;

/** The spreadsheet's cells. caught_shiny is left empty where the shiny isn't released yet. */
export function buildSheet(all: Pokemon[], ticks: TickMap, day: string): Cell[][] {
  const shiny = shinyDex();
  return [
    SHEET_HEADER,
    ...sheetRows(all, day).map((p) => [
      ticked(ticks, "caught", p.id),
      statusOf(p, shiny, day) === "available" ? ticked(ticks, "shiny", p.id) : null,
      p.id,
      p.form_type,
      p.species,
      displayName(p),
    ]),
  ];
}

export type FaultReason =
  | "noId" | "unknownId" | "notInCaught" | "battleOnly" | "notReleased" | "duplicate"
  | "badCaught" | "badShiny" | "shinyNotReleased" | "shinyWithoutCaught";
export interface Faulty { row: number; id: string; reason: FaultReason }
export interface SheetResult {
  unchanged: number;
  updated: number;
  faulty: Faulty[];
  changes: SheetChanges;
  /** Set when the file as a whole can't be used: the header row lacks ID or caught. */
  error?: "noHeader";
}

/** TRUE/FALSE as Excel and Google Sheets store them; Swedish Excel writes SANT/FALSKT in CSV files. Empty means FALSE. */
function bool(v: Cell): boolean | "bad" {
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : "bad";
  const s = v.trim().toUpperCase();
  if (s === "") return false;
  if (s === "TRUE" || s === "SANT") return true;
  if (s === "FALSE" || s === "FALSKT") return false;
  return "bad";
}

/** Turns uploaded rows into tick changes, skipping faulty rows. Rows are matched by ID. */
export function applySheet(rows: Cell[][], all: Pokemon[], ticks: TickMap, day: string): SheetResult {
  const result: SheetResult = { unchanged: 0, updated: 0, faulty: [], changes: new Map() };
  const headerAt = rows.findIndex((r) => r.some((c) => c !== null && String(c).trim() !== ""));
  const header = (rows[headerAt] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const [cCaught, cShiny, cId] = [col("caught"), col("caught_shiny"), col("id")];
  if (cId < 0 || cCaught < 0) {
    return { ...result, error: "noHeader" };
  }

  const byId = new Map(all.map((p) => [p.id, p]));
  const allowed = new Set(sheetRows(all, day).map((p) => p.id));
  const caught = caughtDex();
  const shiny = shinyDex();
  const seen = new Set<string>();
  const put = (dex: string, id: string, v: TickState | null) => {
    const m = result.changes.get(dex) ?? new Map();
    m.set(id, v);
    result.changes.set(dex, m);
  };
  const untick = (dex: string, id: string) => { if (ticks.get(dex)?.get(id)) put(dex, id, null); };

  for (let i = headerAt + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    if (r.every((c) => c === null || String(c).trim() === "")) continue;
    const id = String(r[cId] ?? "").trim();
    const fail = (reason: FaultReason) => result.faulty.push({ row: i + 1, id, reason });

    if (!id) { fail("noId"); continue; }
    const p = byId.get(id);
    if (!p) { fail("unknownId"); continue; }
    if (!allowed.has(id)) {
      fail(!caught.includes(p) ? "notInCaught" : !collectible(p) ? "battleOnly" : "notReleased");
      continue;
    }
    if (seen.has(id)) { fail("duplicate"); continue; }
    seen.add(id);

    const wantCaught = bool(r[cCaught] ?? null);
    if (wantCaught === "bad") { fail("badCaught"); continue; }
    const shinyReleased = statusOf(p, shiny, day) === "available";
    let wantShiny: boolean | "bad" | undefined;
    if (cShiny >= 0) {
      wantShiny = bool(r[cShiny] ?? null);
      if (wantShiny === "bad") { fail("badShiny"); continue; }
      if (wantShiny && !shinyReleased) { fail("shinyNotReleased"); continue; }
      if (wantShiny && !wantCaught) { fail("shinyWithoutCaught"); continue; }
      if (!shinyReleased) wantShiny = undefined;
    }

    let changed = false;
    if (wantCaught !== ticked(ticks, "caught", id)) {
      changed = true;
      if (wantCaught) put("caught", id, { collected: true, wanted: false });
      else for (const dex of SHEET_DEXES) untick(dex, id); // Unticking Caught unticks everything that follows it.
    }
    if (wantCaught && wantShiny !== undefined && wantShiny !== ticked(ticks, "shiny", id)) {
      changed = true;
      if (wantShiny) put("shiny", id, { collected: true, wanted: false });
      else { untick("shiny", id); untick("shiny3", id); }
    }
    if (changed) result.updated++;
    else result.unchanged++;
  }
  return result;
}
