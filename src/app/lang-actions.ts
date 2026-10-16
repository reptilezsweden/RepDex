"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, asLang } from "@/lib/i18n";

/** Language for visitors who aren't signed in (signed-in users choose it in Settings). */
export async function setLanguage(form: FormData) {
  const language = asLang(String(form.get("language")));
  (await cookies()).set(LANG_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  revalidatePath("/", "layout");
}
