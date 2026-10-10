import { redirect } from "next/navigation";
import { DEXES, visibleDexes } from "@/lib/dexes";
import { getDict, getProfile } from "@/lib/session";
import { signOut } from "../auth-actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const { lang, t } = await getDict();
  const on = new Set(visibleDexes(profile.visible_dexes).map((d) => d.key));

  return (
    <>
      <h1>{t.settings}</h1>
      <SettingsForm
        t={t}
        lang={lang}
        allForms={profile.all_forms}
        dexes={DEXES.map((d) => ({ key: d.key, name: d.name[lang], on: on.has(d.key) }))}
      />
      <form action={signOut} style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{profile.email}</p>
        <button className="btn ghost">{t.signOut}</button>
      </form>
    </>
  );
}
