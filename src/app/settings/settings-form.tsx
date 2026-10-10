"use client";

import { useActionState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({
  t, lang, allForms, shiny, shiny3, dexes,
}: {
  t: Dict;
  lang: Lang;
  allForms: boolean;
  shiny: boolean;
  shiny3: boolean;
  dexes: { key: string; name: string; on: boolean; locked: boolean }[];
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
        <h2>Shiny</h2>
        <label className="check">
          <input type="checkbox" name="shiny" defaultChecked={shiny} /> {t.shinySetting}
        </label>
        <p className="help">{t.shinyHelp}</p>
        <label className="check">
          <input type="checkbox" name="shiny3" defaultChecked={shiny3} /> {t.shiny3Setting}
        </label>
        <p className="help">{t.shiny3Help}</p>
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
              {d.locked ? (
                <>
                  <input type="checkbox" checked disabled aria-describedby={`${d.key}-lock`} />
                  <input type="hidden" name="dex" value={d.key} />
                </>
              ) : (
                <input type="checkbox" name="dex" value={d.key} defaultChecked={d.on} />
              )}{" "}
              {d.name}
              {d.locked && <span id={`${d.key}-lock`} style={{ color: "var(--muted)", fontSize: "0.85rem" }}>({t.alwaysOn})</span>}
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
