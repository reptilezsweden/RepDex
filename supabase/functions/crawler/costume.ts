// New costume/event Pokémon: rows the wiki lists that RepDex doesn't have yet.
// The image is looked for in the synced asset folder as pm<nr>.<CODE>.icon.png among the
// files no row uses yet; the row ID then follows the image (0025_fHALLOWEEN_2026).

import type { Entry } from "./parse.ts";
import { hintTokens, type Row } from "./match.ts";

const TREE = "https://api.github.com/repos/reptilezsweden/RepDex/git/trees/main:" +
  encodeURIComponent("Images/Pokemon - 256x256/Addressable Assets");

/** File names in the image folder (empty when GitHub can't be reached). */
export async function imageFiles(ua: string): Promise<string[]> {
  try {
    const res = await fetch(TREE, { headers: { "User-Agent": ua, Accept: "application/vnd.github+json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tree ?? []).map((t: { path: string }) => t.path);
  } catch {
    return [];
  }
}

const codeWords = (code: string) =>
  code.replace(/^[cf]/, "").toLowerCase().split(/_+/).filter(Boolean);

/** Unused form/costume image codes per species number. */
export function unusedCodes(files: string[], rows: Row[]): Map<number, string[]> {
  const used = new Set(rows.flatMap((r) => [r.image_regular as string | null, r.id]).filter(Boolean));
  const out = new Map<number, string[]>();
  for (const f of files) {
    const m = f.match(/^pm(\d+)\.([cf][A-Za-z0-9_]+)\.icon\.png$/);
    if (!m || used.has(f)) continue;
    const nr = Number(m[1]);
    if (used.has(`${String(nr).padStart(4, "0")}_${m[2]}`)) continue;
    const list = out.get(nr) ?? [];
    list.push(m[2]);
    out.set(nr, list);
  }
  return out;
}

/** The image code for a new costume: one sharing words with the wiki entry, or the only one from that year. */
export function pickCode(e: Entry, codes: string[]): string | null {
  if (codes.length === 0) return null;
  const hint = hintTokens(e);
  const year = e.date.slice(0, 4);
  const scored = codes.map((c) => {
    const w = codeWords(c);
    const words = hint.filter((h) => w.some((x) => x === h || (Math.min(x.length, h.length) >= 3 && (x.startsWith(h) || h.startsWith(x))))).length;
    return { c, words, year: w.includes(year) ? 1 : 0 };
  });
  const best = Math.max(...scored.map((s) => s.words * 2 + s.year));
  if (best <= 0) return null;
  const top = scored.filter((s) => s.words * 2 + s.year === best);
  return top.length === 1 ? top[0].c : null;
}

const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** A new Costume row, copying species details from the species' regular row. */
export function newCostumeRow(
  e: Entry, base: Row, speciesRows: Row[], code: string | null, files: Set<string>, taken: Set<string>,
): Record<string, unknown> {
  const nr = base.species;
  const hint = hintTokens(e);
  let id = code
    ? `${String(nr).padStart(4, "0")}_${code}`
    : `${String(nr).padStart(4, "0")}_c${hint.join("_").toUpperCase() || "EVENT"}`;
  const plain = id;
  for (let i = 2; taken.has(id); i++) id = `${plain}_${i}`;
  taken.add(id);
  const regular = code ? `pm${nr}.${code}.icon.png` : null;
  const shiny = code && files.has(`pm${nr}.${code}.s.icon.png`) ? `pm${nr}.${code}.s.icon.png` : null;
  // Form name from the image code when there is one ("fHALLOWEEN_2026" → "Halloween 2026"), else from the wiki.
  const words = code ? codeWords(code) : hint.join(" ").replace(/([a-z])(\d)/g, "$1 $2").split(" ");
  const form = title(words.join(" ").trim()) || "Event";
  return {
    id,
    sort_order: Math.max(...speciesRows.map((r) => Number(r.sort_order ?? 0))),
    dex_caught: false,
    dex_lucky: true,
    gen_nr: base.gen_nr,
    form_type: "Costume",
    image_regular: regular,
    image_shiny: shiny,
    species: nr,
    name: base.name,
    type1: base.type1,
    type2: base.type2,
    family: base.family,
    stage: base.stage,
    classification: base.classification,
    form,
    alt_name: `${form} ${base.name}`,
  };
}
