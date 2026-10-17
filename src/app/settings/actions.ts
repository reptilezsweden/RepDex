"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ALWAYS_ON, BASE_DEXES, GENDER_GROUPS, SETTING_GROUPS, SHINY_SETTINGS } from "@/lib/dexes";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { saved?: boolean; error?: string } | undefined;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };

  const language = asLang(String(form.get("language")));
  // Each switch stands for a group of dexes, e.g. "xxl,xxs".
  const chosen = new Set(form.getAll("dex").flatMap((v) => String(v).split(",")));
  const allFormsChosen = new Set(form.getAll("all_forms_dex").flatMap((v) => String(v).split(",")));
  const allFormsDexes = SETTING_GROUPS.flatMap((g) => g.keys).filter((k) => allFormsChosen.has(k));
  // Gender: one entry per gender group (its first dex key); see genderGroup for who follows whom.
  const genderChosen = new Set(form.getAll("gender_dex").map(String));
  const genderDexes = GENDER_GROUPS.map((g) => g.keys[0]).filter((k) => genderChosen.has(k));
  // Caught is always on; each shiny switch stands for its shiny dexes (Shadow/Purified: both).
  const shinyChosen = new Set(form.getAll("shiny_dex").flatMap((v) => String(v).split(",")));
  const visible = [
    ...BASE_DEXES.filter((d) => d.key === ALWAYS_ON || chosen.has(d.key)).map((d) => d.key),
    ...SHINY_SETTINGS.flatMap((x) => x.keys).filter((k) => shinyChosen.has(k)),
  ];
  const { error } = await supabase
    .from("profiles")
    .update({
      language,
      all_forms: allFormsDexes.length > 0,
      all_forms_dexes: allFormsDexes,
      visible_dexes: visible,
      gender_dexes: genderDexes,
    })
    .eq("id", auth.user.id);
  if (error) {
    if (error.message.includes("all_forms_dexes")) {
      return { error: "Run supabase/migrations/0007_all_forms_per_dex.sql in the Supabase SQL editor first." };
    }
    return { error: error.message };
  }

  (await cookies()).set(LANG_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { saved: true };
}
