"use client";

import { useActionState, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { saveSettings, type SettingsState } from "./actions";

/** A checkbox that greys out (and keeps its value) while the dex it belongs to is switched off. */
function Box({ name, value, on, set, off, children }: {
  name: string; value: string; on: boolean; set: (v: boolean) => void; off: boolean; children?: React.ReactNode;
}) {
  return (
    <label className={`check${off ? " greyed" : ""}`}>
      <input type="checkbox" name={off ? undefined : name} value={value} checked={on} disabled={off} onChange={(e) => set(e.target.checked)} />
      {/* A disabled box isn't sent with the form, so its choice is kept this way. */}
      {off && on && <input type="hidden" name={name} value={value} />}
      {" "}{children}
    </label>
  );
}

export function SettingsForm({
  t, lang, allForms, shinies, dexes, genders,
}: {
  t: Dict;
  lang: Lang;
  /** One switch per dex group that has an All forms version; value is the group's dex keys. */
  allForms: { value: string; name: string; on: boolean }[];
  /** Shiny switches (SHINY_SETTINGS): value is the dex keys, base the settings group it belongs to. */
  shinies: { value: string; base: string; needs?: string; name: string; on: boolean; notInGame: boolean }[];
  dexes: { key: string; name: string; on: boolean; locked: boolean; notInGame: boolean }[];
  /** One switch per dex group for ticking male and female separately; value is the group's first key. */
  genders: { value: string; name: string; on: boolean }[];
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, undefined);
  // Every box is live, so choices for dexes switched off above grey out straight away.
  const [dexOn, setDexOn] = useState(() => Object.fromEntries(dexes.map((d) => [d.key.split(",")[0], d.on || d.locked])));
  const [shinyOn, setShinyOn] = useState(() => Object.fromEntries(shinies.map((x) => [x.value, x.on])));
  const [formsOn, setFormsOn] = useState(() => Object.fromEntries(allForms.map((x) => [x.value, x.on])));
  const [genderOn, setGenderOn] = useState(() => Object.fromEntries(genders.map((x) => [x.value, x.on])));
  const baseOf = (value: string) => value.split(",")[0];
  // Shiny ⭐⭐⭐ needs Show shiny: switching it on switches Show shiny on, and switching Show shiny off switches it off.
  function setShiny(value: string, v: boolean) {
    setShinyOn((prev) => {
      const next = { ...prev, [value]: v };
      for (const x of shinies) {
        if (x.needs === value && !v) next[x.value] = false;
        if (x.value === value && x.needs && v) next[x.needs] = true;
      }
      return next;
    });
  }
  const shinyOff = (x: { base: string; needs?: string }) => !dexOn[x.base] || (!!x.needs && !shinyOn[x.needs]);
  // Gender for Shiny / Shiny ⭐⭐⭐ follows Show shiny; the others follow their dex.
  const genderOff = (value: string) => (value === "shiny" ? !shinyOn.shiny : !dexOn[baseOf(value)]);
  const anyGreyed = dexes.some((d) => !dexOn[baseOf(d.key)]) || !shinyOn.shiny;

  return (
    <form action={action}>
      <section className="panel">
        <h2>{t.language}</h2>
        <select name="language" defaultValue={lang} aria-label={t.language} style={{ maxWidth: 240 }}>
          <option value="en">English</option>
          <option value="sv">Svenska</option>
          <option value="ja">日本語</option>
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
                <input
                  type="checkbox" name="dex" value={d.key} checked={!!dexOn[baseOf(d.key)]}
                  onChange={(e) => setDexOn((prev) => ({ ...prev, [baseOf(d.key)]: e.target.checked }))}
                />
              )}{" "}
              {d.name}
              {d.notInGame && <span className="not-in-game small" title={t.notInGameHelp}>{t.notInGame}</span>}
              {d.locked && <span id={`${d.key}-lock`} style={{ color: "var(--muted)", fontSize: "0.85rem" }}>({t.alwaysOn})</span>}
            </label>
          ))}
        </div>
        <p className="help">{t.hideKeepsTicks}</p>
      </section>

      <section className="panel">
        <h2>{t.checkShiny}</h2>
        <div className="checks">
          {shinies.map((x) => (
            <Box key={x.value} name="shiny_dex" value={x.value} on={!!shinyOn[x.value]} set={(v) => setShiny(x.value, v)} off={shinyOff(x)}>
              {x.name}
              {x.notInGame && <span className="not-in-game small" title={t.notInGameHelp}>{t.notInGame}</span>}
            </Box>
          ))}
        </div>
        <p className="help">{t.shinyCommonHelp}</p>
      </section>

      <section className="panel">
        <h2>{t.allForms}</h2>
        <div className="checks">
          {allForms.map((g) => (
            <Box
              key={g.value} name="all_forms_dex" value={g.value} on={!!formsOn[g.value]}
              set={(v) => setFormsOn((prev) => ({ ...prev, [g.value]: v }))} off={!dexOn[baseOf(g.value)]}
            >
              {g.name}
            </Box>
          ))}
        </div>
        <p className="help">{t.allFormsHelp}</p>
      </section>

      <section className="panel">
        <h2>{t.genderSetting}</h2>
        <p className="help" style={{ marginTop: 0 }}>{t.genderSettingHelp}</p>
        <div className="checks">
          {genders.map((g) => (
            <Box
              key={g.value} name="gender_dex" value={g.value} on={!!genderOn[g.value]}
              set={(v) => setGenderOn((prev) => ({ ...prev, [g.value]: v }))} off={genderOff(g.value)}
            >
              {g.name}
            </Box>
          ))}
        </div>
        <p className="help">{t.genderSettingNote}</p>
      </section>

      {anyGreyed && <p className="help">{t.greyedHelp}</p>}
      {state?.error && <p className="msg error" role="alert">{state.error}</p>}
      {state?.saved && <p className="msg" role="status">{t.saved}</p>}
      <button className="btn" disabled={pending} style={{ marginBottom: 16 }}>{pending ? t.loading : t.save}</button>
    </form>
  );
}
