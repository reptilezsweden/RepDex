"use client";

import { useState } from "react";
import { createClient } from "./supabase/client";

export type TickState = { collected: boolean; wanted: boolean };
export type TickChanges = Map<string, TickState | null>;

const CHUNK = 500;

/** The user's ticks for one dex, with optimistic saving to Supabase. */
export function useTicks(dexKey: string, userId: string, initial: ({ pokemon_id: string } & TickState)[]) {
  const [ticks, setTicks] = useState(
    () => new Map(initial.map((x) => [x.pokemon_id, { collected: x.collected, wanted: x.wanted }])),
  );
  const [error, setError] = useState(false);

  async function save(changes: TickChanges) {
    if (changes.size === 0) return;
    const before = new Map(ticks);
    setTicks((prev) => {
      const next = new Map(prev);
      for (const [id, v] of changes) {
        if (v) next.set(id, v);
        else next.delete(id);
      }
      return next;
    });

    const supabase = createClient();
    const upserts = [...changes]
      .filter(([, v]) => v)
      .map(([id, v]) => ({ user_id: userId, pokemon_id: id, dex: dexKey, collected: v!.collected, wanted: v!.wanted }));
    const deletes = [...changes].filter(([, v]) => !v).map(([id]) => id);

    const calls: PromiseLike<{ error: unknown }>[] = [];
    for (let i = 0; i < upserts.length; i += CHUNK) calls.push(supabase.from("ticks").upsert(upserts.slice(i, i + CHUNK)));
    for (let i = 0; i < deletes.length; i += CHUNK) {
      calls.push(supabase.from("ticks").delete().eq("dex", dexKey).in("pokemon_id", deletes.slice(i, i + CHUNK)));
    }
    const results = await Promise.all(calls);
    if (results.some((r) => r.error)) {
      setTicks(before);
      setError(true);
    } else setError(false);
  }

  return { ticks, save, error };
}
