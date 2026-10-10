import { redirect } from "next/navigation";
import { ALWAYS_ON, BASE_DEXES, SHINY_KEYS, isOn } from "@/lib/dexes";
import { getDict, getProfile } from "@/lib/session";
import { signOut } from "../auth-actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const { lang, t } = await getDict();

  return (
    <>
      <h1>{t.settings}</h1>
      <SettingsForm
        t={t}
        lang={lang}
        allForms={profile.all_forms}
        shiny={SHINY_KEYS.some((k) => isOn(k, profile.visible_dexes))}
        shiny3={isOn("shiny3", profile.visible_dexes)}
        dexes={BASE_DEXES.map((d) => ({ key: d.key, name: d.name[lang], on: isOn(d.key, profile.visible_dexes), locked: d.key === ALWAYS_ON, notInGame: !!d.notInGame }))}
      />
      <form action={signOut} style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{profile.email}</p>
        <button className="btn ghost">{t.signOut}</button>
      </form>
    </>
  );
}
