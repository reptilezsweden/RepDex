import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Clears the cached Pokémon list (and generations). Called by the database itself after any write to
 * the cached tables (migration 0030), with the crawler secret, so changes show at once while the cache
 * otherwise lasts a day.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret") ?? "";
  if (!secret) return Response.json({ error: "forbidden" }, { status: 403 });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: ok } = await supabase.rpc("check_revalidate_secret", { p_secret: secret });
  if (ok !== true) return Response.json({ error: "forbidden" }, { status: 403 });
  revalidateTag("pokemon");
  revalidateTag("gens");
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
