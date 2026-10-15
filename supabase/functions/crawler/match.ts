// Matches wiki entries to rows of the availability list.

import type { Entry } from "./parse.ts";

export interface Row {
  id: string;
  species: number;
  name: string;
  alt_name: string | null;
  form_type: string;
  dex_caught: boolean;
  [field: string]: unknown;
}

export type SourceKey = "forms" | "shadow" | "dynamax" | "costumes";

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/♀/g, "f").replace(/♂/g, "m").replace(/[^a-z0-9]/g, "");

const STOP = new Set(["shiny", "icon", "form", "forme", "style", "the", "of", "pokemon", "go", "s", "t"]);
const SYMBOLS: Record<string, string> = { "!": "exclamation", "?": "question" };

function words(s: string): string[] {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/♀/g, " female ").replace(/♂/g, " male ")
    .split(/[^a-z0-9!?]+/)
    .flatMap((w) => (SYMBOLS[w] ? [SYMBOLS[w]] : w.split(/(?=[!?])/).map((x) => SYMBOLS[x] ?? x)))
    .filter((w) => w && !STOP.has(w))
    .map((w) => (/^\d+$/.test(w) ? String(Number(w)) : w)); // "Pattern 02" = "pattern 2"
}

/** Tokens describing a row's form: from its ID code (0646_fBLACK → black) and its display name. */
function rowTokens(r: Row): string[] {
  const code = r.id.split("_").slice(1).join("_").replace(/^[a-z]/, "");
  const fromId = code.toLowerCase().split("_").filter(Boolean);
  const species = new Set(words(r.name));
  const fromName = words(r.alt_name ?? "").filter((w) => !species.has(w));
  const all = [...fromId, ...fromName];
  return [...new Set([...all, fromId.join("")])];
}

/** Form words the wiki gives for an entry (form=, ci=, costume code), without the species name. */
export function hintTokens(e: Entry): string[] {
  const species = new Set(words(e.name));
  return [...new Set(words(`${e.form} ${e.ci} ${e.code}`).filter((w) => !species.has(w)))];
}

const close = (a: string, b: string) =>
  a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

export function fieldFor(source: SourceKey, e: Entry): string | null {
  if (source === "forms" || source === "costumes") return e.shiny ? "release_shiny" : "released";
  if (source === "shadow") return e.shiny ? "release_shadow_shiny" : "release_shadow";
  if (source === "dynamax") return e.gigantamax ? null : e.shiny ? "release_dynamax_shiny" : "release_dynamax";
  return null;
}

function candidatesFor(source: SourceKey, e: Entry, rows: Row[]): Row[] {
  if (source === "costumes") return rows.filter((r) => r.form_type === "Costume");
  if (source === "forms") {
    if (e.mega) return rows.filter((r) => r.form_type === "Mega");
    if (e.gigantamax) return rows.filter((r) => r.form_type === "Gigantamax");
    return rows.filter((r) => !["Costume", "Mega", "Gigantamax"].includes(r.form_type));
  }
  return rows.filter((r) => ["Regular", "Form", "Regional", "Gender"].includes(r.form_type));
}

export interface Match {
  key: string;
  label: string;
  /** Matched row, or null when it couldn't be decided. */
  row: Row | null;
  /** Several rows at once, for entries that stand for a group ("Minior (color core)" = every core). */
  rows?: Row[];
  candidates: Row[];
}

export function makeMatcher(rows: Row[]) {
  // Rows are grouped by species number; names are looked up from regular rows, since some form
  // rows carry extra words in their name ("Charizard X").
  const bySpecies = new Map<number, Row[]>();
  const speciesByName = new Map<string, number>();
  for (const r of rows) {
    const list = bySpecies.get(r.species) ?? [];
    list.push(r);
    bySpecies.set(r.species, list);
    if (r.form_type === "Regular" || !speciesByName.has(norm(r.name))) speciesByName.set(norm(r.name), r.species);
  }

  return function match(source: SourceKey, e: Entry, field: string): Match {
    const hint = hintTokens(e);
    const flags = [e.mega ? "mega" : "", e.gigantamax ? "gmax" : ""].filter(Boolean).join(",");
    const key = `${source}|${norm(e.name)}|${hint.join(" ")}|${flags}`;
    const label = `${e.mega ? "Mega " : ""}${e.gigantamax ? "Gigantamax " : ""}${e.name}${hint.length ? ` (${hint.join(" ")})` : ""}`;
    const candidates = candidatesFor(source, e, bySpecies.get(speciesByName.get(norm(e.name)) ?? -1) ?? []);
    if (candidates.length === 0) return { key, label, row: null, candidates };
    if (candidates.length === 1 && (hint.length === 0 || source !== "costumes")) return { key, label, row: candidates[0], candidates };

    // "Color core" and the like: every form matching the remaining words.
    const group = hint.filter((h) => h !== "color" && h !== "colour");
    if (group.length < hint.length && group.length > 0) {
      const all = candidates.filter((r) => group.every((h) => rowTokens(r).some((t) => close(h, t))));
      if (all.length > 1) return { key, label, row: null, rows: all, candidates };
    }

    if (hint.length > 0) {
      const scored = candidates.map((r) => {
        const toks = rowTokens(r);
        return { r, score: hint.filter((h) => toks.some((t) => close(h, t))).length };
      });
      const best = Math.max(...scored.map((s) => s.score));
      const top = scored.filter((s) => s.score === best);
      if (best > 0 && top.length === 1) return { key, label, row: top[0].r, candidates };
      // A tie with a battle-only form (Galarian Darmanitan: Standard or Zen) goes to the other one.
      const notBattle = top.filter((s) => !/battle/i.test(s.r.form_type));
      if (best > 0 && notBattle.length === 1) return { key, label, row: notBattle[0].r, candidates };
      if (best > 0) return { key, label, row: null, candidates: top.map((s) => s.r) };
    }
    // No form named (or none recognised): the regular row, when there is exactly one.
    if (source !== "costumes") {
      const regular = candidates.filter((r) => r.form_type === "Regular");
      if (regular.length === 1) return { key, label, row: regular[0], candidates };
      const plain = candidates.filter((r) => /_(REGULAR|fNORMAL)$/.test(r.id));
      if (plain.length === 1) return { key, label, row: plain[0], candidates };
    }
    // Last resort: exactly one candidate already has this date.
    const sameDate = candidates.filter((r) => r[field] === e.date);
    if (sameDate.length === 1) return { key, label, row: sameDate[0], candidates };
    return { key, label, row: null, candidates };
  };
}
