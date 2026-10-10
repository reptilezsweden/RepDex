"use client";

import { createBrowserClient } from "@supabase/ssr";
import { REMEMBER_COOKIE, SUPABASE_KEY, SUPABASE_URL, applyRemember } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

function readCookies() {
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((c) => {
      const i = c.indexOf("=");
      return { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) };
    });
}

export function createClient() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: readCookies,
      setAll(list) {
        const remember = readCookies().find((c) => c.name === REMEMBER_COOKIE)?.value !== "0";
        for (const { name, value, options } of list) {
          const o = applyRemember(options, remember) as { maxAge?: number; path?: string; sameSite?: string; secure?: boolean };
          let s = `${name}=${encodeURIComponent(value)}; path=${o.path ?? "/"}`;
          if (o.maxAge !== undefined) s += `; max-age=${o.maxAge}`;
          if (o.sameSite) s += `; samesite=${o.sameSite}`;
          if (o.secure) s += "; secure";
          document.cookie = s;
        }
      },
    },
  });
  return client;
}
