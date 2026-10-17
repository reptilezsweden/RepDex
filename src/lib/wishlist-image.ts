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

/** Short labels and colours for the dex marks on combined lists (Caught + Lucky, Shiny + ⭐⭐⭐). */
const MARKS: Record<string, { text: string; bg: string; fg: string }> = {
  caught: { text: "✓", bg: "#2e9e5b", fg: "#fff" },
  lucky: { text: "Lucky", bg: "#f2c94c", fg: "#5a4500" },
  shiny: { text: "★", bg: "#f5c518", fg: "#5a4500" },
  shiny3: { text: "★★★", bg: "#f5c518", fg: "#5a4500" },
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

const FONT = '-apple-system, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';

/** The pictures for a list: one per PER_IMAGE Pokémon. */
export async function wishlistImages(opts: {
  title: string; owner?: string; date: string; search: string; items: WishItem[]; part: (n: number, of: number) => string; searchLabel: string;
}): Promise<Blob[]> {
  const pics = await Promise.all(opts.items.map((i) => loadImage(i.image)));
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

    ctx.fillStyle = "#f6f7f9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = "#1b1f24";
    ctx.font = `700 40px ${FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(opts.title, PAD, 58);
    ctx.font = `400 22px ${FONT}`;
    ctx.fillStyle = "#5f6b7a";
    const sub = [opts.owner, opts.date, pages.length > 1 ? opts.part(n + 1, pages.length) : null, `${opts.items.length}`].filter(Boolean).join(" · ");
    ctx.fillText(sub, PAD, 92);
    ctx.textAlign = "right";
    ctx.font = `700 24px ${FONT}`;
    ctx.fillStyle = "#c0392b";
    ctx.fillText("RepDex", W - PAD, 58);
    ctx.textAlign = "left";

    // Grid
    page.items.forEach((it, i) => {
      const x = PAD + (i % COLS) * CELL_W;
      const y = head + Math.floor(i / COLS) * CELL_H;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#dde1e6";
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
      ctx.fillStyle = "#5f6b7a";
      ctx.fillText(no, cx, y + PIC + 28);
      cx += noW;
      if (sign) {
        ctx.font = `700 16px ${FONT}`;
        ctx.fillStyle = sign === "♂" ? "#2f6fd6" : "#d6408b";
        ctx.fillText(sign, cx + 5, y + PIC + 28);
      }
      // Name, up to two lines.
      ctx.textAlign = "center";
      ctx.fillStyle = "#1b1f24";
      ctx.font = `600 15px ${FONT}`;
      wrap(ctx, it.name, CELL_W - 16, 2).forEach((line, l) => ctx.fillText(line, x + CELL_W / 2, y + PIC + 50 + l * 19));
      ctx.textAlign = "left";
    });

    // Search phrase
    if (phrase.length) {
      const y0 = head + rows * CELL_H + 16;
      ctx.fillStyle = "#5f6b7a";
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(opts.searchLabel, PAD, y0 + 18);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#dde1e6";
      ctx.beginPath();
      ctx.roundRect(PAD, y0 + 30, W - PAD * 2, phrase.length * 28 + 16, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1b1f24";
      ctx.font = `20px ui-monospace, Menlo, Consolas, monospace`;
      phrase.forEach((line, l) => ctx.fillText(line, PAD + 12, y0 + 58 + l * 28));
    }

    blobs.push(await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png")));
  }
  return blobs;
}
