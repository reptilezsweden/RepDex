"use client";

import { useActionState } from "react";
import { savePhrase, type AdminState } from "../actions";

/** One repeated English phrase with an input per language. */
export function PhraseRow({ kind, source, uses, langs, values }: {
  kind: string; source: string; uses: number;
  langs: { lang: string; label: string }[];
  values: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(savePhrase, undefined);
  return (
    <form action={action} className="phrase-row">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="source" value={source} />
      <div className="phrase-source">{source} <span className="count">· {uses}</span></div>
      {langs.map(({ lang, label }) => (
        <input key={lang} name={`text_${lang}`} defaultValue={values[lang] ?? ""} placeholder={label} aria-label={`${source} in ${label}`} lang={lang} />
      ))}
      <button className="btn ghost" disabled={pending}>Save</button>
      {state?.error && <span className="row-msg error">{state.error}</span>}
      {state?.message && <span className="row-msg">{state.message}</span>}
    </form>
  );
}
