"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BadgeButton, BadgeIcon, DexTick, MonImage, PuzzleIcon, ShinySwap, StarButton, StarIcon, type BadgeIconKind } from "@/components/mon-ui";
import { canWant, type Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { useTicks, type TickChanges, type TickRow } from "@/lib/use-ticks";

/** One extra dex shown as an icon on a form: a shiny star or a Lucky/XXL/XXS/Perfect/Shadow/Purified icon. */
export interface Badge {
  dex: string;
  icon: "star" | "star3" | BadgeIconKind;
  label: string;
  row: 1 | 2;
  /** Ticking this also ticks the parent; unticking the parent unticks this. */
  parent?: string;
}

export interface FormCard {
  id: string;
  name: string;
  formType: string;
  regular: string | null;
  shiny: string | null;
  status: Status;
  date: string | null;
  /** Dex this form's checkmark ticks in. */
  dex: string;
  /** Shown when that dex differs from the one the page was opened from. */
  dexName: string | null;
  tickable: boolean;
  badges: Badge[];
}

/** Link to the previous or next species. */
export interface SpeciesLink { no: number; name: string; image: string | null; href: string }

function NeighbourLink({ link, dir, label }: { link: SpeciesLink | null; dir: "prev" | "next"; label: string }) {
  if (!link) return <span />;
  const nr = `#${String(link.no).padStart(4, "0")}`;
  return (
    <Link href={link.href} className={`species-step ${dir}`} aria-label={`${label}: ${nr} ${link.name}`}>
      {dir === "prev" && <span aria-hidden="true">←</span>}
      <MonImage file={link.image} size={32} />
      <span className="no">{nr}</span>
      <span className="nm">{link.name}</span>
      {dir === "next" && <span aria-hidden="true">→</span>}
    </Link>
  );
}

export function SpeciesForms({
  title, no, dexName, backHref, forms, prev, next, initialTicks, userId, isAdmin, evolution, t,
}: {
  title: string;
  no: number;
  dexName: string;
  backHref: string;
  forms: FormCard[];
  prev: SpeciesLink | null;
  next: SpeciesLink | null;
  initialTicks: TickRow[];
  userId: string;
  isAdmin: boolean;
  /** What it evolves from and into (built on the server). */
  evolution?: ReactNode;
  t: Dict;
}) {
  const { get, save, toggleWanted, error } = useTicks(userId, initialTicks);
  const on = (dex: string, id: string) => !!get(dex, id)?.collected;

  /**
   * Tick or untick one dex for a form, following the links: ticking ticks every ancestor
   * (a shiny ticks its regular, a 3-star ticks the shiny), unticking unticks every descendant.
   */
  function setDex(f: FormCard, dex: string, value: boolean, plan = new Map<string, TickChanges>()) {
    const put = (d: string, v: { collected: boolean; wanted: boolean } | null) => {
      const m = plan.get(d) ?? new Map();
      m.set(f.id, v);
      plan.set(d, m);
    };
    if (value) {
      if (!on(dex, f.id)) put(dex, { collected: true, wanted: false });
      const parent = f.badges.find((b) => b.dex === dex)?.parent;
      if (parent && !on(parent, f.id) && !plan.get(parent)?.get(f.id)) setDex(f, parent, true, plan);
    } else {
      if (get(dex, f.id)) put(dex, null);
      for (const child of f.badges.filter((b) => b.parent === dex)) setDex(f, child.dex, false, plan);
    }
    return plan;
  }
  const flip = (f: FormCard, dex: string) => {
    for (const [d, changes] of setDex(f, dex, !on(dex, f.id))) void save(d, changes);
  };

  // Wanted mode: tapping an icon marks it as wanted (puzzle piece) instead of ticking it.
  // Only ticked icons can be wanted; the others are dimmed while the mode is on.
  const [wantedMode, setWantedMode] = useState(false);
  const tap = (f: FormCard, dex: string) => {
    if (!wantedMode) return flip(f, dex);
    if (on(dex, f.id) && canWant(dex)) toggleWanted(dex, [f.id]);
  };
  // Shadow and Purified have no wanted marks.
  const isWanted = (dex: string, id: string) => canWant(dex) && !!get(dex, id)?.wanted;
  const extra = (dex: string, id: string) => ({ wanted: isWanted(dex, id), dim: wantedMode && (!on(dex, id) || !canWant(dex)) });

  // Released forms, then released costumes under their own heading (only when there are any),
  // then upcoming and unreleased forms.
  const isCostume = (f: FormCard) => f.formType === "Costume";
  const groups: { key: string; heading: string | null; match: (f: FormCard) => boolean }[] = [
    { key: "released", heading: null, match: (f) => f.status === "available" && !isCostume(f) },
    { key: "costumes", heading: t.costumes, match: (f) => f.status === "available" && isCostume(f) },
    { key: "upcoming", heading: t.upcomingReleases, match: (f) => f.status === "upcoming" },
    { key: "unreleased", heading: t.unreleased, match: (f) => f.status === "unreleased" },
  ];

  const badgeRow = (f: FormCard, row: 1 | 2, lead?: ReactNode) => {
    const list = f.badges.filter((b) => b.row === row);
    if (list.length === 0 && !lead) return null;
    return (
      <span className="extras">
        {lead}
        {list.map((b) => (
          <span key={b.dex} className="star-pair">
            {b.icon === "star" || b.icon === "star3"
              ? <StarButton kind={b.icon} label={b.label} on={on(b.dex, f.id)} onClick={() => tap(f, b.dex)} {...extra(b.dex, f.id)} />
              : <BadgeButton kind={b.icon} label={b.label} on={on(b.dex, f.id)} onClick={() => tap(f, b.dex)} {...extra(b.dex, f.id)} />}
          </span>
        ))}
      </span>
    );
  };

  return (
    <>
      <div className="back-row">
        <Link href={backHref} className="back-link">← {t.back}</Link>
        <details className="legend">
          <summary>{t.legend}</summary>
          <ul>
            <li><span className="tick legend-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg></span>{t.legendCaught}</li>
            <li><span className="star legend-icon on"><StarIcon kind="star" size={20} /></span>Shiny</li>
            <li><span className="star legend-icon on"><StarIcon kind="star3" size={20} /></span>Shiny ⭐⭐⭐</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="lucky" size={20} /></span>Lucky</li>
            <li><span className="badge xxl legend-icon"><BadgeIcon kind="xxl" /></span>XXL</li>
            <li><span className="badge xxs legend-icon"><BadgeIcon kind="xxs" /></span>XXS</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="perfect" size={20} /></span>{t.legendPerfect}</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="shadow" size={20} /></span>Shadow</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="shadow_shiny" size={20} /></span>Shadow shiny</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="purified" size={20} /></span>Purified</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="purified_shiny" size={20} /></span>Purified shiny</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="mega" size={20} /></span>Mega</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="mega_shiny" size={20} /></span>Mega shiny</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="gigantamax" size={20} /></span>Gigantamax</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="gigantamax_shiny" size={20} /></span>Gigantamax shiny</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="dynamax" size={20} /></span>Dynamax</li>
            <li><span className="badge legend-icon"><BadgeIcon kind="dynamax_shiny" size={20} /></span>Dynamax shiny</li>
            <li><span className="legend-icon want-legend"><PuzzleIcon /></span>{t.wanted}</li>
            <li><span className="legend-icon forbid" aria-hidden="true" />{t.legendUnavailable}</li>
            <li className="legend-help">{t.legendHelp}</li>
          </ul>
        </details>
      </div>
      <nav className="species-nav" aria-label={t.speciesNav}>
        <NeighbourLink link={prev} dir="prev" label={t.previous} />
        <NeighbourLink link={next} dir="next" label={t.next} />
      </nav>
      <div className="dex-head">
        <h1>{title}</h1>
        <span className="count">#{String(no).padStart(4, "0")}</span>
        <button type="button" role="switch" aria-checked={wantedMode} className="switch" style={{ marginLeft: "auto" }} onClick={() => setWantedMode(!wantedMode)}>
          <span className="track" aria-hidden="true"><span className="knob" /></span>
          <PuzzleIcon size={16} /> {t.wantedMode}
        </button>
      </div>
      {wantedMode && <p className="note">{t.wantedModeHelp}</p>}
      {error && <p className="msg error" role="alert">{t.errorGeneric}</p>}
      {evolution}

      {groups.map(({ key, heading, match }) => {
        const list = forms.filter(match);
        if (list.length === 0) return null;
        return (
          <section key={key}>
            {heading && <h2 className="gen-title">{heading}</h2>}
            <div className="grid forms">
              {list.map((f) => {
                const s = get(f.dex, f.id);
                const cls = ["mon", f.status !== "available" ? f.status : s?.collected ? "collected" : ""].join(" ");
                return (
                  <div key={f.id} className={cls}>
                    <ShinySwap regular={f.regular} shiny={f.shiny} label={t.showShiny} />
                    <span className="nm">{f.name}</span>
                    <span className="tag">{t.formTypes[f.formType] ?? f.formType}</span>
                    {f.status === "upcoming" && <span className="tag up">{f.date}</span>}
                    {f.tickable && (
                      <div className="icon-tray">
                        {badgeRow(f, 1, <DexTick dex={f.dex} on={!!s?.collected} label={t.collect} onClick={() => tap(f, f.dex)} {...extra(f.dex, f.id)} />)}
                        {badgeRow(f, 2)}
                      </div>
                    )}
                    {isAdmin && (
                      <Link href={`/admin/pokemon/${encodeURIComponent(f.id)}`} className="edit-pen" aria-label={`${t.edit} ${f.name}`} title={t.edit}>
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                          <path d="M13.5 6.5l4 4" />
                        </svg>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
