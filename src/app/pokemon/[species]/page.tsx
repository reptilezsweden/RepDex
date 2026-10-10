import { notFound, redirect } from "next/navigation";
import { dexByKey, displayName, shinyToggles, statusOf, today, type Status } from "@/lib/dexes";
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
  const toggles = shinyToggles(dex, profile.visible_dexes);
  const [{ lang, t }, all, ticks] = await Promise.all([
    getDict(), getPokemon(), getTicks([dex.key, ...toggles.map((s) => s.dex.key)]),
  ]);
  const rows = all.filter((p) => p.species === no).sort((a, b) => a.sort_order - b.sort_order);
  if (rows.length === 0) notFound();
  const day = today();

  const forms: FormCard[] = rows.map((p) => {
    const inDex = dex.includes(p);
    // Forms outside this dex are grouped by their regular release date.
    const status: Status = inDex ? statusOf(p, dex, day) : !p.released ? "unreleased" : p.released <= day ? "available" : "upcoming";
    return {
      id: p.id,
      name: displayName(p),
      formType: p.form_type,
      regular: p.image_regular,
      shiny: p.image_shiny,
      status,
      date: inDex ? p[dex.dateField] : p.released,
      tickable: inDex && status === "available",
      stars: toggles
        .filter((s) => s.dex.includes(p) && statusOf(p, s.dex, day) === "available")
        .map((s) => ({ kind: s.kind, dex: s.dex.key, label: s.dex.name[lang] })),
    };
  });

  return (
    <SpeciesForms
      title={rows.find((r) => r.form_type === "Regular")?.name ?? rows[0].name}
      no={no}
      dexKey={dex.key}
      dexName={dex.name[lang]}
      backHref={dexParam ? `/dex/${dex.key}` : "/"}
      forms={forms}
      initialTicks={ticks}
      userId={profile.id}
      t={t}
    />
  );
}
