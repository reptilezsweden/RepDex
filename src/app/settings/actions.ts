"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEXES } from "@/lib/dexes";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { saved?: boolean; error?: string } | undefined;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };

  const language = asLang(String(form.get("language")));
  const chosen = new Set(form.getAll("dex").map(String));
  const { error } = await supabase
    .from("profiles")
    .update({
      language,
      all_forms: form.get("all_forms") === "on",
      visible_dexes: DEXES.filter((d) => chosen.has(d.key)).map((d) => d.key),
    })
    .eq("id", auth.user.id);
  if (error) return { error: error.message };

  (await cookies()).set(LANG_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { saved: true };
}
