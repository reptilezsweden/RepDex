"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ConfirmSlider } from "@/components/confirm-slider";
import { BadgeButton, BadgeIcon, DEX_ICON, DexTick, HoverShiny, PuzzleIcon, StarButton, StarIcon, type BadgeIconKind } from "@/components/mon-ui";
import { CAUGHT_LINKED, canWant, type Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useTicks, type TickChanges, type TickRow } from "@/lib/use-ticks";

export type SlotIcon = "star" | "star3" | BadgeIconKind;

/**
 * An extra tick on each card besides the page's own dex: a shiny star, or a second dex shown on
 * the same page (XXS on the XXL page, Purified on the Shadow page) with its own shiny.
 */
export interface SlotDef {
  dex: string;
  icon: SlotIcon;
  label: string;
  /** Ticking this also ticks the parent, and unticking the parent unticks this. The page's own
   * dex, another slot, or null for a dex of its own (XXS, Purified). */
  parent: string | null;
}

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
  /** Rows that also tick in the parent dex (Caught) when ticked here. */
  parentRows: string[];
  formType: string;
  /** Battle-only forms: shown, but can't be ticked or counted. */
  showOnly: boolean;
  /** Extra ticks on this card (released ones only), with the rows each can tick. */
  slots: (SlotDef & { rows: string[] })[];
}

type Slot = Card["slots"][number];

function SlotIconView({ icon, size }: { icon: SlotIcon; size: number }) {
  return icon === "star" || icon === "star3"
    ? <StarIcon kind={icon} size={size} />
    : <span className="badge slot-icon"><BadgeIcon kind={icon} size={size} /></span>;
}

type Show = "all" | "missing" | "collected";
/** What a bulk action targets: the page's own tick ("regular") or one of the slots, by dex key. */
type Target = string;
type Bulk = { action: "check" | "uncheck"; targets: Set<Target> } | null;

export function DexGrid({
  dexKey, title, ownName, notInGame, cards, familyNames, gens, slotDefs, parentDex, childDexes, initialTicks, userId,
  initialShowUpcoming, initialShowUnreleased, initialShow, initialSearchFamily, canSwitchForms, allForms, t,
}: {
  dexKey: string;
  title: string;
  /** This dex's own name (XXL on the XXL/XXS page). */
  ownName: string;
  notInGame: boolean;
  cards: Card[];
  /** All names in each family (lower case, "|"-separated), keyed by family. */
  familyNames: Record<string, string>;
  gens: { gen_nr: number; region: string }[];
  /** Extra ticks shown on this page, in display order. */
  slotDefs: SlotDef[];
  /** Caught, when this page has a dex that follows it (Lucky, XXL/XXS, 100%): ticking those ticks Caught too. */
  parentDex: string | null;
  /** Dexes unticked along with this one (Lucky, XXL, XXS and Perfect, on the Caught page). */
  childDexes: string[];
  initialTicks: TickRow[];
  userId: string;
  initialShowUpcoming: boolean;
  initialShowUnreleased: boolean;
  initialShow: Show;
  initialSearchFamily: boolean;
  canSwitchForms: boolean;
  allForms: boolean;
  t: Dict;
}) {
  const { get, save, toggle, toggleWanted: toggleStarWanted, error } = useTicks(userId, initialTicks);
  const has = (id: string) => !!get(dexKey, id);
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<string>("");
  const [show, setShowState] = useState<Show>(initialShow);
  const [bulk, setBulk] = useState<Bulk>(null);
  const [showUpcoming, setShowUpcoming] = useState(initialShowUpcoming);
  const [showUnreleased, setShowUnreleased] = useState(initialShowUnreleased);
  const [searchFamily, setSearchFamilyState] = useState(initialSearchFamily);

  // Saved on the profile, so every dex page and device uses the same choice.
  function saveSetting(field: "show_upcoming" | "show_unreleased" | "show_filter" | "search_family", value: boolean | string) {
    // Supabase only sends the request once the query is awaited, so .then() is needed here.
    void createClient().from("profiles").update({ [field]: value }).eq("id", userId).then(() => {});
  }
  const setShow = (v: Show) => { setShowState(v); saveSetting("show_filter", v); };
  const setSearchFamily = (v: boolean) => { setSearchFamilyState(v); saveSetting("search_family", v); };

  const stateOf = (c: Card) => ({
    collected: c.rows.some((r) => get(dexKey, r)?.collected),
    wanted: canWant(dexKey) && c.rows.some((r) => get(dexKey, r)?.wanted),
  });
  // In game cards stand for every form of a species. The checkmark shows the card's own row
  // (usually the regular form); another collected form shows as a dotted mark but still counts.
  const mainRow = (c: Card) => (c.rows.includes(c.id) ? c.id : c.rows[0]);
  const mainOn = (c: Card) => c.rows.length > 0 && !!get(dexKey, mainRow(c))?.collected;
  const slotOf = (c: Card, dex: string) => c.slots.find((s) => s.dex === dex);
  const slotOn = (sl: Slot) => sl.rows.some((r) => get(sl.dex, r)?.collected);
  const slotWanted = (sl: Slot) => canWant(sl.dex) && sl.rows.some((r) => get(sl.dex, r)?.wanted);
  // A card counts as collected (green) when its own tick or a dex of its own on the card is ticked.
  const anyCollected = (c: Card) => stateOf(c).collected || c.slots.some((sl) => sl.parent === null && slotOn(sl));
  const linksCaught = (dex: string) => !!parentDex && CAUGHT_LINKED.includes(dex);

  const available = cards.filter((c) => c.status === "available" && c.rows.length > 0);
  const done = available.filter((c) => stateOf(c).collected).length;
  const hasPeers = slotDefs.some((d) => d.parent === null);

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
        // The extra ticks count too: one not yet ticked, or one marked wanted.
        return c.slots.some((sl) => !slotOn(sl) || slotWanted(sl));
      }
      if (show === "collected") return c.status === "available" && anyCollected(c);
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
      const sl = slotOf(c, target);
      if (!sl) return false;
      return action === "check" ? !slotOn(sl) : sl.rows.some((r) => get(sl.dex, r));
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

  /** Ticks Caught along with a dex that follows it (XXL, XXS, Lucky, 100%). */
  const tickCaught = (plan: Plan, c: Card, dex: string, r: string) => {
    if (linksCaught(dex) && c.parentRows.includes(r) && !get(parentDex!, r)?.collected) {
      put(plan, parentDex!, r, { collected: true, wanted: false });
    }
  };

  /**
   * Slot rules: ticking one also ticks its parent (a shiny ticks its regular, the 3-star ticks the
   * single star); unticking one unticks the slots below it. Dexes of their own (XXS, Purified)
   * have no parent.
   */
  function planSlot(plan: Plan, c: Card, dex: string, on: boolean) {
    const sl = slotOf(c, dex);
    if (!sl) return;
    if (on) {
      if (!slotOn(sl)) {
        put(plan, sl.dex, sl.rows[0], { collected: true, wanted: false });
        tickCaught(plan, c, sl.dex, sl.rows[0]);
      }
      if (sl.parent === dexKey) {
        const r = c.rows.includes(sl.rows[0]) ? sl.rows[0] : mainRow(c);
        if (r && !get(dexKey, r)?.collected) {
          put(plan, dexKey, r, { collected: true, wanted: false });
          tickCaught(plan, c, dexKey, r);
        }
      } else if (sl.parent) planSlot(plan, c, sl.parent, true);
    } else {
      for (const r of sl.rows) { if (get(sl.dex, r)) put(plan, sl.dex, r, null); }
      for (const child of c.slots.filter((x) => x.parent === sl.dex)) planSlot(plan, c, child.dex, false);
    }
  }

  /**
   * The page's own tick. Ticking also ticks Caught (on Lucky, XXL/XXS and 100%). Unticking it
   * unticks its shiny stars, and on Caught also Lucky, XXL, XXS and 100%.
   */
  function planRegular(plan: Plan, c: Card, on: boolean, allRows = true) {
    if (on) {
      const r = mainRow(c);
      put(plan, dexKey, r, { collected: true, wanted: false });
      tickCaught(plan, c, dexKey, r);
    } else {
      // A tap unticks the card's own row; Uncheck all unticks every form behind the card.
      const rows = allRows ? c.rows : [mainRow(c)];
      for (const r of rows) { if (has(r)) put(plan, dexKey, r, null); }
      for (const child of childDexes) {
        for (const r of rows) { if (get(child, r)) put(plan, child, r, null); }
      }
      const below = (dex: string): Slot[] => c.slots.filter((x) => x.parent === dex).flatMap((x) => [x, ...below(x.dex)]);
      for (const sl of below(dexKey)) {
        if (allRows) planSlot(plan, c, sl.dex, false);
        else for (const r of rows) { if (get(sl.dex, r)) put(plan, sl.dex, r, null); }
      }
    }
  }

  function toggleSlot(c: Card, sl: Slot) {
    const plan: Plan = new Map();
    planSlot(plan, c, sl.dex, !slotOn(sl));
    commit(plan);
  }

  function toggleCollected(c: Card) {
    if (c.status !== "available" || c.rows.length === 0) return;
    const plan: Plan = new Map();
    planRegular(plan, c, !mainOn(c), false);
    commit(plan);
  }

  // Wanted mode: tapping a ticked checkmark or star marks it as wanted instead of unticking it.
  const [wantedMode, setWantedMode] = useState(false);
  function tapCheck(c: Card) {
    if (!wantedMode) return toggleCollected(c);
    if (stateOf(c).collected) toggleWanted(c);
  }
  function tapSlot(c: Card, sl: Slot) {
    if (!wantedMode) return toggleSlot(c, sl);
    if (slotOn(sl) && canWant(sl.dex)) toggleStarWanted(sl.dex, sl.rows);
  }

  // Filters float at the top; once scrolled past, they collapse into a slim bar until tapped.
  // The floating bar is position: fixed and its slot keeps the full filter height in the page,
  // so floating never changes the layout (changing it made the switch flicker back and forth
  // on slow scrolls and made mobile browsers jump).
  const slot = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [slotHeight, setSlotHeight] = useState(0);
  const [topHeight, setTopHeight] = useState(0);
  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const topbar = document.querySelector<HTMLElement>(".topbar");
    let frame = 0;
    const check = () => {
      frame = 0;
      const top = topbar?.offsetHeight ?? 0;
      setTopHeight(top);
      const bottom = el.getBoundingClientRect().bottom;
      // Float once the filters are fully behind the top bar; stop a little lower down (hysteresis).
      const next = scrolledRef.current ? bottom < top + 24 : bottom < top;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setScrolled(next);
        if (!next) setOpen(false);
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    // Remember the in-page height of the filters while they're in place.
    const ro = new ResizeObserver(() => { if (!scrolledRef.current) setSlotHeight(el.offsetHeight); });
    ro.observe(el);
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
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
        else planSlot(plan, c, target, action === "check");
      }
    }
    commit(plan);
  }

  const label = (target: Target) =>
    target === "regular" ? (hasPeers ? ownName : t.checkRegular) : (slotDefs.find((d) => d.dex === target)?.label ?? target);
  const targets: Target[] = ["regular", ...slotDefs.map((d) => d.dex)];

  // Check all / Uncheck all open the confirmation box; shiny choices are picked inside it.
  const openBulk = (action: "check" | "uncheck") =>
    // On combined pages (XXL/XXS, Shadow/Purified) the parts are equal, so nothing is pre-picked.
    setBulk({ action, targets: new Set<Target>(hasPeers ? [] : ["regular"]) });
  const pickTarget = (target: Target) =>
    setBulk((b) => {
      if (!b) return b;
      const targets = new Set(b.targets);
      if (targets.has(target)) targets.delete(target);
      else targets.add(target);
      return { ...b, targets };
    });
  const anyFor = (action: "check" | "uncheck") =>
    targets.some((tg) => bulkCards(action, tg).length > 0);

  /** Counters for a set of cards: this dex's own tick, then each extra tick (shiny, XXS, Purified…). */
  const counters = (list: Card[]) => {
    const own = list.filter((c) => c.status === "available" && c.rows.length > 0);
    return (
      <>
        <span className="count star-count">
          {hasPeers && DEX_ICON[dexKey] && <SlotIconView icon={DEX_ICON[dexKey]!} size={16} />}
          {own.filter((c) => stateOf(c).collected).length} / {own.length}
        </span>
        {slotDefs.map((d) => {
          const withSlot = list.filter((c) => c.status === "available" && slotOf(c, d.dex));
          if (withSlot.length === 0 && list !== cards) return null;
          return (
            <span key={d.dex} className="count star-count" title={d.label}>
              <SlotIconView icon={d.icon} size={16} />{withSlot.filter((c) => slotOn(slotOf(c, d.dex)!)).length} / {withSlot.length}
            </span>
          );
        })}
      </>
    );
  };

  return (
    <>
      <div className="dex-head">
        <h1>{title}</h1>
        {notInGame && <span className="not-in-game" title={t.notInGameHelp}>{t.notInGame}</span>}
        {counters(cards)}
        {canSwitchForms && (
          <span className="seg" style={{ marginLeft: "auto" }}>
            <Link href={`/dex/${dexKey}`} aria-current={!allForms ? "page" : undefined}>{t.inGame}</Link>
            <Link href={`/dex/${dexKey}?forms=all`} aria-current={allForms ? "page" : undefined}>{t.allForms}</Link>
          </span>
        )}
      </div>
      {notInGame && <p className="note">{t.notInGameHelp}</p>}

      <div ref={slot} className="filter-slot" style={scrolled ? { minHeight: slotHeight } : undefined}>
      <div
        className={`filter-bar${scrolled ? " floating" : ""}${collapsed ? " collapsed" : ""}`}
        style={scrolled ? ({ "--top-h": `${topHeight}px` } as CSSProperties) : undefined}
      >
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
          {/* Collected never shows upcoming entries, and only All shows unreleased ones: those switches
              are greyed out and struck through while they have no effect. */}
          <button
            type="button" role="switch" aria-checked={showUpcoming} className={`switch${show === "collected" ? " inactive" : ""}`}
            disabled={show === "collected"}
            onClick={() => { setShowUpcoming(!showUpcoming); saveSetting("show_upcoming", !showUpcoming); }}
          >
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            {t.showUpcoming}
          </button>
          <button
            type="button" role="switch" aria-checked={showUnreleased} className={`switch${show !== "all" ? " inactive" : ""}`}
            disabled={show !== "all"}
            onClick={() => { setShowUnreleased(!showUnreleased); saveSetting("show_unreleased", !showUnreleased); }}
          >
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            {t.showUnreleasedSwitch}
          </button>
        </span>
        <span className="bulk">
          <button type="button" className="btn ghost" disabled={!anyFor("check")} onClick={() => openBulk("check")}>{t.checkAll}</button>
          <button type="button" className="btn ghost" disabled={!anyFor("uncheck")} onClick={() => openBulk("uncheck")}>{t.uncheckAll}</button>
          {canWant(dexKey) && (
            <button type="button" role="switch" aria-checked={wantedMode} className="switch" onClick={() => setWantedMode(!wantedMode)}>
              <span className="track" aria-hidden="true"><span className="knob" /></span>
              <PuzzleIcon size={16} /> {t.wantedMode}
            </button>
          )}
        </span>
        {scrolled && (
          <button type="button" className="btn ghost small collapse-btn" onClick={() => setOpen(false)}>▴ {t.hideFilters}</button>
        )}
      </div>
      </div>
      </div>
      {wantedMode && <p className="note">{t.wantedModeHelp}</p>}

      {error && <p className="msg error" role="alert">{t.errorGeneric}</p>}

      {groups.length === 0 ? (
        <p className="empty">{t.noResults}</p>
      ) : (
        groups.map((g) => (
          <section key={g.gen_nr}>
            <h2 className="gen-title">
              <span>{g.region}</span>
              {/* Counters for the whole generation, whatever the filters show. */}
              <span className="gen-counts">{counters(cards.filter((c) => c.gen === g.gen_nr))}</span>
            </h2>
            <div className="grid">
              {g.cards.map((c) => {
                const s = stateOf(c);
                const cls = ["mon", c.status !== "available" ? c.status : anyCollected(c) ? "collected" : ""].join(" ");
                return (
                  <div key={c.id} className={cls}>
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
                    {/* Tick icons at the bottom of every card, so cards line up. */}
                    <div className="icon-tray one">
                      {c.status === "available" && c.rows.length > 0 && (
                        <span className="extras">
                          <DexTick
                            dex={dexKey} on={mainOn(c)} label={t.collect} onClick={() => tapCheck(c)}
                            wanted={s.wanted} dim={wantedMode && !s.collected}
                          />
                          {s.collected && !mainOn(c) && (
                            <span className="other-form" title={t.otherFormCollected} aria-label={t.otherFormCollected} role="img">
                              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                <circle cx="12" cy="12" r="9.5" />
                                <path d="M7.5 12.5l3 3 6-6.5" />
                              </svg>
                            </span>
                          )}
                          {c.slots.map((sl) => {
                            const props = {
                              label: sl.label, on: slotOn(sl), onClick: () => tapSlot(c, sl),
                              wanted: slotWanted(sl), dim: wantedMode && (!slotOn(sl) || !canWant(sl.dex)),
                            };
                            return (
                              <span key={sl.dex} className="star-pair">
                                {sl.icon === "star" || sl.icon === "star3"
                                  ? <StarButton kind={sl.icon} {...props} />
                                  : <BadgeButton kind={sl.icon} {...props} />}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </div>
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
            {targets.map((tg) => {
              const n = bulkCards(bulk.action, tg).length;
              const icon = tg === "regular" ? (hasPeers ? DEX_ICON[dexKey] : undefined) : slotDefs.find((d) => d.dex === tg)?.icon;
              return (
                <label key={tg} className="check">
                  <input type="checkbox" checked={bulk.targets.has(tg)} disabled={n === 0} onChange={() => pickTarget(tg)} />
                  {icon && <SlotIconView icon={icon} size={18} />}
                  <span>{label(tg)}</span>
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
