"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function toggleEvents(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("event_crawler").update({ enabled: form.get("enabled") === "true" }).eq("id", 1);
  if (error) redirect(`/admin/events?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/events");
}

export async function runEvents() {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("events_run_now");
  redirect(error ? `/admin/events?error=${encodeURIComponent(error.message)}` : "/admin/events?started=1");
}
