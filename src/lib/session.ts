import { cookies } from "next/headers";
import { cache } from "react";
import { DICTS, LANG_COOKIE, asLang, type Lang } from "./i18n";
import { createClient } from "./supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  role: "user" | "admin";
  language: Lang;
  all_forms: boolean;
  visible_dexes: string[] | null;
  /** Show upcoming and unreleased entries on dex pages (one setting for all dexes). */
  show_unavailable?: boolean;
}

/** Signed-in user's profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  return (data as Profile | null) ?? {
    id: auth.user.id, email: auth.user.email ?? null, role: "user", language: "en", all_forms: false, visible_dexes: null,
  };
});

export async function getLang(): Promise<Lang> {
  const profile = await getProfile();
  if (profile) return asLang(profile.language);
  return asLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: DICTS[lang] };
}
