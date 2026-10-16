import Link from "next/link";
import { MonImage } from "@/components/mon-ui";
import type { Dict, Lang } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";
import {
  BASE_DEXES, genderOn, collectible, dexByKey, displayName, isOn, shinyToggles, speciesName, statusOf, today, type Dex, type Pokemon,
} from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { DEX_ICON } from "@/lib/dex-icons";
import { getDict, getProfile } from "@/lib/session";
import { getTicks } from "@/lib/ticks";
import { SpeciesForms, type Badge, type FormCard, type SpeciesLink } from "./species-forms";

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
  { dex: "shadow", icon: "shadow", row: 2 },
  { dex: "shadow_shiny", icon: "shadow_shiny", row: 2, parent: "shadow" },
  { dex: "purified", icon: "purified", row: 2 },
  { dex: "purified_shiny", icon: "purified_shiny", row: 2, parent: "purified" },
  { dex: "perfect", icon: "perfect", row: 2, parent: "caught" },
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
  const byId = new Map(all.map((p) => [p.id, p]));
  /** A female twin stands in its original's dexes. */
  const base = (p: Pokemon) => (p.gender_of ? byId.get(p.gender_of) ?? p : p);
  const species_rows = all.filter((p) => p.species === no).sort((a, b) => a.sort_order - b.sort_order || (a.gender_of ? 1 : 0) - (b.gender_of ? 1 : 0));
  if (species_rows.length === 0) notFound();
  // Twins are shown where the user tracks gender: in the form's own dex or one of its icons' dexes.
  const genderDexesOf = (p: Pokemon) => {
    const home = homeDex(base(p));
    if (!home) return [];
    const keys = home === caught ? [home.key, ...CAUGHT_BADGES.map((b) => b.dex)] : [home.key, ...(home.shinyKey ? [home.shinyKey] : [])];
    return keys.filter((k) => isOn(k, visible) && genderOn(k, profile));
  };
  const rows = species_rows.filter((p) => !p.gender_of || genderDexesOf(p).length > 0);
  const twinShown = new Set(rows.filter((p) => p.gender_of).map((p) => p.gender_of!));
  const day = today();
  const { lang, t } = await getDict();

  const forms: FormCard[] = rows.map((p) => {
    const twin = !!p.gender_of;
    const home = homeDex(base(p));
    const status = home ? statusOf(p, home, day) : !p.released ? "unreleased" : p.released <= day ? "available" : "upcoming";
    // A twin's checkmark only works when its dex tracks gender (its icons are filtered the same way below).
    const canTick = !!home && status === "available" && collectible(p) && (!twin || genderOn(home.key, profile));
    const canIcon = !!home && status === "available" && collectible(p);
    const released = (d: Dex) => d.includes(base(p)) && statusOf(p, d, day) === "available" && (!twin || genderOn(d.key, profile));

    let badges: Badge[] = [];
    if (canIcon && home === caught) {
      badges = CAUGHT_BADGES
        .map((b) => ({ ...b, d: dexByKey(b.dex)! }))
        .filter((b) => isOn(b.dex, visible) && released(b.d))
        .map((b) => ({ dex: b.dex, icon: b.icon, row: b.row, parent: b.parent, label: b.d.name[lang] }));
    } else if (canIcon) {
      badges = shinyToggles(home!, visible)
        .filter((s) => released(s.dex))
        .map((s) => ({
          dex: s.dex.key, icon: DEX_ICON[s.dex.key] ?? s.kind, row: 1 as const, label: s.dex.name[lang],
          parent: s.kind === "star3" ? (home!.shinyKey ?? home!.key) : home!.key,
        }));
    }
    // A badge whose parent isn't shown can't follow it; link it to the checkmark instead.
    const shown = new Set([home?.key, ...badges.map((b) => b.dex)]);
    badges = badges.map((b) => (b.parent && !shown.has(b.parent) ? { ...b, parent: home?.key } : b));

    return {
      id: p.id,
      name: displayName(p, lang),
      // With the twin shown, the original is the male; otherwise it stands for every gender.
      gender: twin ? "Female" : twinShown.has(p.id) ? "Male" : p.gender ?? null,
      types: [p.type1, p.type2].filter((x): x is string => !!x),
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

  // Previous and next species, shown by their regular form (or first row).
  const speciesNos = [...new Set(all.map((p) => p.species))].sort((a, b) => a - b);
  const at = speciesNos.indexOf(no);
  const neighbour = (n: number | undefined): SpeciesLink | null => {
    if (n === undefined) return null;
    const list = all.filter((p) => p.species === n).sort((a, b) => a.sort_order - b.sort_order);
    const rep = list.find((p) => p.form_type === "Regular") ?? list[0];
    return { no: n, name: speciesName(rep, lang), image: rep.image_regular, href: `/pokemon/${n}${dexParam ? `?dex=${encodeURIComponent(dexParam)}` : ""}` };
  };

  return (
    <SpeciesForms
      title={speciesName(rows.find((r) => r.form_type === "Regular") ?? rows[0], lang)}
      no={no}
      dexName={dex.name[lang]}
      backHref={dexParam === "full" ? "/full" : dexParam ? `/dex/${dex.key}` : "/"}
      forms={forms}
      prev={neighbour(speciesNos[at - 1])}
      next={neighbour(speciesNos[at + 1])}
      initialTicks={ticks}
      userId={profile.id}
      isAdmin={profile.role === "admin"}
      evolution={<Evolution rows={rows} all={all} no={no} t={t} lang={lang} />}
      t={t}
      lang={lang}
    />
  );
}

/** Forms that don't take part in evolution chains here (they'd repeat every costume or Mega). */
const NO_EVOLUTION = ["Costume", "Mega", "Gigantamax"];

/** Evolves from / evolves into, with candy cost and any extra requirement. */
function Evolution({ rows, all, no, t, lang }: { rows: Pokemon[]; all: Pokemon[]; no: number; t: Dict; lang: Lang }) {
  const byId = new Map(all.map((p) => [p.id, p]));
  // Shown on the original rows: female twins evolve along the same lines, and a female-only
  // evolution (Froslass, from the female Snorunt) is shown as coming from the Pokémon itself.
  const orig = (id: string | null | undefined) => (id ? byId.get(id)?.gender_of ?? id : null);
  const own = rows.filter((r) => !r.gender_of && !NO_EVOLUTION.includes(r.form_type));
  const ownIds = new Set(own.map((r) => r.id));
  const from = own
    .filter((r) => r.evolves_from && byId.has(orig(r.evolves_from)!))
    .map((r) => ({ from: byId.get(orig(r.evolves_from)!)!, to: r }));
  const into = all
    .filter((p) => !p.gender_of && p.evolves_from && ownIds.has(orig(p.evolves_from)!) && p.species !== no && !NO_EVOLUTION.includes(p.form_type))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({ from: byId.get(orig(p.evolves_from)!)!, to: p }));
  // Name the form on this page only when more than one of its forms is involved.
  const manyOwn = (list: { from: Pokemon; to: Pokemon }[], side: "from" | "to") => new Set(list.map((e) => e[side].id)).size > 1;
  const cost = (p: Pokemon) => [
    p.evolve_candy ? t.candyCost.replace("{n}", String(p.evolve_candy)) : null,
    p.evolution_requirement || null,
  ].filter(Boolean).join(" · ");

  const line = (shown: Pokemon, via: Pokemon, ownName: string | null) => (
    <li key={`${via.id}-${shown.id}`}>
      <Link href={`/pokemon/${shown.species}`} className="evo-link">
        <MonImage file={shown.image_regular} size={40} />
        <span className="evo-name">{displayName(shown, lang)}</span>
      </Link>
      <span className="evo-cost">
        {ownName && <span className="evo-own">{ownName}</span>}
        {cost(via) || t.noEvolutionCost}
      </span>
    </li>
  );

  const ownFrom = manyOwn(from, "to");
  // Forms that evolve from the same Pokémon at the same cost share one line, their names joined.
  const fromGroups: { from: Pokemon; to: Pokemon; names: string[] }[] = [];
  for (const e of from) {
    const g = fromGroups.find((x) => x.from.id === e.from.id
      && (x.to.evolve_candy ?? null) === (e.to.evolve_candy ?? null)
      && (x.to.evolution_requirement || null) === (e.to.evolution_requirement || null));
    if (g) g.names.push(displayName(e.to, lang));
    else fromGroups.push({ ...e, names: [displayName(e.to, lang)] });
  }
  const ownInto = manyOwn(into, "from");
  return (
    <section className="evolution">
      {/* Both boxes always show; an empty one says so. */}
      <div>
        <h2>{t.evolvesFrom}</h2>
        {from.length > 0
          ? <ul>{fromGroups.map((g) => line(g.from, g.to, ownFrom ? g.names.join(", ") : null))}</ul>
          : <p className="evo-none">{t.evolvesFromNone}</p>}
      </div>
      <div>
        <h2>{t.evolvesInto}</h2>
        {into.length > 0
          ? <ul>{into.map((e) => line(e.to, e.to, ownInto ? t.evolvesFromForm.replace("{name}", displayName(e.from, lang)) : null))}</ul>
          : <p className="evo-none">{t.evolvesIntoNone}</p>}
      </div>
    </section>
  );
}
