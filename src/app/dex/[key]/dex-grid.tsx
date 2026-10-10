"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmSlider } from "@/components/confirm-slider";
import { CheckButton, MonImage, WantedButton } from "@/components/mon-ui";
import type { Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useTicks, type TickChanges, type TickState } from "@/lib/use-ticks";

export interface Card {
  id: string;
  no: number;
  name: string;
  gen: number;
  image: string | null;
  status: Status;
  date: string | null;
  rows: string[];
}

type Show = "all" | "missing" | "collected";
type Bulk = "check" | "uncheck" | null;

export function DexGrid({
  dexKey, title, cards, gens, initialTicks, userId, initialShowUnavailable, canSwitchForms, allForms, t,
}: {
  dexKey: string;
  title: string;
  cards: Card[];
  gens: { gen_nr: number; region: string }[];
  initialTicks: ({ pokemon_id: string } & TickState)[];
  userId: string;
  initialShowUnavailable: boolean;
  canSwitchForms: boolean;
  allForms: boolean;
  t: Dict;
}) {
  const { ticks, save, error } = useTicks(dexKey, userId, initialTicks);
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<string>("");
  const [show, setShow] = useState<Show>("all");
  const [bulk, setBulk] = useState<Bulk>(null);
  const [showUnavailable, setShowUnavailable] = useState(initialShowUnavailable);

  function toggleUnavailable() {
    const next = !showUnavailable;
    setShowUnavailable(next);
    // Saved on the profile, so every dex page and device uses the same choice.
    void createClient().from("profiles").update({ show_unavailable: next }).eq("id", userId);
  }

  const stateOf = (c: Card) => ({
    collected: c.rows.some((r) => ticks.get(r)?.collected),
    wanted: c.rows.some((r) => ticks.get(r)?.wanted),
  });

  const available = cards.filter((c) => c.status === "available");
  const done = available.filter((c) => stateOf(c).collected).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && String(c.no) !== q) return false;
      if (gen && String(c.gen) !== gen) return false;
      if (!showUnavailable && c.status !== "available") return false;
      if (show !== "all") {
        if (c.status !== "available") return false;
        const s = stateOf(c);
        if (show === "missing" && !(!s.collected || s.wanted)) return false;
        if (show === "collected" && !s.collected) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, query, gen, show, ticks, showUnavailable]);

  const groups = useMemo(() => {
    const byGen = new Map<number, Card[]>();
    for (const c of visible) {
      const list = byGen.get(c.gen) ?? [];
      list.push(c);
      byGen.set(c.gen, list);
    }
    return gens.filter((g) => byGen.has(g.gen_nr)).map((g) => ({ ...g, cards: byGen.get(g.gen_nr)! }));
  }, [visible, gens]);

  const toCheck = visible.filter((c) => c.status === "available" && c.rows.length > 0 && !stateOf(c).collected);
  const toUncheck = visible.filter((c) => c.rows.some((r) => ticks.has(r)));

  function toggleCollected(c: Card) {
    if (c.status !== "available" || c.rows.length === 0) return;
    const changes: TickChanges = new Map();
    if (stateOf(c).collected) for (const r of c.rows) { if (ticks.has(r)) changes.set(r, null); }
    else changes.set(c.rows[0], { collected: true, wanted: false });
    void save(changes);
  }

  function toggleWanted(c: Card) {
    const ticked = c.rows.filter((r) => ticks.get(r)?.collected);
    if (ticked.length === 0) return;
    const changes: TickChanges = new Map();
    if (stateOf(c).wanted) for (const r of ticked) changes.set(r, { collected: true, wanted: false });
    else changes.set(ticked[0], { collected: true, wanted: true });
    void save(changes);
  }

  function runBulk() {
    const changes: TickChanges = new Map();
    if (bulk === "check") for (const c of toCheck) changes.set(c.rows[0], { collected: true, wanted: false });
    if (bulk === "uncheck") for (const c of toUncheck) for (const r of c.rows) { if (ticks.has(r)) changes.set(r, null); }
    setBulk(null);
    void save(changes);
  }

  return (
    <>
      <div className="dex-head">
        <h1>{title}</h1>
        <span className="count">{done} / {available.length}</span>
        {canSwitchForms && (
          <span className="seg" style={{ marginLeft: "auto" }}>
            <Link href={`/dex/${dexKey}`} aria-current={!allForms ? "page" : undefined}>{t.inGame}</Link>
            <Link href={`/dex/${dexKey}?forms=all`} aria-current={allForms ? "page" : undefined}>{t.allForms}</Link>
          </span>
        )}
      </div>

      <div className="filters">
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
        <button type="button" role="switch" aria-checked={showUnavailable} className="switch" onClick={toggleUnavailable}>
          <span className="track" aria-hidden="true"><span className="knob" /></span>
          {t.showUnavailable}
        </button>
        <span className="bulk">
          <button type="button" className="btn ghost" disabled={toCheck.length === 0} onClick={() => setBulk("check")}>{t.checkAll}</button>
          <button type="button" className="btn ghost" disabled={toUncheck.length === 0} onClick={() => setBulk("uncheck")}>{t.uncheckAll}</button>
        </span>
      </div>

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
                      <CheckButton on={s.collected} label={t.collect} onClick={() => toggleCollected(c)} />
                    )}
                    {s.collected && c.status === "available" && (
                      <WantedButton on={s.wanted} label={t.wanted} onClick={() => toggleWanted(c)} />
                    )}
                    <Link href={`/pokemon/${c.no}?dex=${dexKey}`} className="mon-link">
                      <span className="pic"><MonImage file={c.image} /></span>
                      <span className="no">#{String(c.no).padStart(4, "0")}</span>
                      <span className="nm">{c.name}</span>
                      {c.status === "upcoming" && <span className="tag">{t.upcoming} {c.date}</span>}
                      {c.status === "unreleased" && <span className="tag">{t.unreleased}</span>}
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {bulk && (
        <ConfirmSlider
          title={bulk === "check" ? t.checkAll : t.uncheckAll}
          text={(bulk === "check" ? t.checkAllText : t.uncheckAllText).replace("{n}", String(bulk === "check" ? toCheck.length : toUncheck.length))}
          slideLabel={t.slideToConfirm}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          onConfirm={runBulk}
          onCancel={() => setBulk(null)}
        />
      )}
    </>
  );
}
