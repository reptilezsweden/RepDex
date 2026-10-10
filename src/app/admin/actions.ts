"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, rowFromForm } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminState = { error?: string; message?: string } | undefined;

function refresh() {
  revalidateTag("pokemon");
  revalidateTag("gens");
  revalidatePath("/", "layout");
}

/** Save an existing Pokémon (originalId) or add a new one (no originalId). */
export async function savePokemon(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const { row, error } = rowFromForm(form);
  if (error) return { error };
  const originalId = String(form.get("original_id") ?? "");
  const supabase = await createClient();
  const res = originalId
    ? await supabase.from("pokemon").update(row).eq("id", originalId).select("id")
    : await supabase.from("pokemon").insert(row).select("id");
  if (res.error) {
    return { error: res.error.code === "23505" ? `ID "${String(row.id)}" already exists. IDs must be unique.` : res.error.message };
  }
  if (!res.data?.length) return { error: "Nothing was saved. Check that you're signed in as admin." };
  refresh();
  if (!originalId || originalId !== row.id) redirect(`/admin/pokemon/${encodeURIComponent(String(row.id))}?saved=1`);
  return { message: "Saved." };
}

export async function deletePokemon(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("pokemon").delete().eq("id", id);
  if (error) redirect(`/admin/pokemon/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`);
  refresh();
  redirect("/admin/pokemon?deleted=" + encodeURIComponent(id));
}

export async function saveGen(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const original = String(form.get("original_gen_nr") ?? "");
  const gen_nr = Number(form.get("gen_nr"));
  const region = String(form.get("region") ?? "").trim();
  const prefix_name = String(form.get("prefix_name") ?? "").trim();
  if (!Number.isFinite(gen_nr) || !region || !prefix_name) return { error: "Fill in number, region and prefix name." };
  const supabase = await createClient();
  const res = original
    ? await supabase.from("gens").update({ gen_nr, region, prefix_name }).eq("gen_nr", Number(original)).select("gen_nr")
    : await supabase.from("gens").insert({ gen_nr, region, prefix_name }).select("gen_nr");
  if (res.error) return { error: res.error.code === "23505" ? `Generation ${gen_nr} already exists.` : res.error.message };
  refresh();
  return { message: original ? "Saved." : "Added." };
}

export async function setRole(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const role = form.get("role") === "admin" ? "admin" : "user";
  // You can't remove your own admin rights; ask another admin.
  if (id === me.id && role !== "admin") redirect("/admin/users?error=self");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/** Put one logged field back to its previous value. */
export async function revertChange(form: FormData) {
  await requireAdmin();
  const logId = Number(form.get("log_id"));
  const supabase = await createClient();
  const { data: entry, error } = await supabase.from("change_log").select("*").eq("id", logId).single();
  if (error || !entry) redirect("/admin/log?error=" + encodeURIComponent(error?.message ?? "Change not found"));
  if (entry.field.startsWith("(")) redirect("/admin/log?error=" + encodeURIComponent("Added or deleted rows can't be reverted here."));
  const key = entry.table_name === "gens" ? "gen_nr" : "id";
  const res = await supabase.from(entry.table_name).update({ [entry.field]: entry.old_value }).eq(key, entry.row_id).select(key);
  if (res.error || !res.data?.length) {
    redirect("/admin/log?error=" + encodeURIComponent(res.error?.message ?? "The row no longer exists."));
  }
  refresh();
  redirect("/admin/log?reverted=" + logId);
}
