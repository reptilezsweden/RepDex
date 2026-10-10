"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dict } from "@/lib/i18n";
import type { FormState } from "./auth-actions";

type Mode = "login" | "signup" | "forgot" | "reset" | "nickname";

export function AuthForm({
  mode, t, action, initialError,
}: {
  mode: Mode;
  t: Dict;
  action: (s: FormState, f: FormData) => Promise<FormState>;
  initialError?: string;
}) {
  const initial: FormState = initialError ? { error: initialError } : undefined;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, initial);
  const title = { login: t.signIn, signup: t.signUp, forgot: t.forgotPassword, reset: t.setPassword, nickname: t.nicknameTitle }[mode];
  const submit = { login: t.signIn, signup: t.signUp, forgot: t.sendResetLink, reset: t.save, nickname: t.save }[mode];
  const errorText = state?.error ? (t as unknown as Record<string, string>)[state.error] ?? state.error : null;
  const message = state?.message ? (t as unknown as Record<string, string>)[state.message] ?? state.message : null;

  return (
    <form action={formAction} className="card-form">
      <h1>Rep<span style={{ color: "var(--accent)" }}>Dex</span> · {title}</h1>
      {errorText && <p className="msg error" role="alert">{errorText}</p>}
      {message && <p className="msg" role="status">{message}</p>}

      {(mode === "signup" || mode === "nickname") && (
        <div className="field">
          <label htmlFor="nickname">{t.nickname}</label>
          <input id="nickname" name="nickname" type="text" required maxLength={15} pattern="[A-Za-z0-9]{1,15}" autoComplete="nickname" autoCapitalize="off" spellCheck={false} />
          <small className="hint">{t.nicknameHint}</small>
          {mode === "nickname" && <input type="hidden" name="next" value="home" />}
        </div>
      )}
      {mode !== "reset" && mode !== "nickname" && (
        <div className="field">
          <label htmlFor="email">{t.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
      )}
      {mode !== "forgot" && mode !== "nickname" && (
        <div className="field">
          <label htmlFor="password">{mode === "reset" ? t.newPassword : t.password}</label>
          <input
            id="password" name="password" type="password" required minLength={mode === "login" ? undefined : 8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
      )}
      {mode === "login" && (
        <label className="check">
          <input type="checkbox" name="remember" defaultChecked /> {t.rememberMe}
        </label>
      )}

      <button className="btn full" disabled={pending}>{pending ? t.loading : submit}</button>

      <div className="links">
        {mode === "login" && (
          <>
            <Link href="/forgot-password">{t.forgotPassword}</Link>
            <span>{t.noAccount} <Link href="/signup">{t.signUp}</Link></span>
          </>
        )}
        {mode === "signup" && <span>{t.haveAccount} <Link href="/login">{t.signIn}</Link></span>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login">{t.backToSignIn}</Link>}
      </div>
    </form>
  );
}
