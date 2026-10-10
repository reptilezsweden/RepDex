"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { REMEMBER_COOKIE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string } | undefined;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const remember = form.get("remember") === "on";
  // Set before signing in so the auth cookies are written with the right lifetime.
  (await cookies()).set(REMEMBER_COOKIE, remember ? "1" : "0", {
    path: "/", sameSite: "lax", secure: true, httpOnly: false, ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });
  const supabase = await createClient(remember);
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/");
  return { message: "checkEmail" };
}

export async function sendReset(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(String(form.get("email") ?? ""), {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the address has an account.
  return { message: "resetSent" };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: String(form.get("password") ?? "") });
  if (error) return { error: error.message };
  return { message: "passwordUpdated" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
