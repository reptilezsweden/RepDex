"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { imageUrls } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";

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

type TickState = { collected: boolean; wanted: boolean };
type Show = "all" | "missing" | "collected";

export function DexGrid({
  dexKey, title, cards, gens, initialTicks, userId, canSwitchForms, allForms, t,
}: {
  dexKey: string;
  title: string;
  cards: Card[];
  gens: { gen_nr: number; region: string }[];
  initialTicks: ({ pokemon_id: string } & TickState)[];
  userId: string;
  canSwitchForms: boolean;
  allForms: boolean;
  t: Dict;
}) {
  const [ticks, setTicks] = useState(() => new Map(initialTicks.map((x) => [x.pokemon_id, { collected: x.collected, wanted: x.wanted }])));
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<string>("");
  const [show, setShow] = useState<Show>("all");
  const [error, setError] = useState<string | null>(null);

  const cardState = (c: Card) => {
    const collected = c.rows.some((r) => ticks.get(r)?.collected);
    const wanted = c.rows.some((r) => ticks.get(r)?.wanted);
    return { collected, wanted };
  };

  const available = cards.filter((c) => c.status === "available");
  const done = available.filter((c) => cardState(c).collected).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && String(c.no) !== q) return false;
      if (gen && String(c.gen) !== gen) return false;
      if (show !== "all") {
        if (c.status !== "available") return false;
        const s = cardState(c);
        const isMissing = !s.collected || s.wanted;
        if (show === "missing" && !isMissing) return false;
        if (show === "collected" && !s.collected) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, query, gen, show, ticks]);

  async function save(changes: Map<string, TickState | null>) {
    const before = new Map(ticks);
    setTicks((prev) => {
      const next = new Map(prev);
      for (const [id, v] of changes) v ? next.set(id, v) : next.delete(id);
      return next;
    });
    const supabase = createClient();
    const upserts = [...changes].filter(([, v]) => v).map(([id, v]) => ({ user_id: userId, pokemon_id: id, dex: dexKey, ...v! }));
    const deletes = [...changes].filter(([, v]) => !v).map(([id]) => id);
    const results = await Promise.all([
      upserts.length ? supabase.from("ticks").upsert(upserts) : null,
      deletes.length ? supabase.from("ticks").delete().eq("dex", dexKey).in("pokemon_id", deletes) : null,
    ]);
    if (results.some((r) => r?.error)) {
      setTicks(before);
      setError(t.errorGeneric);
    } else setError(null);
  }

  function toggleCollected(c: Card) {
    if (c.status !== "available" || c.rows.length === 0) return;
    const { collected } = cardState(c);
    const changes = new Map<string, TickState | null>();
    if (collected) for (const r of c.rows) { if (ticks.has(r)) changes.set(r, null); }
    else changes.set(c.rows[0], { collected: true, wanted: false });
    void save(changes);
  }

  function toggleWanted(c: Card) {
    const { wanted } = cardState(c);
    const changes = new Map<string, TickState | null>();
    const ticked = c.rows.filter((r) => ticks.get(r)?.collected);
    if (wanted) for (const r of ticked) changes.set(r, { collected: true, wanted: false });
    else changes.set(ticked[0], { collected: true, wanted: true });
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
          {gens.map((g) => <option key={g.gen_nr} value={String(g.gen_nr)}>{g.gen_nr} · {g.region}</option>)}
        </select>
        <span className="seg" role="group" aria-label={t.show}>
          {(["all", "missing", "collected"] as Show[]).map((s) => (
            <button key={s} aria-pressed={show === s} onClick={() => setShow(s)}>
              {{ all: t.showAll, missing: t.showMissing, collected: t.showCollected }[s]}
            </button>
          ))}
        </span>
      </div>

      {error && <p className="msg error" role="alert">{error}</p>}

      {visible.length === 0 ? (
        <p className="empty">{t.noResults}</p>
      ) : (
        <div className="grid">
          {visible.map((c) => {
            const s = cardState(c);
            const cls = ["mon", c.status !== "available" ? c.status : s.collected ? "collected" : ""].join(" ");
            return (
              <div
                key={c.id}
                className={cls}
                role="button"
                tabIndex={c.status === "available" ? 0 : -1}
                aria-pressed={s.collected}
                aria-label={c.name}
                onClick={() => toggleCollected(c)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollected(c); } }}
              >
                {s.collected && c.status === "available" && (
                  <button
                    className="want"
                    aria-pressed={s.wanted}
                    aria-label={t.wanted}
                    title={t.wanted}
                    onClick={(e) => { e.stopPropagation(); toggleWanted(c); }}
                  >{s.wanted ? "★" : "☆"}</button>
                )}
                <MonImage file={c.image} />
                <span className="no">#{String(c.no).padStart(4, "0")}</span>
                <span className="nm">{c.name}</span>
                {c.status === "upcoming" && <span className="tag">{t.upcoming} {c.date}</span>}
                {c.status === "unreleased" && <span className="tag">{t.unreleased}</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function MonImage({ file }: { file: string | null }) {
  const urls = imageUrls(file);
  const [i, setI] = useState(0);
  if (i >= urls.length) return <span style={{ width: 72, height: 72, display: "grid", placeItems: "center", fontSize: 28, opacity: 0.3 }}>?</span>;
  return <img src={urls[i]} alt="" width={72} height={72} loading="lazy" decoding="async" onError={() => setI(i + 1)} />;
}
