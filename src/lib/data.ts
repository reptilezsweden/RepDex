import { unstable_cache } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import type { Pokemon } from "./dexes";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";

const COLUMNS =
  "id,sort_order,dex_caught,dex_lucky,gen_nr,form_type,image_regular,image_shiny,species,family,name,alt_name,type1,type2," +
  "released,release_shiny,release_shadow,release_shadow_shiny,release_dynamax,release_dynamax_shiny";

const PAGE = 1000; // Supabase returns at most 1,000 rows per request.

/** The full availability list. Public data, cached for 1 minute across requests. */
export const getPokemon = unstable_cache(
  async (): Promise<Pokemon[]> => {
    const supabase = createPlainClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const all: Pokemon[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("pokemon")
        .select(COLUMNS)
        .order("sort_order")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      all.push(...((data ?? []) as unknown as Pokemon[]));
      if (!data || data.length < PAGE) break;
    }
    return all.map((p) => ({ ...p, gen_nr: Number(p.gen_nr) }));
  },
  ["pokemon-list"],
  { revalidate: 60, tags: ["pokemon"] },
);

export interface Gen { gen_nr: number; region: string; prefix_name: string }

export const getGens = unstable_cache(
  async (): Promise<Gen[]> => {
    const supabase = createPlainClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.from("gens").select("*").order("gen_nr");
    if (error) throw error;
    return ((data ?? []) as Gen[]).map((g) => ({ ...g, gen_nr: Number(g.gen_nr) }));
  },
  ["gens-list"],
  { revalidate: 3600, tags: ["gens"] },
);
