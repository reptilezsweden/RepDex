/** Only the origin is used, so a pasted ".../rest/v1/" or trailing slash still works. */
function originOf(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export const SUPABASE_URL = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
// Newer projects issue a publishable key; older ones an anon key. Either works.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie set at sign-in: "0" when "Remember me" was unticked. */
export const REMEMBER_COOKIE = "rd-remember";

/** Without "Remember me", auth cookies become session cookies that end when the browser closes. */
export function applyRemember<T extends { maxAge?: number; expires?: Date }>(
  options: T | undefined,
  remember: boolean,
): Partial<T> {
  if (remember || !options) return options ?? {};
  // Keep deletions (maxAge 0) working.
  if (options.maxAge === 0) return options;
  const rest: Partial<T> = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
