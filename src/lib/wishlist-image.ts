// Wishlist as a picture, drawn in the browser: a title, a grid of the Pokémon (picture, number, name,
// ♂/♀ and which dex it's missing in) and the search phrase at the bottom. Long lists are split into
// several pictures. Client only (uses canvas).
import { imageUrls } from "./images";
import type { WishItem } from "./wishlists";

export const PER_IMAGE = 100;
const COLS = 6;
const W = 1080;
const PAD = 32;
const CELL_W = (W - PAD * 2) / COLS;
const CELL_H = 184;
const PIC = 104;

/** Short labels and colours for the dex marks: which dex each Pokémon is missing in. */
const MARKS: Record<string, { text: string; bg: string; fg: string }> = {
  caught: { text: "✓", bg: "#2e9e5b", fg: "#fff" },
  lucky: { text: "Lucky", bg: "#f2c94c", fg: "#5a4500" },
  shiny: { text: "★", bg: "#f5c518", fg: "#5a4500" },
  shiny3: { text: "★★★", bg: "#f5c518", fg: "#5a4500" },
  xxl: { text: "XXL", bg: "#3b6fd8", fg: "#fff" },
  xxs: { text: "XXS", bg: "#e0742c", fg: "#fff" },
  gigantamax: { text: "G-Max", bg: "#d6336c", fg: "#fff" },
  dynamax: { text: "Dynamax", bg: "#3a3a3a", fg: "#fff" },
  costumes: { text: "Costume", bg: "#2e9e5b", fg: "#fff" },
  costumes_shiny: { text: "Costume ★", bg: "#f5c518", fg: "#5a4500" },
};

function loadImage(file: string | null): Promise<HTMLImageElement | null> {
  const urls = imageUrls(file);
  return new Promise((resolve) => {
    const tryAt = (i: number) => {
      if (i >= urls.length) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous"; // jsDelivr and raw GitHub allow it, so the canvas can be saved
      img.onload = () => resolve(img);
      img.onerror = () => tryAt(i + 1);
      img.src = urls[i];
    };
    tryAt(0);
  });
}

/** Lines of text that fit in a width, at most maxLines (the last one shortened with …). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/(\s+)/).filter((w) => w.trim());
  const lines: string[] = [];
  let line = "";
  const push = (l: string) => lines.push(l);
  for (const w of words.length ? words : [text]) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= width) { line = next; continue; }
    if (line) push(line);
    line = w;
    // A single word wider than the cell (Japanese has no spaces): break it by characters.
    while (ctx.measureText(line).width > width && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--;
      push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

const FONT_FALLBACK = '-apple-system, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
let FONT = FONT_FALLBACK;

/** The site's colours as they are right now (light or dark theme), from its CSS variables. */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--bg", "#f6f5f2"), surface: v("--surface", "#ffffff"), text: v("--text", "#1c1b19"),
    muted: v("--muted", "#6b6862"), line: v("--line", "#e3e0da"), accent: v("--accent", "#2f8f5b"),
  };
}

function loadUrl(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** The pictures for a list: one per PER_IMAGE Pokémon. */
export async function wishlistImages(opts: {
  title: string; owner?: string; date: string; search: string; items: WishItem[]; part: (n: number, of: number) => string; searchLabel: string;
}): Promise<Blob[]> {
  const pics = await Promise.all(opts.items.map((i) => loadImage(i.image)));
  const icon = await loadUrl("/icons/icon-192.png");
  const c = palette();
  FONT = getComputedStyle(document.body).fontFamily || FONT_FALLBACK;
  const pages: { items: WishItem[]; pics: (HTMLImageElement | null)[] }[] = [];
  for (let i = 0; i < opts.items.length; i += PER_IMAGE) {
    pages.push({ items: opts.items.slice(i, i + PER_IMAGE), pics: pics.slice(i, i + PER_IMAGE) });
  }
  if (pages.length === 0) pages.push({ items: [], pics: [] });

  const blobs: Blob[] = [];
  for (let n = 0; n < pages.length; n++) {
    const page = pages[n];
    const rows = Math.max(1, Math.ceil(page.items.length / COLS));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    // Search phrase height depends on its length.
    ctx.font = `20px ui-monospace, Menlo, Consolas, monospace`;
    const phrase = opts.search ? wrap(ctx, opts.search, W - PAD * 2 - 24, 12) : [];
    const head = 110;
    const foot = phrase.length ? 70 + phrase.length * 28 : 40;
    canvas.width = W;
    canvas.height = head + rows * CELL_H + foot;

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = c.text;
    ctx.font = `700 40px ${FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(opts.title, PAD, 58);
    ctx.font = `400 22px ${FONT}`;
    ctx.fillStyle = c.muted;
    const sub = [opts.owner, opts.date, pages.length > 1 ? opts.part(n + 1, pages.length) : null, `${opts.items.length}`].filter(Boolean).join(" · ");
    ctx.fillText(sub, PAD, 92);
    // The site's logo, as in the top bar: icon, then "Rep" in the text colour and "Dex" in the accent colour.
    ctx.font = `700 26px ${FONT}`;
    const repW = ctx.measureText("Rep").width;
    const dexW = ctx.measureText("Dex").width;
    const iconS = 36;
    let bx = W - PAD - dexW - repW - (icon ? iconS + 10 : 0);
    if (icon) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, 58 - 27, iconS, iconS, 8);
      ctx.clip();
      ctx.drawImage(icon, bx, 58 - 27, iconS, iconS);
      ctx.restore();
      bx += iconS + 10;
    }
    ctx.textAlign = "left";
    ctx.fillStyle = c.text;
    ctx.fillText("Rep", bx, 58);
    ctx.fillStyle = c.accent;
    ctx.fillText("Dex", bx + repW, 58);

    // Grid
    page.items.forEach((it, i) => {
      const x = PAD + (i % COLS) * CELL_W;
      const y = head + Math.floor(i / COLS) * CELL_H;
      ctx.fillStyle = c.surface;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, CELL_W - 8, CELL_H - 8, 14);
      ctx.fill();
      ctx.stroke();
      const pic = page.pics[i];
      if (pic) ctx.drawImage(pic, x + (CELL_W - PIC) / 2, y + 8, PIC, PIC);
      ctx.textAlign = "center";
      // Dex marks in the top corner of the box, stacked.
      const marks = (it.dexes ?? []).map((d) => MARKS[d]).filter(Boolean);
      ctx.font = `700 12px ${FONT}`;
      marks.forEach((m, k) => {
        const mw = ctx.measureText(m.text).width + 12;
        const mx = x + CELL_W - 10 - mw;
        const my = y + 10 + k * 22;
        ctx.fillStyle = m.bg;
        ctx.beginPath();
        ctx.roundRect(mx, my, mw, 18, 9);
        ctx.fill();
        ctx.fillStyle = m.fg;
        ctx.textAlign = "left";
        ctx.fillText(m.text, mx + 6, my + 13);
      });
      // Number and gender.
      ctx.textAlign = "left";
      ctx.font = `400 15px ${FONT}`;
      const no = `#${String(it.no).padStart(4, "0")}`;
      const noW = ctx.measureText(no).width;
      const sign = it.gender ?? "";
      ctx.font = `700 16px ${FONT}`;
      const signW = sign ? ctx.measureText(sign).width + 5 : 0;
      let cx = x + (CELL_W - noW - signW) / 2;
      ctx.font = `400 15px ${FONT}`;
      ctx.fillStyle = c.muted;
      ctx.fillText(no, cx, y + PIC + 28);
      cx += noW;
      if (sign) {
        ctx.font = `700 16px ${FONT}`;
        ctx.fillStyle = sign === "♂" ? "#2f6fd6" : "#d6408b";
        ctx.fillText(sign, cx + 5, y + PIC + 28);
      }
      // Name, up to two lines.
      ctx.textAlign = "center";
      ctx.fillStyle = c.text;
      ctx.font = `600 15px ${FONT}`;
      wrap(ctx, it.name, CELL_W - 16, 2).forEach((line, l) => ctx.fillText(line, x + CELL_W / 2, y + PIC + 50 + l * 19));
      ctx.textAlign = "left";
    });

    // Search phrase
    if (phrase.length) {
      const y0 = head + rows * CELL_H + 16;
      ctx.fillStyle = c.muted;
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(opts.searchLabel, PAD, y0 + 18);
      ctx.fillStyle = c.surface;
      ctx.strokeStyle = c.line;
      ctx.beginPath();
      ctx.roundRect(PAD, y0 + 30, W - PAD * 2, phrase.length * 28 + 16, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.font = `20px ui-monospace, Menlo, Consolas, monospace`;
      phrase.forEach((line, l) => ctx.fillText(line, PAD + 12, y0 + 58 + l * 28));
    }

    blobs.push(await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png")));
  }
  return blobs;
}
