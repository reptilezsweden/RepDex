"use client";

import { useActionState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({
  t, lang, allForms, dexes,
}: {
  t: Dict;
  lang: Lang;
  allForms: boolean;
  dexes: { key: string; name: string; on: boolean }[];
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, undefined);
  return (
    <form action={action}>
      <section className="panel">
        <h2>{t.language}</h2>
        <select name="language" defaultValue={lang} aria-label={t.language} style={{ maxWidth: 240 }}>
          <option value="en">English</option>
          <option value="sv">Svenska</option>
        </select>
      </section>

      <section className="panel">
        <h2>{t.allForms}</h2>
        <label className="check">
          <input type="checkbox" name="all_forms" defaultChecked={allForms} /> {t.allFormsSetting}
        </label>
        <p className="help">{t.allFormsHelp}</p>
      </section>

      <section className="panel">
        <h2>{t.visibleDexes}</h2>
        <div className="checks">
          {dexes.map((d) => (
            <label key={d.key} className="check">
              <input type="checkbox" name="dex" value={d.key} defaultChecked={d.on} /> {d.name}
            </label>
          ))}
        </div>
      </section>

      {state?.error && <p className="msg error" role="alert">{state.error}</p>}
      {state?.saved && <p className="msg" role="status">{t.saved}</p>}
      <button className="btn" disabled={pending}>{pending ? t.loading : t.save}</button>
    </form>
  );
}
