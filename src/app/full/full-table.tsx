"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BadgeIcon, MonImage, StarIcon, WantedMark, type BadgeIconKind } from "@/components/mon-ui";
import type { Dict } from "@/lib/i18n";

export interface Column {
  key: string;
  name: string;
  icon: "check" | "star" | "star3" | BadgeIconKind;
  /** Every form counts separately (Mega, Gigantamax, Dynamax, Costume/Event): the cell shows a count. */
  counts: boolean;
}

/** One species. Each cell is [collected, total, wanted (0/1)], or null when the dex has nothing released for it. */
export interface Row {
  no: number;
  name: string;
  image: string | null;
  gen: number;
  cells: ([number, number, number] | null)[];
}

type Show = "all" | "missing" | "collected";

function ColumnIcon({ icon }: { icon: Column["icon"] }) {
  if (icon === "check") {
    return (
      <span className="tick legend-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
      </span>
    );
  }
  if (icon === "star" || icon === "star3") return <StarIcon kind={icon} size={18} />;
  return <span className="badge slot-icon"><BadgeIcon kind={icon} size={18} /></span>;
}

const missingCell = (c: Row["cells"][number]) => !!c && (c[0] < c[1] || c[2] === 1);

export function FullTable({ title, columns: allColumns, rows: allRows, gens, userId, initialHidden, initialShow, t }: {
  title: string;
  columns: Column[];
  rows: Row[];
  gens: { gen_nr: number; region: string }[];
  userId: string;
  /** Dex columns the user hid earlier (saved on the profile). */
  initialHidden: string[];
  /** All / Missing / Collected, shared with the dex pages. */
  initialShow: Show;
  t: Dict;
}) {
  // Columns can be hidden from the dex menu; the choice is saved on the profile.
  const [hidden, setHidden] = useState(() => new Set(initialHidden));
  const [saveFailed, setSaveFailed] = useState(false);
  function toggleColumn(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
    void createClient().from("profiles").update({ full_hidden: [...next] }).eq("id", userId)
      .then(({ error }: { error: unknown }) => setSaveFailed(!!error));
  }
  const shownIdx = allColumns.map((c, i) => (hidden.has(c.key) ? -1 : i)).filter((i) => i >= 0);
  const columns = shownIdx.map((i) => allColumns[i]);
  const rows = useMemo(
    () => allRows.map((r) => ({ ...r, cells: shownIdx.map((i) => r.cells[i]) })).filter((r) => r.cells.some((c) => c !== null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows, hidden],
  );

  const [query, setQuery] = useState("");
  const [gen, setGen] = useState("");
  const [show, setShowState] = useState<Show>(initialShow);
  const setShow = (v: Show) => {
    setShowState(v);
    void createClient().from("profiles").update({ show_filter: v }).eq("id", userId);
  };

  // Totals per column: species complete in that dex / species it has.
  const totals = columns.map((_, i) => {
    const cells = rows.map((r) => r.cells[i]).filter((c): c is [number, number, number] => !!c);
    return { done: cells.filter((c) => c[0] >= c[1]).length, total: cells.length };
  });
  const allCells = rows.flatMap((r) => r.cells.filter((c): c is [number, number, number] => !!c));
  const doneCells = allCells.filter((c) => c[0] >= c[1]).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && String(r.no) !== q) return false;
      if (gen && String(r.gen) !== gen) return false;
      if (show === "missing") return r.cells.some(missingCell);
      if (show === "collected") return r.cells.every((c) => !c || c[0] >= c[1]);
      return true;
    });
  }, [rows, query, gen, show]);

  const groups = gens
    .map((g) => ({ ...g, rows: visible.filter((r) => r.gen === g.gen_nr) }))
    .filter((g) => g.rows.length > 0);

  return (
    <>
      <div className="dex-head">
        <h1>{title}</h1>
        <span className="count">{doneCells} / {allCells.length}</span>
      </div>
      <div className="filters full-filters">
        <input type="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.search} />
        <select value={gen} onChange={(e) => setGen(e.target.value)} aria-label={t.allGens}>
          <option value="">{t.allGens}</option>
          {gens.map((g) => <option key={g.gen_nr} value={String(g.gen_nr)}>{g.region}</option>)}
        </select>
        <details className="col-picker">
          <summary>{t.dexes} ({columns.length}/{allColumns.length}) ▾</summary>
          <div className="col-list">
            {allColumns.map((c) => (
              <label key={c.key} className="check">
                <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleColumn(c.key)} />
                <ColumnIcon icon={c.icon} /> {c.name}
              </label>
            ))}
          </div>
        </details>
        <span className="seg" role="group" aria-label={t.show}>
          {(["all", "missing", "collected"] as Show[]).map((s) => (
            <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)}>
              {{ all: t.showAll, missing: t.showMissing, collected: t.showCollected }[s]}
            </button>
          ))}
        </span>
      </div>
      <p className="note">{t.fullCollectionHelp}</p>
      {saveFailed && <p className="msg error" role="alert">{t.fullColumnsNotSaved}</p>}

      {groups.length === 0 ? (
        <p className="empty">{t.noResults}</p>
      ) : (
        <div className={`full-wrap${show === "missing" ? " only-missing" : ""}`}>
          <table className="full-table">
            <thead>
              <tr>
                <th className="mon-col">#</th>
                {columns.map((c, i) => (
                  <th key={c.key} title={c.name}>
                    <ColumnIcon icon={c.icon} />
                    <span className="col-name">{c.name}</span>
                    <span className="col-count">{totals[i].done}/{totals[i].total}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.gen_nr}>
                <tr className="full-gen"><th colSpan={columns.length + 1}><span>{g.region}</span></th></tr>
                {g.rows.map((r) => (
                  <tr key={r.no}>
                    <th className="mon-col">
                      <Link href={`/pokemon/${r.no}?dex=full`}>
                        <MonImage file={r.image} size={28} />
                        <span className="no">#{String(r.no).padStart(4, "0")}</span>
                        <span className="nm">{r.name}</span>
                      </Link>
                    </th>
                    {r.cells.map((c, i) => {
                      if (!c) return <td key={i} className="na" />;
                      const complete = c[0] >= c[1];
                      const label = `${columns[i].name}: ${c[0]}/${c[1]}`;
                      return (
                        <td key={i} className={`${complete ? "done" : "miss"}${c[2] ? " wanted-cell" : ""}`} title={label} aria-label={label}>
                          <span className="cell">
                            {columns[i].counts && c[1] > 1 ? <span className="cnt">{c[0]}/{c[1]}</span> : <span className="dot" />}
                            {c[2] === 1 && <WantedMark />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </>
  );
}
