import { notFound, redirect } from "next/navigation";
import {
  BASE_DEXES, collectible, dexByKey, displayName, isOn, shinyToggles, statusOf, today, type Dex, type Pokemon,
} from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { getTicks } from "@/lib/ticks";
import { SpeciesForms, type Badge, type FormCard } from "./species-forms";

export const dynamic = "force-dynamic";

/**
 * Icons shown on regular forms (everything in the Caught dex), in two rows. A badge with a
 * parent ticks the parent too, and unticking the parent unticks it.
 */
const CAUGHT_BADGES: { dex: string; icon: Badge["icon"]; row: 1 | 2; parent?: string }[] = [
  { dex: "shiny", icon: "star", row: 1, parent: "caught" },
  { dex: "shiny3", icon: "star3", row: 1, parent: "shiny" },
  { dex: "lucky", icon: "lucky", row: 1, parent: "caught" },
  { dex: "xxl", icon: "xxl", row: 1, parent: "caught" },
  { dex: "xxs", icon: "xxs", row: 1, parent: "caught" },
  { dex: "perfect", icon: "perfect", row: 1, parent: "caught" },
  { dex: "shadow", icon: "shadow", row: 2 },
  { dex: "shadow_shiny", icon: "star", row: 2, parent: "shadow" },
  { dex: "purified", icon: "purified", row: 2 },
  { dex: "purified_shiny", icon: "star", row: 2, parent: "purified" },
];

export default async function SpeciesPage({
  params, searchParams,
}: {
  params: Promise<{ species: string }>;
  searchParams: Promise<{ dex?: string }>;
}) {
  const [{ species }, { dex: dexParam }] = await Promise.all([params, searchParams]);
  const no = Number(species);
  if (!Number.isInteger(no)) notFound();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const picked = dexByKey(dexParam ?? "") ?? dexByKey("caught")!;
  const dex = picked.shinyOf ? dexByKey(picked.shinyOf)! : picked;
  const visible = profile.visible_dexes;
  const caught = dexByKey("caught")!;

  /**
   * The dex a form's checkmark ticks in: Caught for regular forms (their other dexes are icons),
   * otherwise the dex the user came from when it includes the form, else the first dex that does
   * (Costume/Event for costumes, Mega for Megas…).
   */
  const homeDex = (p: Pokemon): Dex | undefined =>
    caught.includes(p) ? caught
      : dex.includes(p) ? dex
        : BASE_DEXES.find((d) => isOn(d.key, visible) && d.includes(p)) ?? BASE_DEXES.find((d) => d.includes(p));

  const all = await getPokemon();
  const rows = all.filter((p) => p.species === no).sort((a, b) => a.sort_order - b.sort_order);
  if (rows.length === 0) notFound();
  const day = today();
  const { lang, t } = await getDict();

  const forms: FormCard[] = rows.map((p) => {
    const home = homeDex(p);
    const status = home ? statusOf(p, home, day) : !p.released ? "unreleased" : p.released <= day ? "available" : "upcoming";
    const canTick = !!home && status === "available" && collectible(p);
    const released = (d: Dex) => d.includes(p) && statusOf(p, d, day) === "available";

    let badges: Badge[] = [];
    if (canTick && home === caught) {
      badges = CAUGHT_BADGES
        .map((b) => ({ ...b, d: dexByKey(b.dex)! }))
        .filter((b) => isOn(b.dex, visible) && released(b.d))
        .map((b) => ({ dex: b.dex, icon: b.icon, row: b.row, parent: b.parent, label: b.d.name[lang] }));
    } else if (canTick) {
      badges = shinyToggles(home!, visible)
        .filter((s) => released(s.dex))
        .map((s) => ({
          dex: s.dex.key, icon: s.kind, row: 1 as const, label: s.dex.name[lang],
          parent: s.kind === "star3" ? (home!.shinyKey ?? home!.key) : home!.key,
        }));
    }
    // A badge whose parent isn't shown can't follow it; link it to the checkmark instead.
    const shown = new Set([home?.key, ...badges.map((b) => b.dex)]);
    badges = badges.map((b) => (b.parent && !shown.has(b.parent) ? { ...b, parent: home?.key } : b));

    return {
      id: p.id,
      name: displayName(p),
      formType: p.form_type,
      regular: p.image_regular,
      shiny: p.image_shiny,
      status,
      date: home ? p[home.dateField] : p.released,
      dex: home?.key ?? dex.key,
      dexName: home && home.key !== dex.key ? home.name[lang] : null,
      tickable: canTick,
      badges,
    };
  });

  const dexKeys = new Set<string>();
  for (const f of forms) {
    dexKeys.add(f.dex);
    for (const b of f.badges) dexKeys.add(b.dex);
  }
  const ticks = await getTicks([...dexKeys]);

  return (
    <SpeciesForms
      title={rows.find((r) => r.form_type === "Regular")?.name ?? rows[0].name}
      no={no}
      dexName={dex.name[lang]}
      backHref={dexParam ? `/dex/${dex.key}` : "/"}
      forms={forms}
      initialTicks={ticks}
      userId={profile.id}
      isAdmin={profile.role === "admin"}
      t={t}
    />
  );
}
