"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ALWAYS_ON, BASE_DEXES, SHINY_KEYS } from "@/lib/dexes";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { saved?: boolean; error?: string } | undefined;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };

  const language = asLang(String(form.get("language")));
  const chosen = new Set(form.getAll("dex").map(String));
  // Caught is always on; "Show shiny" switches every shiny star except Shiny ⭐⭐⭐, which has its own choice.
  const visible = [
    ...BASE_DEXES.filter((d) => d.key === ALWAYS_ON || chosen.has(d.key)).map((d) => d.key),
    ...(form.get("shiny") === "on" ? SHINY_KEYS : []),
    ...(form.get("shiny3") === "on" ? ["shiny3"] : []),
  ];
  const { error } = await supabase
    .from("profiles")
    .update({
      language,
      all_forms: form.get("all_forms") === "on",
      visible_dexes: visible,
    })
    .eq("id", auth.user.id);
  if (error) return { error: error.message };

  (await cookies()).set(LANG_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { saved: true };
}
