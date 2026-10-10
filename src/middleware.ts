import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, SUPABASE_KEY, SUPABASE_URL, applyRemember } from "@/lib/supabase/env";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/share"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, applyRemember(options, remember));
        }
      },
    },
  });

  // Refreshes the session cookie when needed.
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!data.user && !PUBLIC.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Every user must have an in-game nickname before using the app.
  if (data.user && !data.user.user_metadata?.nickname && path !== "/nickname" && !path.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/nickname";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)"],
};
