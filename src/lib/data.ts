import { unstable_cache } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import type { Pokemon, PokemonText } from "./dexes";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/env";

const COLUMNS =
  "id,sort_order,dex_caught,dex_lucky,gen_nr,form_type,image_regular,image_shiny,species,family,stage,name,alt_name,type1,type2," +
  "released,release_shiny,release_shadow,release_shadow_shiny,release_dynamax,release_dynamax_shiny," +
  "evolves_from,evolve_candy,evolution_requirement,form,gender,row_gender,gender_diff,gender_of";

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
    const tr = await getTranslations(supabase);
    const byId = new Map(all.map((p) => [p.id, p]));
    return all.map((p) => {
      // Female twins use their original row's text.
      const src = p.gender_of ? byId.get(p.gender_of) ?? p : p;
      const texts: Partial<Record<string, PokemonText>> = {};
      for (const lang of tr.langs) {
        const t: PokemonText = {
          name: tr.species.get(`${src.species}|${lang}`) ?? null,
          form: tr.rows.get(`${src.id}|${lang}`)?.form ?? null,
          alt_name: tr.rows.get(`${src.id}|${lang}`)?.alt_name ?? null,
          requirement: src.evolution_requirement ? tr.phrases.get(`evolution_requirement|${src.evolution_requirement}|${lang}`) ?? null : null,
        };
        if (t.name || t.form || t.alt_name || t.requirement) texts[lang] = t;
      }
      return { ...p, gen_nr: Number(p.gen_nr), ...(Object.keys(texts).length ? { tr: texts } : {}) };
    });
  },
  ["pokemon-list-translations"],
  { revalidate: 60, tags: ["pokemon"] },
);

type Client = ReturnType<typeof createPlainClient>;

/** Every row of a table, paged past the 1,000-row limit. */
async function allRows<T>(supabase: Client, table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** The translation tables (migration 0028), keyed for lookups. */
async function getTranslations(supabase: Client) {
  const [species, rows, phrases] = await Promise.all([
    allRows<{ species: number; lang: string; name: string }>(supabase, "species_names", "species,lang,name"),
    allRows<{ pokemon_id: string; lang: string; form: string | null; alt_name: string | null }>(supabase, "pokemon_names", "pokemon_id,lang,form,alt_name"),
    allRows<{ kind: string; source: string; lang: string; text: string }>(supabase, "text_translations", "kind,source,lang,text"),
  ]);
  return {
    langs: [...new Set([...species, ...rows, ...phrases].map((x) => x.lang))],
    species: new Map(species.map((x) => [`${x.species}|${x.lang}`, x.name])),
    rows: new Map(rows.map((x) => [`${x.pokemon_id}|${x.lang}`, x])),
    phrases: new Map(phrases.map((x) => [`${x.kind}|${x.source}|${x.lang}`, x.text])),
  };
}

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
