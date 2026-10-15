// Reads Pokémon GO Wiki "…by release date" pages (wikitext) into dated entries.
// Pages are split into level-2 date headings ("==July {{Nth|22}}, 2019==", or without the year on
// the yearly form pages), with tabs ("Regular (4) =", "Shiny (4) =") holding Pokémon templates:
// {{P|Name|…}} regular, {{PS|Name|…}} shiny, {{PC|Name|costume|s=t}} costumes.

export interface Entry {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  /** form= value, if any. */
  form: string;
  /** ci= value (image name), often holding the form, e.g. "Kyurem black". */
  ci: string;
  /** Costume code from {{PC|Name|code}}. */
  code: string;
  shiny: boolean;
  mega: boolean;
  gigantamax: boolean;
  raw: string;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export function parseHeading(text: string, defaultYear?: number): string | null {
  const t = text.replace(/\{\{\s*Nth\s*\|\s*(\d+)\s*\}\}/gi, "$1").replace(/<[^>]+>/g, "").trim();
  const m = t.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const year = m[3] ? Number(m[3]) : defaultYear;
  const day = Number(m[2]);
  if (!month || !year || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parsePage(wikitext: string, defaultYear?: number): Entry[] {
  const out: Entry[] = [];
  let date: string | null = null;
  let tab = "regular";
  for (const line of wikitext.split("\n")) {
    const h = line.match(/^==([^=].*?[^=])==\s*$/);
    if (h) {
      date = parseHeading(h[1], defaultYear);
      tab = "regular";
      continue;
    }
    if (/^===/.test(line)) continue;
    if (!date) continue;
    // Tab labels inside <tabber>: "Regular (4)=", "Shiny (4) =", "Pokédex switch=".
    const tabLabel = line.match(/^\s*(?:\|-\|\s*)?([^{}<|=]+?)\s*=\s*$/);
    if (tabLabel) {
      const l = tabLabel[1].toLowerCase();
      tab = l.includes("switch") ? "skip" : l.includes("shiny") ? "shiny" : "regular";
      continue;
    }
    if (tab === "skip") continue;
    for (const m of line.matchAll(/\{\{(PS|PC|P)\|([^{}]*)\}\}/g)) {
      const positional: string[] = [];
      const named: Record<string, string> = {};
      for (const part of m[2].split("|")) {
        const kv = part.match(/^\s*([A-Za-z]+)\s*=(.*)$/);
        if (kv) named[kv[1].toLowerCase()] = kv[2].trim();
        else positional.push(part.trim());
      }
      const name = positional[0];
      if (!name) continue;
      const tpl = m[1];
      out.push({
        date,
        name,
        form: named.form ?? "",
        ci: named.ci ?? "",
        code: tpl === "PC" ? (positional[1] ?? "") : "",
        shiny: tpl === "PS" || named.s === "t" || tab === "shiny",
        mega: named.mega === "t",
        gigantamax: named.gigantamax === "t",
        raw: m[0],
      });
    }
  }
  return out;
}
