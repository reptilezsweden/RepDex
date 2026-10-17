import { HelpLink } from "@/components/help-link";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BadgeIcon, StarIcon } from "@/components/mon-ui";
import { DEX_ICON } from "@/lib/dex-icons";
import { allFormsOn, countText, dexByKey, dexEntries, genderOn, isOn, pageDexes, progress, shinyToggles, today, twinsOf, type Dex, type Pokemon, type Tick } from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";

export const dynamic = "force-dynamic";

type GenderCount = { twins: Map<string, Pokemon> | null; or: string };

/** "done / total · %", or with gender tracked "[both] or [either] / total · % or %" (the bar shows both). */
function counted(done: number, any: number, total: number, g: GenderCount) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const anyPct = total ? Math.round((any / total) * 100) : 0;
  return {
    text: g.twins ? countText(done, any, total, true, g.or) : `${done} / ${total} · ${pct}%`,
    bar: (
      <div className="bar">
        {g.twins && anyPct > pct && <i className="any" style={{ width: `${anyPct}%` }} />}
        <i style={{ width: `${pct}%` }} />
      </div>
    ),
  };
}

function Progress({ all, dex, allForms, ticks, day, icon, g }: {
  all: Pokemon[]; dex: Dex; allForms: boolean; ticks: Map<string, Tick>; day: string; icon?: ReactNode; g: GenderCount;
}) {
  const { done, total, any } = progress(dexEntries(all, dex, allForms, day), dex, ticks, day, g.twins);
  const c = counted(done, any, total, g);
  return (
    <>
      <div className="count star-count">{icon}{c.text}</div>
      {c.bar}
    </>
  );
}

/** The dex's own icon shown in front of a counter: its badge, a star for shiny dexes, else the checkmark. */
const dexIcon = (dex: Dex, kind: "star" | "star3" = "star") => {
  const k = DEX_ICON[dex.key];
  if (k) return <span className="badge slot-icon"><BadgeIcon kind={k} size={16} /></span>;
  if (dex.shiny) return <StarIcon kind={kind} size={16} />;
  return (
    <span className="count-check" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
    </span>
  );
};

/** Small counter for a shiny dex, or a second dex (XXS, Purified), shown inside a dex's box. */
function ShinyProgress({ all, dex, icon, allForms, ticks, day, label, notInGame, g }: {
  all: Pokemon[]; dex: Dex; icon: ReactNode; allForms: boolean; ticks: Map<string, Tick>; day: string; label: string; notInGame?: string; g: GenderCount;
}) {
  const { done, total, any } = progress(dexEntries(all, dex, allForms, day), dex, ticks, day, g.twins);
  const c = counted(done, any, total, g);
  return (
    <>
      <div className="mini" aria-label={label}>
        {icon}{c.text}
        {notInGame && <span className="not-in-game small">{notInGame}</span>}
      </div>
      {c.bar}
    </>
  );
}

export default async function DexesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const [{ lang, t }, all, ticks] = await Promise.all([getDict(), getPokemon(), getTicks()]);
  const day = today();
  const ticksBy = byDex(ticks);
  const twins = twinsOf(all);
  // Gender tracked for a dex group: counters show both genders and either gender.
  const g = (dex: Dex): GenderCount => ({ twins: genderOn(dex.key, profile) ? twins : null, or: t.countOr });

  return (
    <>
      <div className="dex-head"><h1>{t.dexes}</h1><HelpLink guide="dexes" label={t.helpFor} /></div>
      <div className="dex-list">
        <Link href="/full" className="dex-tile full-tile">
          <div className="tile-main">
            <div className="name">{t.fullCollection}</div>
            <div className="sub">{t.fullCollectionShort}</div>
          </div>
        </Link>
        {pageDexes(profile.visible_dexes).map((d) => {
          const dt = ticksBy.get(d.key) ?? new Map<string, Tick>();
          const peers = (d.peers ?? []).map((k) => dexByKey(k)!).filter((p) => isOn(p.key, profile.visible_dexes));
          const tick = (dex: Dex) => ticksBy.get(dex.key) ?? new Map<string, Tick>();
          const shinyLines = (base: Dex, allForms: boolean) =>
            shinyToggles(base, profile.visible_dexes)
              .filter((s) => !(allForms && s.dex.everyRow))
              .map((s) => (
                <ShinyProgress
                  key={s.dex.key} all={all} dex={s.dex} icon={dexIcon(s.dex, s.kind)} allForms={allForms}
                  ticks={tick(s.dex)} day={day} label={s.dex.name[lang]} g={g(s.dex)}
                  notInGame={s.dex.notInGame && !d.notInGame ? t.notInGame : undefined}
                />
              ));
          // Own shiny first, then each second dex (XXS, Purified) with its shiny.
          const starLines = (allForms: boolean) => [
            ...shinyLines(d, allForms),
            ...peers.flatMap((p) => [
              <ShinyProgress
                key={p.key} all={all} dex={p} icon={dexIcon(p)} allForms={allForms}
                ticks={tick(p)} day={day} label={p.name[lang]} g={g(p)}
              />,
              ...shinyLines(p, allForms),
            ]),
          ];
          const ownIcon = dexIcon(d);
          return (
            <div key={d.key} className="dex-tile">
              <Link href={`/dex/${d.key}`} className="tile-main">
                <div className="name">
                  {(d.groupName ?? d.name)[lang]}
                  {d.notInGame && <span className="not-in-game" title={t.notInGameHelp}>{t.notInGame}</span>}
                </div>
                <Progress all={all} dex={d} allForms={false} ticks={dt} day={day} icon={ownIcon} g={g(d)} />
                {starLines(false)}
              </Link>
              {allFormsOn(d.key, profile) && (
                <Link href={`/dex/${d.key}?forms=all`} className="tile-forms">
                  <div className="sub">{t.allForms}</div>
                  <Progress all={all} dex={d} allForms ticks={dt} day={day} icon={ownIcon} g={g(d)} />
                  {starLines(true)}
                </Link>
              )}
            </div>
          );
        })}
      </div>

    </>
  );
}
