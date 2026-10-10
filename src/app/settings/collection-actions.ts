"use server";

import { applySheet, SHEET_DEXES, type Faulty } from "@/lib/collection-sheet";
import { getPokemon } from "@/lib/data";
import { today } from "@/lib/dexes";
import { createClient } from "@/lib/supabase/server";
import { byDex, getTicks } from "@/lib/ticks";
import { readCsv, readXlsx, type Cell } from "@/lib/xlsx";

export type UploadState =
  | { done: true; updated: number; unchanged: number; faulty: Faulty[]; faultyCount: number }
  | { done?: false; error: string }
  | undefined;

const MAX_BYTES = 4 * 1024 * 1024;
const CHUNK = 500;
/** Faulty rows listed in the report; the count still covers all of them. */
const MAX_LISTED = 200;

/** Reads an uploaded collection spreadsheet and saves the changed ticks. Error values are i18n keys. */
export async function uploadCollection(_: UploadState, form: FormData): Promise<UploadState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "errorGeneric" };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "chooseFile" };
  if (file.size > MAX_BYTES) return { error: "fileTooBig" };

  const buf = new Uint8Array(await file.arrayBuffer());
  let rows: Cell[][];
  try {
    // .xlsx files are zip files and start with "PK"; anything else is read as CSV.
    rows = buf[0] === 0x50 && buf[1] === 0x4b ? readXlsx(buf) : readCsv(new TextDecoder().decode(buf));
  } catch {
    return { error: "fileUnreadable" };
  }

  const [all, ticks] = await Promise.all([getPokemon(), getTicks(SHEET_DEXES)]);
  const result = applySheet(rows, all, byDex(ticks), today());
  if (result.error) return { error: `sheetErrors.${result.error}` };

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
  const saved = await Promise.all(calls);
  if (saved.some((r) => r.error)) return { error: "errorGeneric" };

  return {
    done: true,
    updated: result.updated,
    unchanged: result.unchanged,
    faulty: result.faulty.slice(0, MAX_LISTED),
    faultyCount: result.faulty.length,
  };
}
