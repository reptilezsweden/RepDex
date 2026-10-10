import type { Tick } from "./dexes";
import { createClient } from "./supabase/server";

/** The signed-in user's ticks, optionally only for some dexes. Paged past Supabase's 1,000-row limit. */
export async function getTicks(dexes?: string[]): Promise<Tick[]> {
  const supabase = await createClient();
  const out: Tick[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from("ticks").select("pokemon_id,dex,collected,wanted").range(from, from + 999);
    if (dexes) q = q.in("dex", dexes);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...((data ?? []) as Tick[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Ticks grouped by dex, keyed by pokemon id. */
export function byDex(ticks: Tick[]): Map<string, Map<string, Tick>> {
  const m = new Map<string, Map<string, Tick>>();
  for (const t of ticks) {
    let d = m.get(t.dex);
    if (!d) m.set(t.dex, (d = new Map()));
    d.set(t.pokemon_id, t);
  }
  return m;
}
