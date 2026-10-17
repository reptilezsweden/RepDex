import Link from "next/link";
import { redirect } from "next/navigation";
import { ALWAYS_ON, GENDER_GROUPS, SETTING_GROUPS, SHINY_SETTINGS, allFormsOn, dexByKey, genderOn, isOn } from "@/lib/dexes";
import { getDict, getProfile } from "@/lib/session";
import { signOut } from "../auth-actions";
import { CollectionForm } from "./collection-form";
import { NicknameForm } from "./nickname-form";
import { SettingsForm } from "./settings-form";
import { APP_BUILD, APP_VERSION } from "@/lib/version";

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
        shinies={SHINY_SETTINGS.map((x) => {
          const group = SETTING_GROUPS.find((g) => g.keys[0] === x.base)!;
          const special = x.keys[0] === "shiny" || x.keys[0] === "shiny3";
          return {
            value: x.keys.join(","), base: x.base, needs: x.needs,
            name: x.keys[0] === "shiny" ? t.shinySetting : x.keys[0] === "shiny3" ? t.shiny3Setting : t.shinyOfSetting.replace("{name}", group.name[lang]),
            on: isOn(x.keys[0], profile.visible_dexes),
            notInGame: special ? x.keys[0] === "shiny3" : !!dexByKey(x.keys[0])?.notInGame,
          };
        })}
        genders={GENDER_GROUPS.map((g) => ({ value: g.keys[0], name: g.name[lang], on: genderOn(g.keys[0], profile) }))}
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
      <p className="app-version">RepDex {APP_VERSION}{APP_BUILD ? ` · ${APP_BUILD}` : ""}</p>
    </>
  );
}
