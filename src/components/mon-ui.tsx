"use client";

import { useState } from "react";
import { DEX_ICON, type BadgeIconKind } from "@/lib/dex-icons";
import { imageUrls } from "@/lib/images";

export { DEX_ICON, type BadgeIconKind };

const PUZZLE =
  "M10 3.5a2 2 0 0 1 4 0V5h4a1 1 0 0 1 1 1v4h-1.5a2 2 0 1 0 0 4H19v4a1 1 0 0 1-1 1h-4v-1.5a2 2 0 1 0-4 0V19H6a1 1 0 0 1-1-1v-4h1.5a2 2 0 1 0 0-4H5V6a1 1 0 0 1 1-1h4V3.5z";

/** Small puzzle piece in the corner of an icon that is marked as wanted. */
export function WantedMark() {
  return (
    <span className="wanted-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="12" height="12"><path d={PUZZLE} /></svg>
    </span>
  );
}

/** Extra props shared by the tick buttons: wanted corner mark, and dimmed (not usable in wanted mode). */
type Extra = { wanted?: boolean; dim?: boolean };

/** Checkmark that ticks an entry off. */
export function CheckButton({ on, label, onClick, wanted, dim }: { on: boolean; label: string; onClick: () => void } & Extra) {
  return (
    <button type="button" className={`tick${dim ? " dim" : ""}`} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M7.5 12.5l3 3 6-6.5" />
      </svg>
      {wanted && <WantedMark />}
    </button>
  );
}

/** Puzzle piece marking a collected entry as wanted: outline when off, filled when on. */
export function WantedButton({ on, label, onClick, inline }: { on: boolean; label: string; onClick: () => void; inline?: boolean }) {
  return (
    <button type="button" className={inline ? "want inline" : "want"} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d={PUZZLE} />
      </svg>
    </button>
  );
}

const STAR = "M12 2.6l2.85 5.95 6.55.85-4.8 4.55 1.25 6.5L12 17.3l-5.85 3.15 1.25-6.5-4.8-4.55 6.55-.85z";

/** Shiny toggles: one star for shiny, three grouped stars for Shiny ⭐⭐⭐. Outline when off, yellow when on. */
export function StarIcon({ kind, size = 22 }: { kind: "star" | "star3"; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="star-icon">
      {kind === "star" ? (
        <path d={STAR} />
      ) : (
        <>
          <path d={STAR} transform="translate(6.6 0.4) scale(0.45)" />
          <path d={STAR} transform="translate(0.8 11.2) scale(0.45)" />
          <path d={STAR} transform="translate(12.4 11.2) scale(0.45)" />
        </>
      )}
    </svg>
  );
}

export function StarButton({ kind, on, label, onClick, wanted, dim }: { kind: "star" | "star3"; on: boolean; label: string; onClick: () => void } & Extra) {
  return (
    <button type="button" className={`star ${kind}${dim ? " dim" : ""}`} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <StarIcon kind={kind} />
      {wanted && <WantedMark />}
    </button>
  );
}



const FLAME =
  "M12 22C7.6 22 5 19 5.2 15.4C5.4 12.4 7.4 10.6 8.2 8C8.6 9.6 8.4 10.8 7.8 12C9.6 10.8 10.2 8.6 10 6.4C9.9 4.8 10.6 3.2 12.2 2C11.6 4.6 13 6.6 14.6 8.6C15.4 9.6 15.8 10.8 15.6 12C16.2 11.2 16.4 10.2 16.2 9.2C18 11 19 13.2 18.8 15.6C18.6 19.4 15.8 22 12 22Z";
const FLICKS = "M6.2 5.4C4.6 6.6 4 8.6 4.6 10.4C5 9 5.8 8 6.8 7.4C6.2 6.8 6 6.1 6.2 5.4ZM19.6 18.4C18.7 19.4 18.2 20.7 18.4 22C19.7 21.4 20.5 20.3 20.7 19.1Z";
/** Purified burst: eight rays, alternating long and short. */
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const [r1, r2] = i % 2 ? [3.4, 8] : [3, 10.4];
  const f = (n: number) => n.toFixed(2);
  return { x1: f(12 + r1 * Math.sin(a)), y1: f(12 - r1 * Math.cos(a)), x2: f(12 + r2 * Math.sin(a)), y2: f(12 - r2 * Math.cos(a)) };
});

const Flame = () => (
  <g className="flame"><path className="body" d={FLAME} /><path className="flick" d={FLICKS} /></g>
);
const Burst = () => (
  <g className="burst">{RAYS.map((r, i) => <line key={i} {...r} />)}</g>
);

/** Icons for the extra dexes: Lucky, XXL, XXS, 100%, Shadow, Purified, and the shiny Shadow/Purified combos. */
export function BadgeIcon({ kind, size = 22 }: { kind: BadgeIconKind; size?: number }) {
  if (kind === "perfect") {
    // A hand-drawn "100" with two underlines, as strokes so it can turn grey when not ticked.
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="hundred">
        <path d="M5.4 7.6L7.5 6.1L5.5 16.3" />
        <ellipse cx="11.1" cy="11.2" rx="2.3" ry="4.9" transform="rotate(12 11.1 11.2)" />
        <ellipse cx="17.3" cy="11.2" rx="2.3" ry="4.9" transform="rotate(12 17.3 11.2)" />
        <path d="M3.8 19C9 18.3 15 18.1 20.6 18.5" />
        <path d="M5.2 21.4C10 20.9 14.5 20.8 18.8 21.1" />
      </svg>
    );
  }
  if (kind === "xxl" || kind === "xxs") {
    return <span className={`text-badge ${kind}`} aria-hidden="true">{kind.toUpperCase()}</span>;
  }
  if (kind === "lucky") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="clover">
        <circle cx="12" cy="7.4" r="3.6" /><circle cx="16.6" cy="12" r="3.6" />
        <circle cx="12" cy="16.6" r="3.6" /><circle cx="7.4" cy="12" r="3.6" />
        <path d="M12 12c1.5 3.5 3 6.5 6 9" className="stem" />
      </svg>
    );
  }
  if (kind === "dynamax" || kind === "gigantamax") {
    // The kanji 大 ("big"), drawn as extra-bold strokes: black for Dynamax, pink for Gigantamax.
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={`dai ${kind}`}>
        <path d="M3.6 9.4H20.4" />
        <path d="M12 2.6V9.4C11.7 14.6 9 18.6 3.8 21.4" />
        <path d="M12.6 10.8C14 15.2 16.6 18.7 20.6 21" />
      </svg>
    );
  }
  if (kind === "mega") {
    // A rainbow DNA strand: two twisting strands joined by rungs.
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="dna">
        <defs>
          <linearGradient id="dna-rainbow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff4d4d" /><stop offset="0.2" stopColor="#ff9f2e" />
            <stop offset="0.4" stopColor="#f4d03a" /><stop offset="0.6" stopColor="#3cc46b" />
            <stop offset="0.8" stopColor="#3e8bff" /><stop offset="1" stopColor="#9b5cff" />
          </linearGradient>
        </defs>
        <g transform="translate(12 12) rotate(28) scale(1.05) translate(-12 -12)">
          <path className="rung" d="M8.2 4.2H15.8M7.4 12H16.6M8.2 19.8H15.8" />
          <path className="strand" d="M7 1.5C7 6 17 7.5 17 12S7 18 7 22.5" />
          <path className="strand" d="M17 1.5C17 6 7 7.5 7 12S17 18 17 22.5" />
        </g>
      </svg>
    );
  }
  const base = kind === "shadow" || kind === "shadow_shiny" ? <Flame /> : <Burst />;
  if (kind === "shadow" || kind === "purified") {
    return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="dex-art">{base}</svg>;
  }
  // Shiny Shadow / shiny Purified: the dex icon with a small star in the corner.
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="dex-art">
      <g transform="translate(0 3) scale(0.82)">{base}</g>
      <g className="mini-star" transform="translate(13.2 0) scale(0.45)"><path d={STAR} /></g>
    </svg>
  );
}

/** The tick for an entry in a dex: the dex's own icon, or the checkmark. */
export function DexTick({ dex, ...props }: { dex: string; on: boolean; label: string; onClick: () => void } & Extra) {
  const kind = DEX_ICON[dex];
  return kind ? <BadgeButton kind={kind} {...props} /> : <CheckButton {...props} />;
}

export function BadgeButton({ kind, on, label, onClick, wanted, dim }: { kind: BadgeIconKind; on: boolean; label: string; onClick: () => void } & Extra) {
  return (
    <button type="button" className={`badge ${kind}${dim ? " dim" : ""}`} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <BadgeIcon kind={kind} />
      {wanted && <WantedMark />}
    </button>
  );
}

/** The puzzle icon on its own, for legends. */
export function PuzzleIcon({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="puzzle-icon"><path d={PUZZLE} /></svg>;
}

function Img({ file, size, onMissing }: { file: string | null; size: number; onMissing?: () => void }) {
  const urls = imageUrls(file);
  const [i, setI] = useState(0);
  if (i >= urls.length) {
    return <span className="noimg" style={{ width: size, height: size }} aria-hidden="true">?</span>;
  }
  const next = () => {
    if (i + 1 >= urls.length) onMissing?.();
    setI(i + 1);
  };
  return <img src={urls[i]} alt="" width={size} height={size} loading="lazy" decoding="async" onError={next} />;
}

export function MonImage({ file, size = 72 }: { file: string | null; size?: number }) {
  return <Img file={file} size={size} />;
}

/** Dex card image: regular, swapping to shiny while the pointer hovers (desktop). No swap when the shiny image is missing. */
export function HoverShiny({ regular, shiny, size = 72 }: { regular: string | null; shiny: string | null; size?: number }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className="hover-shiny" style={{ width: size, height: size }}>
      <span className="reg"><Img file={regular} size={size} /></span>
      {shiny && !missing && <span className="shy"><Img file={shiny} size={size} onMissing={() => setMissing(true)} /></span>}
    </span>
  );
}

/** Regular image that shows the shiny one on hover (desktop) or click (any device). No swap when the shiny image is missing. */
export function ShinySwap({ regular, shiny, size = 96, label }: { regular: string | null; shiny: string | null; size?: number; label: string }) {
  const [pinned, setPinned] = useState(false);
  const [missing, setMissing] = useState(false);
  const hasShiny = !!shiny && !missing;
  if (!hasShiny) {
    return (
      <span className="swap" style={{ width: size, height: size }}>
        <span className="reg"><Img file={regular} size={size} /></span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`swap${pinned ? " pinned" : ""}`}
      onClick={() => setPinned((p) => !p)}
      aria-pressed={pinned}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
    >
      <span className="reg"><Img file={regular} size={size} /></span>
      <span className="shy"><Img file={shiny} size={size} onMissing={() => setMissing(true)} /></span>
    </button>
  );
}
