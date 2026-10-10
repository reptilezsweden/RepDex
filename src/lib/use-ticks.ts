"use client";

import { useState } from "react";
import { createClient } from "./supabase/client";

export type TickState = { collected: boolean; wanted: boolean };
export type TickChanges = Map<string, TickState | null>;
export type TickRow = { dex: string; pokemon_id: string } & TickState;

const CHUNK = 500;
const k = (dex: string, id: string) => `${dex}|${id}`;

/**
 * The user's ticks for one or more dexes (a regular dex plus its shiny toggles),
 * with optimistic saving to Supabase.
 */
export function useTicks(userId: string, initial: TickRow[]) {
  const [ticks, setTicks] = useState(
    () => new Map(initial.map((x) => [k(x.dex, x.pokemon_id), { collected: x.collected, wanted: x.wanted }])),
  );
  const [error, setError] = useState(false);

  const get = (dex: string, id: string) => ticks.get(k(dex, id));

  async function save(dex: string, changes: TickChanges) {
    if (changes.size === 0) return;
    let before: typeof ticks = ticks;
    setTicks((prev) => {
      before = prev;
      const next = new Map(prev);
      for (const [id, v] of changes) {
        if (v) next.set(k(dex, id), v);
        else next.delete(k(dex, id));
      }
      return next;
    });

    const supabase = createClient();
    const upserts = [...changes]
      .filter(([, v]) => v)
      .map(([id, v]) => ({ user_id: userId, pokemon_id: id, dex, collected: v!.collected, wanted: v!.wanted }));
    const deletes = [...changes].filter(([, v]) => !v).map(([id]) => id);

    const calls: PromiseLike<{ error: unknown }>[] = [];
    for (let i = 0; i < upserts.length; i += CHUNK) calls.push(supabase.from("ticks").upsert(upserts.slice(i, i + CHUNK)));
    for (let i = 0; i < deletes.length; i += CHUNK) {
      calls.push(supabase.from("ticks").delete().eq("dex", dex).in("pokemon_id", deletes.slice(i, i + CHUNK)));
    }
    const results = await Promise.all(calls);
    if (results.some((r) => r.error)) {
      setTicks(before);
      setError(true);
    } else setError(false);
  }

  /** Tick or untick a simple yes/no dex (used for the shiny stars). */
  function toggle(dex: string, rows: string[], target: string) {
    const on = rows.some((r) => get(dex, r)?.collected);
    const changes: TickChanges = new Map();
    if (on) for (const r of rows) { if (get(dex, r)) changes.set(r, null); }
    else changes.set(target, { collected: true, wanted: false });
    void save(dex, changes);
  }

  /** Mark or unmark a collected entry as wanted (puzzle piece) in a dex. */
  function toggleWanted(dex: string, rows: string[]) {
    const ticked = rows.filter((r) => get(dex, r)?.collected);
    if (ticked.length === 0) return;
    const wanted = ticked.some((r) => get(dex, r)?.wanted);
    const changes: TickChanges = new Map();
    if (wanted) for (const r of ticked) changes.set(r, { collected: true, wanted: false });
    else changes.set(ticked[0], { collected: true, wanted: true });
    void save(dex, changes);
  }

  return { get, save, toggle, toggleWanted, error };
}
