import { notFound } from "next/navigation";
import { getProfile } from "./session";
import { createClient } from "./supabase/server";

/** Stops non-admins: admin pages simply don't exist for them. Database rules enforce the same. */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") notFound();
  return profile;
}

export type FieldType = "text" | "int" | "number" | "bool" | "date" | "formType";

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
