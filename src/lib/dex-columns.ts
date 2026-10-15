import { DEX_ICON, type BadgeIconKind } from "@/lib/dex-icons";
import { DEXES, type Dex } from "@/lib/dexes";

export type ColumnIcon = "check" | "star" | "star3" | BadgeIconKind;

/** Icon for a dex in menus and headers: the dex's own icon, a star for shiny dexes, else the checkmark. */
export const columnIcon = (d: Dex): ColumnIcon =>
  d.key === "shiny3" ? "star3" : DEX_ICON[d.key] ?? (d.shiny ? "star" : "check");

/** Dexes in page order, each followed by its shiny dexes (Caught, Shiny, Shiny ⭐⭐⭐, Lucky, …). */
export function columnOrder(): Dex[] {
  const out: Dex[] = [];
  const add = (d: Dex) => {
    if (out.includes(d)) return;
    out.push(d);
    for (const s of DEXES.filter((x) => x.shinyOf === d.key)) add(s);
    for (const k of d.peers ?? []) add(DEXES.find((x) => x.key === k)!);
  };
  for (const d of DEXES) if (!d.shinyOf && !d.mergedInto) add(d);
  return out;
}
