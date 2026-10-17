import { notFound } from "next/navigation";
import { getProfile } from "./session";
import { createClient } from "./supabase/server";
import { GENDERS } from "./dexes";

/** Stops non-admins: admin pages simply don't exist for them. Database rules enforce the same. */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") notFound();
  return profile;
}

export type FieldType = "text" | "int" | "number" | "bool" | "date" | "formType" | "gender";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  group: string;
  required?: boolean;
}

export const FORM_TYPES = ["Regular", "Costume", "Form", "Mega", "Regional", "Gigantamax", "Battle-Only Form", "Gender"];

/** Every editable column of the pokemon table, in form order. */
export const POKEMON_FIELDS: FieldDef[] = [
  { name: "id", label: "ID", type: "text", group: "Identity", required: true },
  { name: "species", label: "Species no.", type: "int", group: "Identity", required: true },
  { name: "name", label: "Name", type: "text", group: "Identity", required: true },
  { name: "alt_name", label: "Alt name (display name for forms)", type: "text", group: "Identity" },
  { name: "gender", label: "Gender", type: "gender", group: "Identity" },
  { name: "gen_nr", label: "Generation", type: "number", group: "Identity", required: true },
  { name: "sort_order", label: "Sort order", type: "int", group: "Identity", required: true },
  { name: "dex_caught", label: "In Caught dex", type: "bool", group: "Dex membership" },
  { name: "dex_lucky", label: "In Lucky dex", type: "bool", group: "Dex membership" },
  { name: "form_type", label: "Form type", type: "formType", group: "Form", required: true },
  { name: "form", label: "Form", type: "text", group: "Form" },
  { name: "regional", label: "Regional", type: "text", group: "Form" },
  { name: "image_regular", label: "Image (regular)", type: "text", group: "Images" },
  { name: "image_shiny", label: "Image (shiny)", type: "text", group: "Images" },
  { name: "type1", label: "Type 1", type: "text", group: "Types" },
  { name: "type2", label: "Type 2", type: "text", group: "Types" },
  { name: "family", label: "Family", type: "int", group: "Evolution" },
  { name: "stage", label: "Stage", type: "int", group: "Evolution" },
  { name: "evolve_candy", label: "Evolve candy", type: "int", group: "Evolution" },
  { name: "evolves_from", label: "Evolves from (ID)", type: "text", group: "Evolution" },
  { name: "evolution_requirement", label: "Evolution requirement", type: "text", group: "Evolution" },
  { name: "classification", label: "Classification", type: "text", group: "Classification" },
  { name: "region_lock", label: "Region lock", type: "text", group: "Classification" },
  { name: "release_event", label: "Release event", type: "text", group: "Origin" },
  { name: "how_to_get", label: "How to get", type: "text", group: "Origin" },
  { name: "released", label: "Released", type: "date", group: "Release dates" },
  { name: "release_shiny", label: "Shiny", type: "date", group: "Release dates" },
  { name: "release_shadow", label: "Shadow", type: "date", group: "Release dates" },
  { name: "release_shadow_shiny", label: "Shadow shiny", type: "date", group: "Release dates" },
  { name: "release_dynamax", label: "Dynamax", type: "date", group: "Release dates" },
  { name: "release_dynamax_shiny", label: "Dynamax shiny", type: "date", group: "Release dates" },
];

/** Turns submitted form values into a database row (empty text becomes null). */
export function rowFromForm(form: FormData): { row: Record<string, unknown>; error?: string } {
  const row: Record<string, unknown> = {};
  for (const f of POKEMON_FIELDS) {
    if (f.type === "bool") {
      row[f.name] = form.get(f.name) === "on";
      continue;
    }
    const raw = String(form.get(f.name) ?? "").trim();
    if (raw === "") {
      if (f.required) return { row, error: `${f.label} is required` };
      row[f.name] = null;
      continue;
    }
    if (f.type === "int" || f.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n) || (f.type === "int" && !Number.isInteger(n))) return { row, error: `${f.label} must be a number` };
      row[f.name] = n;
    } else if (f.type === "gender") {
      if (!GENDERS.includes(raw)) return { row, error: `${f.label} must be Both, Male, Female or None` };
      row[f.name] = raw;
    } else if (f.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { row, error: `${f.label} must be a date (YYYY-MM-DD)` };
      row[f.name] = raw;
    } else {
      row[f.name] = raw;
    }
  }
  return { row };
}

/** Full rows of the pokemon table, uncached, paged past the 1,000-row limit. */
export async function getAllPokemonFull(): Promise<Record<string, unknown>[]> {
  const supabase = await createClient();
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("pokemon").select("*").order("sort_order").range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Things waiting for an admin's decision, per admin section (only sections with something to decide). */
export async function adminPending(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { count } = await supabase.from("crawler_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  return { "/admin/crawler": count ?? 0 };
}

/** Languages with Pokémon translations in the admin (English is the pokemon table itself). */
export const TRANSLATION_LANGS: { lang: string; label: string }[] = [
  { lang: "ja", label: "Japanese" },
  { lang: "sv", label: "Swedish" },
];

/** A row's translations for the admin form, keyed tr_<lang>_<field> like the form inputs. */
export async function getRowTranslations(id: string, species: number): Promise<Record<string, string>> {
  const supabase = await createClient();
  const [names, rows] = await Promise.all([
    supabase.from("species_names").select("lang,name").eq("species", species),
    supabase.from("pokemon_names").select("lang,form,alt_name").eq("pokemon_id", id),
  ]);
  const out: Record<string, string> = {};
  for (const n of names.data ?? []) out[`tr_${n.lang}_name`] = n.name ?? "";
  for (const r of rows.data ?? []) {
    out[`tr_${r.lang}_form`] = r.form ?? "";
    out[`tr_${r.lang}_alt_name`] = r.alt_name ?? "";
  }
  return out;
}

/** Saves the translation inputs of the Pokémon form: filled-in values are stored, emptied ones removed. */
export async function saveRowTranslations(form: FormData, id: string, species: number): Promise<string | null> {
  const supabase = await createClient();
  const get = (lang: string, f: string) => String(form.get(`tr_${lang}_${f}`) ?? "").trim() || null;
  for (const { lang } of TRANSLATION_LANGS) {
    if (!form.has(`tr_${lang}_name`)) continue;
    const name = get(lang, "name");
    const r1 = name
      ? await supabase.from("species_names").upsert({ species, lang, name })
      : await supabase.from("species_names").delete().eq("species", species).eq("lang", lang);
    if (r1.error) return r1.error.message;
    const formName = get(lang, "form");
    const alt = get(lang, "alt_name");
    const r2 = formName || alt
      ? await supabase.from("pokemon_names").upsert({ pokemon_id: id, lang, form: formName, alt_name: alt })
      : await supabase.from("pokemon_names").delete().eq("pokemon_id", id).eq("lang", lang);
    if (r2.error) return r2.error.message;
  }
  return null;
}
