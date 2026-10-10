"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NICKNAME_RE, cleanNickname } from "@/lib/nickname";
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

async function checkNickname(nickname: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  if (!NICKNAME_RE.test(nickname)) return "nicknameInvalid";
  const { data, error } = await supabase.rpc("nickname_available", { name: nickname });
  if (error) return null; // Availability can't be checked; the database still enforces uniqueness.
  return data === false ? "nicknameTaken" : null;
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const nickname = cleanNickname(form.get("nickname"));
  const problem = await checkNickname(nickname, supabase);
  if (problem) return { error: problem };
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/`, data: { nickname } },
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

/** Set or change the signed-in user's nickname (profile and account data). */
export async function setNickname(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const nickname = cleanNickname(form.get("nickname"));
  const current = String(auth.user.user_metadata?.nickname ?? "");
  if (nickname.toLowerCase() !== current.toLowerCase()) {
    const problem = await checkNickname(nickname, supabase);
    if (problem) return { error: problem };
  } else if (!NICKNAME_RE.test(nickname)) {
    return { error: "nicknameInvalid" };
  }
  const { error } = await supabase.from("profiles").update({ nickname }).eq("id", auth.user.id);
  // 42703 = column missing (migration 0006 not run yet): still save it on the account so nobody is locked out.
  if (error && error.code !== "42703") return { error: error.code === "23505" ? "nicknameTaken" : error.message };
  // Also kept on the account, so every page can check it without a database lookup.
  await supabase.auth.updateUser({ data: { nickname } });
  if (form.get("next") === "home") redirect("/");
  return { message: "saved" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
