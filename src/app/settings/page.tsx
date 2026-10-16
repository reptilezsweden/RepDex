import Link from "next/link";
import { redirect } from "next/navigation";
import { ALWAYS_ON, SETTING_GROUPS, SHINY_KEYS, allFormsOn, dexByKey, genderOn, isOn } from "@/lib/dexes";
import { getDict, getProfile } from "@/lib/session";
import { signOut } from "../auth-actions";
import { CollectionForm } from "./collection-form";
import { NicknameForm } from "./nickname-form";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const { lang, t } = await getDict();

  return (
    <>
      <div className="dex-head">
        <h1>{t.settings}</h1>
        {profile.role === "admin" && <Link href="/admin" className="head-link">{t.admin}</Link>}
      </div>
      <NicknameForm t={t} current={profile.nickname ?? ""} />
      <SettingsForm
        t={t}
        lang={lang}
        allForms={SETTING_GROUPS
          .filter((g) => !dexByKey(g.keys[0])!.everyRow)
          .map((g) => ({ value: g.keys.join(","), name: g.name[lang], on: allFormsOn(g.keys[0], profile) }))}
        shiny={SHINY_KEYS.some((k) => isOn(k, profile.visible_dexes))}
        shiny3={isOn("shiny3", profile.visible_dexes)}
        genders={SETTING_GROUPS.map((g) => ({ value: g.keys[0], name: g.name[lang], on: genderOn(g.keys[0], profile) }))}
        dexes={SETTING_GROUPS.map((g) => ({
          key: g.keys.join(","), name: g.name[lang], on: isOn(g.keys[0], profile.visible_dexes),
          locked: g.keys.includes(ALWAYS_ON), notInGame: !!dexByKey(g.keys[0])!.notInGame,
        }))}
      />
      <CollectionForm t={t} />
      <form action={signOut} style={{ marginTop: 24 }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{profile.email}</p>
        <button className="btn ghost">{t.signOut}</button>
      </form>
    </>
  );
}
