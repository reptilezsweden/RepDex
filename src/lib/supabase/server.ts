import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, SUPABASE_KEY, SUPABASE_URL, applyRemember } from "./env";

export async function createClient(rememberOverride?: boolean) {
  const store = await cookies();
  const remember = rememberOverride ?? store.get(REMEMBER_COOKIE)?.value !== "0";
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, applyRemember(options, remember));
          }
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}
