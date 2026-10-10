"use client";

import { useActionState } from "react";
import type { Dict } from "@/lib/i18n";
import { setNickname, type FormState } from "../auth-actions";

export function NicknameForm({ t, current }: { t: Dict; current: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setNickname, undefined);
  const text = (k?: string) => (k ? (t as unknown as Record<string, string>)[k] ?? k : null);
  return (
    <form action={action} className="panel">
      <h2>{t.nickname}</h2>
      <div className="inline-field">
        <input
          name="nickname" type="text" defaultValue={current} required maxLength={15} pattern="[A-Za-z0-9]{1,15}"
          aria-label={t.nickname} autoCapitalize="off" spellCheck={false}
        />
        <button className="btn ghost" disabled={pending}>{pending ? t.loading : t.save}</button>
      </div>
      <p className="hint">{t.nicknameHint}</p>
      {state?.error && <p className="msg error" role="alert">{text(state.error)}</p>}
      {state?.message && <p className="msg" role="status">{text(state.message)}</p>}
    </form>
  );
}
