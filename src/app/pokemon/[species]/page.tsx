import { notFound, redirect } from "next/navigation";
import {
  BASE_DEXES, collectible, dexByKey, displayName, isOn, shinyToggles, statusOf, today, type Dex, type Pokemon,
} from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { getTicks } from "@/lib/ticks";
import { SpeciesForms, type FormCard } from "./species-forms";

export const dynamic = "force-dynamic";

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

  /**
   * Every form gets a checkmark in the dex it belongs to: the dex the user came from when the
   * form is part of it, otherwise the first switched-on dex that includes it (Caught for most
   * forms, Costume/Event for costumes, Mega for Megas…).
   */
  const homeDex = (p: Pokemon): Dex | undefined =>
    dex.includes(p) ? dex : BASE_DEXES.find((d) => isOn(d.key, visible) && d.includes(p)) ?? BASE_DEXES.find((d) => d.includes(p));

  const all = await getPokemon();
  const rows = all.filter((p) => p.species === no).sort((a, b) => a.sort_order - b.sort_order);
  if (rows.length === 0) notFound();
  const day = today();

  const homes = rows.map((p) => homeDex(p));
  const dexKeys = new Set<string>();
  for (const h of homes) {
    if (!h) continue;
    dexKeys.add(h.key);
    for (const s of shinyToggles(h, visible)) dexKeys.add(s.dex.key);
  }
  const [{ lang, t }, ticks] = await Promise.all([getDict(), getTicks([...dexKeys])]);

  const forms: FormCard[] = rows.map((p, i) => {
    const home = homes[i];
    const status = home ? statusOf(p, home, day) : !p.released ? "unreleased" : p.released <= day ? "available" : "upcoming";
    const canTick = !!home && status === "available" && collectible(p);
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
      stars: canTick
        ? shinyToggles(home!, visible)
          .filter((s) => s.dex.includes(p) && statusOf(p, s.dex, day) === "available")
          .map((s) => ({ kind: s.kind, dex: s.dex.key, label: s.dex.name[lang] }))
        : [],
    };
  });

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
