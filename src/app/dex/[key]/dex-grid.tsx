"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmSlider } from "@/components/confirm-slider";
import { CheckButton, HoverShiny, PuzzleIcon, StarButton, StarIcon } from "@/components/mon-ui";
import type { Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useTicks, type TickChanges, type TickRow } from "@/lib/use-ticks";

type StarKind = "star" | "star3";

export interface Card {
  id: string;
  no: number;
  /** Evolution family key, used by the family search. */
  family: string;
  name: string;
  gen: number;
  image: string | null;
  shinyImage: string | null;
  status: Status;
  date: string | null;
  rows: string[];
  formType: string;
  /** Battle-only forms: shown, but can't be ticked or counted. */
  showOnly: boolean;
  /** Shiny toggles on this card: one star, plus three stars on Caught. */
  stars: { kind: StarKind; dex: string; label: string; rows: string[] }[];
}

type Show = "all" | "missing" | "collected";
/** What a bulk action targets: the regular checkmark or one of the shiny stars. */
type Target = "regular" | StarKind;
type Bulk = { action: "check" | "uncheck"; targets: Set<Target> } | null;

export function DexGrid({
  dexKey, title, notInGame, cards, familyNames, gens, starKinds, initialTicks, userId,
  initialShowUpcoming, initialShowUnreleased, canSwitchForms, allForms, t,
}: {
  dexKey: string;
  title: string;
  notInGame: boolean;
  cards: Card[];
  /** All names in each family (lower case, "|"-separated), keyed by family. */
  familyNames: Record<string, string>;
  gens: { gen_nr: number; region: string }[];
  /** Shiny toggles switched on for this dex, in display order. */
  starKinds: StarKind[];
  initialTicks: TickRow[];
  userId: string;
  initialShowUpcoming: boolean;
  initialShowUnreleased: boolean;
  canSwitchForms: boolean;
  allForms: boolean;
  t: Dict;
}) {
  const { get, save, toggle, toggleWanted: toggleStarWanted, error } = useTicks(userId, initialTicks);
  const has = (id: string) => !!get(dexKey, id);
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<string>("");
  const [show, setShow] = useState<Show>("all");
  const [bulk, setBulk] = useState<Bulk>(null);
  const [showUpcoming, setShowUpcoming] = useState(initialShowUpcoming);
  const [showUnreleased, setShowUnreleased] = useState(initialShowUnreleased);
  const [searchFamily, setSearchFamily] = useState(false);

  // Saved on the profile, so every dex page and device uses the same choice.
  function saveSetting(field: "show_upcoming" | "show_unreleased", value: boolean) {
    void createClient().from("profiles").update({ [field]: value }).eq("id", userId);
  }

  const stateOf = (c: Card) => ({
    collected: c.rows.some((r) => get(dexKey, r)?.collected),
    wanted: c.rows.some((r) => get(dexKey, r)?.wanted),
  });
  const starOf = (c: Card, kind: StarKind) => c.stars.find((s) => s.kind === kind);
  const starOn = (st: Card["stars"][number]) => st.rows.some((r) => get(st.dex, r)?.collected);

  const available = cards.filter((c) => c.status === "available" && c.rows.length > 0);
  const done = available.filter((c) => stateOf(c).collected).length;
  // Shiny counters: released shiny versions in this dex, and how many are ticked.
  const starCounts = starKinds.map((kind) => {
    const withStar = cards.filter((c) => c.status === "available" && starOf(c, kind));
    return { kind, total: withStar.length, done: withStar.filter((c) => starOn(starOf(c, kind)!)).length };
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (q) {
        const hit = c.name.toLowerCase().includes(q) || String(c.no) === q
          || (searchFamily && (familyNames[c.family] ?? "").includes(q));
        if (!hit) return false;
      }
      if (gen && String(c.gen) !== gen) return false;
      if (c.status === "upcoming" && !showUpcoming) return false;
      if (c.status === "unreleased" && !showUnreleased) return false;
      if (show === "missing") {
        // Missing: not collected yet or wanted, plus everything about to be released.
        if (c.status === "upcoming") return true;
        if (c.status !== "available" || c.rows.length === 0) return false;
        const s = stateOf(c);
        if (!s.collected || s.wanted) return true;
        // Shown shiny stars count too: a shiny not yet ticked, or one marked wanted.
        return c.stars.some((st) => !starOn(st) || st.rows.some((r) => get(st.dex, r)?.wanted));
      }
      if (show === "collected") return c.status === "available" && stateOf(c).collected;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, query, gen, show, get, showUpcoming, showUnreleased, searchFamily, familyNames]);

  const groups = useMemo(() => {
    const byGen = new Map<number, Card[]>();
    for (const c of visible) {
      const list = byGen.get(c.gen) ?? [];
      list.push(c);
      byGen.set(c.gen, list);
    }
    return gens.filter((g) => byGen.has(g.gen_nr)).map((g) => ({ ...g, cards: byGen.get(g.gen_nr)! }));
  }, [visible, gens]);

  /** Cards a bulk action would change, within the current view. */
  function bulkCards(action: "check" | "uncheck", target: Target): Card[] {
    const live = visible.filter((c) => c.status === "available");
    if (target === "regular") {
      return action === "check"
        ? live.filter((c) => c.rows.length > 0 && !stateOf(c).collected)
        : live.filter((c) => c.rows.some(has));
    }
    return live.filter((c) => {
      const st = starOf(c, target);
      if (!st) return false;
      return action === "check" ? !starOn(st) : st.rows.some((r) => get(st.dex, r));
    });
  }

  // Changes are planned per dex first so linked ticks are saved together.
  type Plan = Map<string, TickChanges>;
  const put = (plan: Plan, dex: string, id: string, v: { collected: boolean; wanted: boolean } | null) => {
    const m = plan.get(dex) ?? new Map();
    m.set(id, v);
    plan.set(dex, m);
  };
  const commit = (plan: Plan) => { for (const [dex, changes] of plan) void save(dex, changes); };

  /**
   * Shiny rules: ticking any shiny also ticks the regular checkmark; ticking the 3-star also
   * ticks the single star; unticking the single star also unticks the 3-star.
   */
  function planStar(plan: Plan, c: Card, kind: StarKind, on: boolean) {
    const st = starOf(c, kind);
    if (!st) return;
    if (on) {
      if (!starOn(st)) put(plan, st.dex, st.rows[0], { collected: true, wanted: false });
      if (!stateOf(c).collected && c.rows.length > 0) {
        put(plan, dexKey, c.rows.includes(st.rows[0]) ? st.rows[0] : c.rows[0], { collected: true, wanted: false });
      }
      if (kind === "star3") planStar(plan, c, "star", true);
    } else {
      for (const r of st.rows) { if (get(st.dex, r)) put(plan, st.dex, r, null); }
      if (kind === "star") planStar(plan, c, "star3", false);
    }
  }

  /** Unticking the regular checkmark also unticks the shiny stars. */
  function planRegular(plan: Plan, c: Card, on: boolean) {
    if (on) {
      put(plan, dexKey, c.rows[0], { collected: true, wanted: false });
    } else {
      for (const r of c.rows) { if (has(r)) put(plan, dexKey, r, null); }
      planStar(plan, c, "star", false);
      planStar(plan, c, "star3", false);
    }
  }

  function toggleStarOf(c: Card, st: Card["stars"][number]) {
    const plan: Plan = new Map();
    planStar(plan, c, st.kind, !starOn(st));
    commit(plan);
  }

  function toggleCollected(c: Card) {
    if (c.status !== "available" || c.rows.length === 0) return;
    const plan: Plan = new Map();
    planRegular(plan, c, !stateOf(c).collected);
    commit(plan);
  }

  // Wanted mode: tapping a ticked checkmark or star marks it as wanted instead of unticking it.
  const [wantedMode, setWantedMode] = useState(false);
  function tapCheck(c: Card) {
    if (!wantedMode) return toggleCollected(c);
    if (stateOf(c).collected) toggleWanted(c);
  }
  function tapStar(c: Card, st: Card["stars"][number]) {
    if (!wantedMode) return toggleStarOf(c, st);
    if (starOn(st)) toggleStarWanted(st.dex, st.rows);
  }

  // Filters float at the top; once scrolled past, they collapse into a slim bar until tapped.
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setScrolled(!e.isIntersecting);
      if (e.isIntersecting) setOpen(false);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!open || !scrolled) return;
    // Collapse again once the user scrolls on through the list.
    const start = window.scrollY;
    const onScroll = () => { if (Math.abs(window.scrollY - start) > 240) setOpen(false); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, scrolled]);
  const collapsed = scrolled && !open;
  const summary = [
    query.trim() ? `“${query.trim()}”` : null,
    gen ? gens.find((g) => String(g.gen_nr) === gen)?.region : null,
    show !== "all" ? { missing: t.showMissing, collected: t.showCollected }[show] : null,
    wantedMode ? t.wantedMode : null,
  ].filter(Boolean).join(" · ");

  function toggleWanted(c: Card) {
    const ticked = c.rows.filter((r) => get(dexKey, r)?.collected);
    if (ticked.length === 0) return;
    const changes: TickChanges = new Map();
    if (stateOf(c).wanted) for (const r of ticked) changes.set(r, { collected: true, wanted: false });
    else changes.set(ticked[0], { collected: true, wanted: true });
    void save(dexKey, changes);
  }

  function runBulk() {
    if (!bulk) return;
    const { action, targets } = bulk;
    setBulk(null);
    const plan: Plan = new Map();
    for (const target of targets) {
      for (const c of bulkCards(action, target)) {
        if (target === "regular") planRegular(plan, c, action === "check");
        else planStar(plan, c, target, action === "check");
      }
    }
    commit(plan);
  }

  const label = (action: "check" | "uncheck", target: Target) =>
    target === "regular"
      ? t.checkRegular
      : target === "star"
        ? action === "check" ? t.checkShiny : t.uncheckShiny
        : action === "check" ? t.checkShiny3 : t.uncheckShiny3;

  // Check all / Uncheck all open the confirmation box; shiny choices are picked inside it.
  const openBulk = (action: "check" | "uncheck") =>
    setBulk({ action, targets: new Set<Target>(["regular"]) });
  const pickTarget = (target: Target) =>
    setBulk((b) => {
      if (!b) return b;
      const targets = new Set(b.targets);
      if (targets.has(target)) targets.delete(target);
      else targets.add(target);
      return { ...b, targets };
    });
  const anyFor = (action: "check" | "uncheck") =>
    (["regular", ...starKinds] as Target[]).some((tg) => bulkCards(action, tg).length > 0);

  return (
    <>
      <div className="dex-head">
        <h1>{title}</h1>
        {notInGame && <span className="not-in-game" title={t.notInGameHelp}>{t.notInGame}</span>}
        <span className="count">{done} / {available.length}</span>
        {starCounts.map((sc) => (
          <span key={sc.kind} className="count star-count">
            <StarIcon kind={sc.kind} size={16} />{sc.done} / {sc.total}
          </span>
        ))}
        {canSwitchForms && (
          <span className="seg" style={{ marginLeft: "auto" }}>
            <Link href={`/dex/${dexKey}`} aria-current={!allForms ? "page" : undefined}>{t.inGame}</Link>
            <Link href={`/dex/${dexKey}?forms=all`} aria-current={allForms ? "page" : undefined}>{t.allForms}</Link>
          </span>
        )}
      </div>
      {notInGame && <p className="note">{t.notInGameHelp}</p>}

      <div ref={sentinel} className="filters-sentinel" aria-hidden="true" />
      <div className={`filter-bar${scrolled ? " floating" : ""}${collapsed ? " collapsed" : ""}`}>
        {collapsed && (
          <button type="button" className="filter-summary" onClick={() => setOpen(true)} aria-expanded={false}>
            <span aria-hidden="true">🔍</span>
            <span className="text">{summary || t.searchAndFilters}</span>
            <span className="count">{done} / {available.length}</span>
            <span aria-hidden="true">▾</span>
          </button>
        )}
      <div className="filters" hidden={collapsed}>
        <input type="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.search} />
        <select value={gen} onChange={(e) => setGen(e.target.value)} aria-label={t.allGens}>
          <option value="">{t.allGens}</option>
          {gens.map((g) => <option key={g.gen_nr} value={String(g.gen_nr)}>{g.region}</option>)}
        </select>
        <span className="seg" role="group" aria-label={t.show}>
          {(["all", "missing", "collected"] as Show[]).map((s) => (
            <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)}>
              {{ all: t.showAll, missing: t.showMissing, collected: t.showCollected }[s]}
            </button>
          ))}
        </span>
        <span className="switches">
          <button type="button" role="switch" aria-checked={searchFamily} className="switch" onClick={() => setSearchFamily(!searchFamily)}>
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            {t.searchFamily}
          </button>
          <button
            type="button" role="switch" aria-checked={showUpcoming} className="switch"
            onClick={() => { setShowUpcoming(!showUpcoming); saveSetting("show_upcoming", !showUpcoming); }}
          >
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            {t.showUpcoming}
          </button>
          <button
            type="button" role="switch" aria-checked={showUnreleased} className="switch"
            onClick={() => { setShowUnreleased(!showUnreleased); saveSetting("show_unreleased", !showUnreleased); }}
          >
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            {t.showUnreleasedSwitch}
          </button>
        </span>
        <span className="bulk">
          <button type="button" className="btn ghost" disabled={!anyFor("check")} onClick={() => openBulk("check")}>{t.checkAll}</button>
          <button type="button" className="btn ghost" disabled={!anyFor("uncheck")} onClick={() => openBulk("uncheck")}>{t.uncheckAll}</button>
          <button type="button" role="switch" aria-checked={wantedMode} className="switch" onClick={() => setWantedMode(!wantedMode)}>
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            <PuzzleIcon size={16} /> {t.wantedMode}
          </button>
        </span>
        {scrolled && (
          <button type="button" className="btn ghost small collapse-btn" onClick={() => setOpen(false)}>▴ {t.hideFilters}</button>
        )}
      </div>
      </div>
      {wantedMode && <p className="note">{t.wantedModeHelp}</p>}

      {error && <p className="msg error" role="alert">{t.errorGeneric}</p>}

      {groups.length === 0 ? (
        <p className="empty">{t.noResults}</p>
      ) : (
        groups.map((g) => (
          <section key={g.gen_nr}>
            <h2 className="gen-title">{g.region}</h2>
            <div className="grid">
              {g.cards.map((c) => {
                const s = stateOf(c);
                const cls = ["mon", c.status !== "available" ? c.status : s.collected ? "collected" : ""].join(" ");
                return (
                  <div key={c.id} className={cls}>
                    {c.status === "available" && c.rows.length > 0 && (
                      <CheckButton
                        on={s.collected} label={t.collect} onClick={() => tapCheck(c)}
                        wanted={s.wanted} dim={wantedMode && !s.collected}
                      />
                    )}
                    <Link href={`/pokemon/${c.no}?dex=${dexKey}`} className="mon-link">
                      <span className="pic"><HoverShiny regular={c.image} shiny={c.shinyImage} /></span>
                      <span className="no">#{String(c.no).padStart(4, "0")}</span>
                      <span className="nm">{c.name}</span>
                      {allForms && (
                        <span className={`tag form${c.showOnly ? " show-only" : ""}`}>{c.showOnly ? t.battleOnly : (t.formTypes[c.formType] ?? c.formType)}</span>
                      )}
                      {c.status === "upcoming" && <span className="tag">{t.upcoming} {c.date}</span>}
                      {c.status === "unreleased" && <span className="tag">{t.unreleased}</span>}
                    </Link>
                    {c.status === "available" && c.stars.length > 0 && (
                      <span className="extras">
                        {c.stars.map((st) => (
                          <span key={st.dex} className="star-pair">
                            <StarButton
                              kind={st.kind} label={st.label} on={starOn(st)} onClick={() => tapStar(c, st)}
                              wanted={st.rows.some((r) => get(st.dex, r)?.wanted)} dim={wantedMode && !starOn(st)}
                            />
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {bulk && (
        <ConfirmSlider
          title={bulk.action === "check" ? t.checkAll : t.uncheckAll}
          text={bulk.action === "check" ? t.bulkCheckText : t.bulkUncheckText}
          slideLabel={t.slideToConfirm}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          canConfirm={[...bulk.targets].some((tg) => bulkCards(bulk.action, tg).length > 0)}
          onConfirm={runBulk}
          onCancel={() => setBulk(null)}
        >
          <div className="bulk-choices">
            {(["regular", ...starKinds] as Target[]).map((tg) => {
              const n = bulkCards(bulk.action, tg).length;
              return (
                <label key={tg} className="check">
                  <input type="checkbox" checked={bulk.targets.has(tg)} disabled={n === 0} onChange={() => pickTarget(tg)} />
                  {tg !== "regular" && <StarIcon kind={tg} size={18} />}
                  <span>{label(bulk.action, tg)}</span>
                  <span className="n">{n}</span>
                </label>
              );
            })}
          </div>
        </ConfirmSlider>
      )}
    </>
  );
}
