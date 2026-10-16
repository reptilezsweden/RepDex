// Reads Leek Duck's event list (https://leekduck.com/events/) and event pages.

export interface ListedEvent {
  id: string;
  slug: string;
  name: string;
  type: string;
  url: string;
  image: string | null;
  start: string | null;
  end: string | null;
  localTime: boolean;
}

export interface EventPokemon {
  category: string;
  name: string;
  image: string | null;
  shiny: boolean;
  /** Explicitly Shadow: "Shadow" in its name or its section/sub-section heading. */
  shadow: boolean;
  sort: number;
}

const ENTITIES: Record<string, string> = {
  amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "’", lsquo: "‘", ndash: "–", mdash: "—", eacute: "é",
};

export function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

const attrs = (s: string) => Object.fromEntries([...s.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

/** Events on the list page. Each event shows up once for its start and once for its end; both are merged. */
export function parseList(html: string, base = "https://leekduck.com"): ListedEvent[] {
  const out = new Map<string, ListedEvent>();
  const re = /<span class="event-header-item-wrapper"([^>]*)>\s*<a class="event-item-link[^"]*" href="([^"]+)">([\s\S]*?)<\/h2>/g;
  for (const m of html.matchAll(re)) {
    const a = attrs(m[1]);
    const id = a["event-occurrence-id"];
    if (!id) continue;
    const href = m[2];
    const slug = href.replace(/^\/events\//, "").replace(/\/$/, "");
    const name = text(m[3].replace(/^[\s\S]*<h2>/, ""));
    const img = m[3].match(/<img[^>]*src="([^"]+)"/)?.[1] ?? null;
    const prev = out.get(id);
    const ev: ListedEvent = prev ?? {
      id, slug, name, type: a["event-type"] ?? "", url: base + href, image: img,
      start: null, end: null, localTime: a["event-local-time"] !== "false",
    };
    ev.start ??= a["event-start-date"] ?? a["event-start-date-check"] ?? null;
    ev.end ??= a["event-end-date"] ?? null;
    out.set(id, ev);
  }
  return [...out.values()];
}

/** Sections whose Pokémon are repeated elsewhere on the page. */
const SKIP = /debut/i;

/** Pokémon listed on an event page, with the section (and sub-section) they're listed under. */
export function parseEvent(html: string): EventPokemon[] {
  const out = new Map<string, EventPokemon>();
  let section = "";
  let sub = "";
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>|<h3\b[^>]*>([\s\S]*?)<\/h3>|<li class="pkmn-list-item"[^>]*>([\s\S]*?)<\/li>/g;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) { section = text(m[1]); sub = ""; continue; }
    if (m[2] !== undefined) { sub = text(m[2]); continue; }
    if (SKIP.test(section) || SKIP.test(sub)) continue;
    const li = m[3];
    const img = li.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? null;
    const alt = li.match(/<img[^>]*alt="([^"]*)"/)?.[1] ?? "";
    const name = text(li.match(/<div class="pkmn-name">([\s\S]*?)<\/div>/)?.[1] ?? "") || text(alt);
    if (!name || /^shiny$/i.test(name)) continue;
    const egg = li.match(/\begg(\d+)km\b/)?.[1];
    const category = egg ? `Egg ${egg} km` : sub ? `${section} – ${sub}` : section || "Featured";
    const shiny = /pokemon-cutout-shiny|shiny-icon|_shiny\.png/.test(li) || /^shiny/i.test(section);
    const key = `${category}|${name}`;
    const prev = out.get(key);
    if (prev) { prev.shiny ||= shiny; continue; }
    const shadow = /\bshadow\b/i.test(name) || /\bshadow\b/i.test(section) || /\bshadow\b/i.test(sub);
    out.set(key, { category, name, image: img, shiny, shadow, sort: out.size });
  }
  return [...out.values()];
}

export interface RaidBoss {
  name: string;
  image: string | null;
  /** Raid level as Leek Duck labels it: "1", "3", "5", "Mega", … */
  level: string;
  shadow: boolean;
  shiny: boolean;
  sort: number;
}

/**
 * Current raid bosses on https://leekduck.com/raid-bosses/: the ongoing regular and Shadow raid rotations.
 * Each tier heading carries data-tier; Shadow bosses sit after the "shadow-raid-bosses" marker and their cards
 * are "card -shadow". A shiny icon on a card means that boss (the Shadow one, for Shadow cards) can be shiny.
 */
export function parseRaids(html: string): RaidBoss[] {
  const shadowAt = html.indexOf('class="shadow-raid-bosses"');
  const out: RaidBoss[] = [];
  let level = "";
  const re = /<h2\b[^>]*\bdata-tier="([^"]+)"|<div class="card( -shadow)?">([\s\S]*?)(?=<div class="card|<\/div><\/div><div class="tier"|<h2\b|$)/g;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) { level = text(m[1]); continue; }
    const card = m[3];
    const name = text(card.match(/<p class="name[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "");
    if (!name || !level) continue;
    const shadow = !!m[2] || (shadowAt >= 0 && (m.index ?? 0) > shadowAt);
    out.push({
      name,
      image: card.match(/<div class="boss-img[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/)?.[1] ?? null,
      level,
      shadow,
      shiny: /class="shiny-icon"/.test(card),
      sort: out.length,
    });
  }
  return out;
}
