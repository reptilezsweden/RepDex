import { notFound, redirect } from "next/navigation";
import { CAUGHT_LINKED, allFormsOn, collectible, dexByKey, dexEntries, displayName, isOn, speciesName, pageDexOf, shinyToggles, statusOf, today, type Dex } from "@/lib/dexes";
import { DEX_ICON } from "@/lib/dex-icons";
import { getGens, getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { getTicks } from "@/lib/ticks";
import { DexGrid, type Card, type SlotDef } from "./dex-grid";

export const dynamic = "force-dynamic";

export default async function DexPage({
  params, searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ forms?: string }>;
}) {
  const [{ key }, { forms }] = await Promise.all([params, searchParams]);
  const found = dexByKey(key);
  if (!found) notFound();
  // Shiny dexes live on their regular dex's page, XXS on XXL's and Purified on Shadow's.
  const dex = pageDexOf(key)!;
  if (dex.key !== found.key) redirect(`/dex/${dex.key}${forms === "all" ? "?forms=all" : ""}`);
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const allForms = forms === "all" && allFormsOn(dex.key, profile);
  const { lang, t } = await getDict();

  // Extra ticks on each card: this dex's shiny stars, then each peer dex (XXS, Purified) with its own
  // shiny. A shiny ticks its regular; a peer stands on its own.
  const slotDexes: { def: SlotDef; dex: Dex }[] = [];
  const addShiny = (base: Dex) => {
    for (const s of shinyToggles(base, profile.visible_dexes)) {
      slotDexes.push({
        dex: s.dex,
        def: {
          dex: s.dex.key, icon: DEX_ICON[s.dex.key] ?? s.kind, label: s.dex.name[lang],
          parent: s.kind === "star3" ? (base.shinyKey ?? base.key) : base.key,
        },
      });
    }
  };
  addShiny(dex);
  for (const key of dex.peers ?? []) {
    const peer = dexByKey(key)!;
    if (!isOn(peer.key, profile.visible_dexes)) continue;
    slotDexes.push({ dex: peer, def: { dex: peer.key, icon: DEX_ICON[peer.key] ?? "star", label: peer.name[lang], parent: null } });
    addShiny(peer);
  }

  // Lucky, XXL, XXS and 100% follow Caught: their ticks tick Caught, and unticking Caught unticks them.
  const linked = [dex.key, ...slotDexes.map((s) => s.dex.key)].some((k) => CAUGHT_LINKED.includes(k));
  const parent = linked ? dexByKey("caught")! : null;
  const childDexes = dex.key === "caught" ? CAUGHT_LINKED : [];
  const [all, gens, ticks] = await Promise.all([
    getPokemon(), getGens(),
    getTicks([dex.key, ...slotDexes.map((s) => s.dex.key), ...(parent ? [parent.key] : []), ...childDexes]),
  ]);
  const day = today();

  // Forms are grouped under their species' original generation (e.g. Alolan Rattata under Kanto).
  const speciesGen = new Map<number, number>();
  for (const p of all) speciesGen.set(p.species, Math.min(speciesGen.get(p.species) ?? Infinity, p.gen_nr));

  // Every name in each evolution family, for the "search whole family" switch.
  const familyNames: Record<string, string> = {};
  for (const p of all) {
    const key = String(p.family ?? `s${p.species}`);
    familyNames[key] = `${familyNames[key] ?? ""}|${p.name}|${p.alt_name ?? ""}|${p.name_ja ?? ""}|${p.alt_name_ja ?? ""}`.toLowerCase();
  }

  const cards: Card[] = dexEntries(all, dex, allForms, day).map((e) => {
    const p = e.pokemon;
    return {
      id: p.id,
      no: p.species,
      family: String(p.family ?? `s${p.species}`),
      name: allForms || dex.everyRow ? displayName(p, lang) : speciesName(p, lang),
      gen: speciesGen.get(p.species) ?? p.gen_nr,
      image: p.image_regular,
      shinyImage: p.image_shiny,
      status: e.status,
      date: p[dex.dateField],
      // Rows a tap on this card can tick: the available ones behind it.
      rows: e.rows.filter((r) => collectible(r) && statusOf(r, dex, day) === "available").map((r) => r.id),
      parentRows: parent
        ? e.rows.filter((r) => collectible(r) && parent.includes(r) && statusOf(r, parent, day) === "available").map((r) => r.id)
        : [],
      formType: p.form_type,
      showOnly: !e.rows.some(collectible),
      // Extra ticks, only where that version is released.
      slots: slotDexes
        .map((s) => ({
          ...s.def,
          rows: e.rows.filter((r) => collectible(r) && s.dex.includes(r) && statusOf(r, s.dex, day) === "available").map((r) => r.id),
        }))
        .filter((s) => s.rows.length > 0),
    };
  });
  cards.sort((a, b) => a.no - b.no);

  return (
    <DexGrid
      dexKey={dex.key}
      title={`${(dex.groupName ?? dex.name)[lang]}${allForms ? ` · ${t.allForms}` : ""}`}
      ownName={dex.name[lang]}
      cards={cards}
      familyNames={familyNames}
      gens={gens.map((g) => ({ gen_nr: g.gen_nr, region: g.region }))}
      initialTicks={ticks}
      userId={profile.id}
      initialShowUpcoming={profile.show_upcoming ?? profile.show_unavailable ?? true}
      initialShowUnreleased={profile.show_unreleased ?? profile.show_unavailable ?? true}
      initialShow={profile.show_filter ?? "all"}
      initialSearchFamily={profile.search_family ?? false}
      notInGame={!!dex.notInGame}
      slotDefs={slotDexes.map((s) => s.def)}
      parentDex={parent?.key ?? null}
      childDexes={childDexes}
      canSwitchForms={allFormsOn(dex.key, profile)}
      allForms={allForms}
      t={t}
    />
  );
}
