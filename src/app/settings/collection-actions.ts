"use server";

import { applyWorkbook, FAULT_TEXT, type DexSummary } from "@/lib/collection-sheet";
import { getPokemon } from "@/lib/data";
import { dexByKey, today } from "@/lib/dexes";
import { getProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { byDex, getTicks } from "@/lib/ticks";
import { readCsv, readXlsxSheets, type Cell } from "@/lib/xlsx";

/** One skipped row, ready to show (English, like the spreadsheet). */
export interface SkippedRow { tab: string; row: number; id: string; column?: string; text: string }

export type UploadResult =
  | {
    ok: true;
    saved: boolean;
    summary: (DexSummary & { name: string })[];
    skipped: SkippedRow[];
    skippedCount: number;
    ignoredTabs: string[];
    ignoredColumns: { tab: string; column: string; why: string }[];
    untouched: string[];
  }
  | { ok: false; error: string };

const MAX_BYTES = 4 * 1024 * 1024;
const CHUNK = 500;
/** Skipped rows sent back; the count still covers all of them. */
const MAX_LISTED = 1000;

/**
 * Reads an uploaded collection spreadsheet. With save = false only reports what would change;
 * with save = true also saves it. Errors are plain English.
 */
async function handle(form: FormData, save: boolean): Promise<UploadResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "You're not signed in." };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "You're not signed in." };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file first." };
  if (file.size > MAX_BYTES) return { ok: false, error: "The file is too big (max 4 MB)." };
  const buf = new Uint8Array(await file.arrayBuffer());
  let sheets: { name: string; rows: Cell[][] }[];
  try {
    // .xlsx files are zip files and start with "PK"; anything else is read as one tab of CSV.
    sheets = buf[0] === 0x50 && buf[1] === 0x4b
      ? readXlsxSheets(buf)
      : [{ name: file.name.replace(/\.[^.]*$/, "") || "CSV", rows: readCsv(new TextDecoder().decode(buf)) }];
  } catch {
    return { ok: false, error: "The file couldn't be read. Upload the .xlsx from the download, or a .csv of one of its tabs." };
  }

  const [all, ticks] = await Promise.all([getPokemon(), getTicks()]);
  const result = applyWorkbook(sheets, all, byDex(ticks), today(), profile);
  if (result.error) {
    return { ok: false, error: "No tab in the file has an ID column and a dex column (like caught). Use the file from Download." };
  }

  if (save) {
    const userId = auth.user.id;
    const calls: PromiseLike<{ error: unknown }>[] = [];
    for (const [dex, changes] of result.changes) {
      const upserts = [...changes].filter(([, v]) => v)
        .map(([id, v]) => ({ user_id: userId, pokemon_id: id, dex, collected: v!.collected, wanted: v!.wanted }));
      const deletes = [...changes].filter(([, v]) => !v).map(([id]) => id);
      for (let i = 0; i < upserts.length; i += CHUNK) calls.push(supabase.from("ticks").upsert(upserts.slice(i, i + CHUNK)));
      for (let i = 0; i < deletes.length; i += CHUNK) {
        calls.push(supabase.from("ticks").delete().eq("user_id", userId).eq("dex", dex).in("pokemon_id", deletes.slice(i, i + CHUNK)));
      }
    }
    const done = await Promise.all(calls);
    if (done.some((r) => r.error)) return { ok: false, error: "Saving failed. Nothing or only part was saved; check the file and try again." };
  }

  return {
    ok: true,
    saved: save,
    summary: result.summary.map((s) => ({ ...s, name: dexByKey(s.dex)?.name.en ?? s.dex })),
    skipped: result.faulty.slice(0, MAX_LISTED).map((f) => ({
      tab: f.tab, row: f.row, id: f.id, column: f.column,
      text: f.reason === "needsParent" && f.detail ? `Ticked, but ${f.detail} is FALSE` : FAULT_TEXT[f.reason],
    })),
    skippedCount: result.faulty.length,
    ignoredTabs: result.ignoredTabs,
    ignoredColumns: result.ignoredColumns,
    untouched: result.untouched.map((k) => dexByKey(k)?.name.en ?? k),
  };
}

/** Step 1: what the file would change. Nothing is saved. */
export async function previewCollection(form: FormData): Promise<UploadResult> {
  return handle(form, false);
}

/** Step 2: save the file's changes (read again, against the ticks as they are now). */
export async function saveCollection(form: FormData): Promise<UploadResult> {
  return handle(form, true);
}
