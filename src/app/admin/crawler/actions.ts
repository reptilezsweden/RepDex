"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

const back = (q: string) => redirect(`/admin/crawler?${q}`);

export async function toggleSource(form: FormData) {
  await requireAdmin();
  const key = String(form.get("key") ?? "");
  const enabled = form.get("enabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("crawler_sources").update({ enabled }).eq("key", key);
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/crawler");
}

export async function runCrawler() {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("crawler_run_now");
  back(error ? `error=${encodeURIComponent(error.message)}` : "started=1");
}

/**
 * One form holds the whole queue. The pressed button says what to do:
 * "approve:ID", "reject:ID", "ignore:ID", or "approve-selected" / "reject-selected" for the ticked rows.
 * Unmatched rows take the chosen Pokémon from their "pick_ID" field.
 */
export async function decideQueue(form: FormData) {
  await requireAdmin();
  const action = String(form.get("do") ?? "");
  const [verb, one] = action.split(":");
  const ids = one ? [one] : form.getAll("ids").map(String);
  if (ids.length === 0) back("error=" + encodeURIComponent("Tick at least one row first."));

  const supabase = await createClient();
  const errors: string[] = [];
  let done = 0;
  for (const id of ids) {
    const pick = String(form.get(`pick_${id}`) ?? "").trim() || null;
    const approve = verb.startsWith("approve");
    const { error } = await supabase.rpc("crawler_decide", {
      p_id: Number(id),
      p_approve: approve,
      p_pokemon_id: approve ? pick : null,
      p_ignore: verb === "ignore",
    });
    if (error) errors.push(`#${id}: ${error.message}`);
    else done++;
  }
  revalidateTag("pokemon");
  revalidatePath("/", "layout");
  const q = new URLSearchParams();
  q.set("done", String(done));
  if (errors.length) q.set("error", errors.slice(0, 5).join(" · ") + (errors.length > 5 ? ` (+${errors.length - 5} more)` : ""));
  back(q.toString());
}
