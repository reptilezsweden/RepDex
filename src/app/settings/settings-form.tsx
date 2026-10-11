"use client";

import { useActionState, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({
  t, lang, allForms, shiny, shiny3, dexes,
}: {
  t: Dict;
  lang: Lang;
  /** One switch per dex group that has an All forms version; value is the group's dex keys. */
  allForms: { value: string; name: string; on: boolean }[];
  shiny: boolean;
  shiny3: boolean;
  dexes: { key: string; name: string; on: boolean; locked: boolean; notInGame: boolean }[];
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, undefined);
  // Shiny ⭐⭐⭐ needs Show shiny: switching it on switches Show shiny on, and switching Show shiny off switches it off.
  const [shinyOn, setShinyOn] = useState(shiny);
  const [shiny3On, setShiny3On] = useState(shiny3);
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
              {d.notInGame && <span className="not-in-game small" title={t.notInGameHelp}>{t.notInGame}</span>}
              {d.locked && <span id={`${d.key}-lock`} style={{ color: "var(--muted)", fontSize: "0.85rem" }}>({t.alwaysOn})</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Shiny</h2>
        <div className="shiny-cols">
          <div>
            <label className="check">
              <input
                type="checkbox" name="shiny" checked={shinyOn}
                onChange={(e) => { setShinyOn(e.target.checked); if (!e.target.checked) setShiny3On(false); }}
              /> {t.shinySetting}
            </label>
            <p className="help">{t.shinyHelp}</p>
          </div>
          <div>
            <label className="check">
              <input
                type="checkbox" name="shiny3" checked={shiny3On}
                onChange={(e) => { setShiny3On(e.target.checked); if (e.target.checked) setShinyOn(true); }}
              /> {t.shiny3Setting}
              <span className="not-in-game small" title={t.notInGameHelp}>{t.notInGame}</span>
            </label>
            <p className="help">{t.shiny3Help}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t.allForms}</h2>
        <div className="checks">
          {allForms.map((g) => (
            <label key={g.value} className="check">
              <input type="checkbox" name="all_forms_dex" value={g.value} defaultChecked={g.on} /> {g.name}
            </label>
          ))}
        </div>
        <p className="help">{t.allFormsHelp}</p>
      </section>

      {state?.error && <p className="msg error" role="alert">{state.error}</p>}
      {state?.saved && <p className="msg" role="status">{t.saved}</p>}
      <button className="btn" disabled={pending} style={{ marginBottom: 16 }}>{pending ? t.loading : t.save}</button>
    </form>
  );
}
