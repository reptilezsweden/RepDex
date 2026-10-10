"use client";

import { useState } from "react";
import { imageUrls } from "@/lib/images";

const PUZZLE =
  "M10 3.5a2 2 0 0 1 4 0V5h4a1 1 0 0 1 1 1v4h-1.5a2 2 0 1 0 0 4H19v4a1 1 0 0 1-1 1h-4v-1.5a2 2 0 1 0-4 0V19H6a1 1 0 0 1-1-1v-4h1.5a2 2 0 1 0 0-4H5V6a1 1 0 0 1 1-1h4V3.5z";

/** Checkmark that ticks an entry off. */
export function CheckButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className="tick" aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M7.5 12.5l3 3 6-6.5" />
      </svg>
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
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
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

export function StarButton({ kind, on, label, onClick }: { kind: "star" | "star3"; on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`star ${kind}`} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <StarIcon kind={kind} />
    </button>
  );
}

export type BadgeIconKind = "lucky" | "xxl" | "xxs" | "perfect" | "shadow" | "purified";

const SMOKE =
  "M12 2.5c1.6 2.6-.9 3.7.1 6.2.8 2 3.6 1.6 3.6 4.7 0 3.2-2.6 5.8-5.7 5.8s-5.6-2.6-5.6-5.8c0-2.7 2.1-4 3.3-5.4.4 1.7 1.6 2.4 2.7 2.2C9.4 7.9 11.1 5.7 12 2.5z";
const WISPS = "M16.8 6.5c1.4 1.4 1.1 2.9.2 4.1M6.2 18.7c-1.2.9-2.6.7-3.4-.2M17.6 18.3c1.2.6 2.5.3 3.2-.7";

/** Icons for the extra dexes on regular forms: Lucky, XXL, XXS, Perfect, Shadow, Purified. */
export function BadgeIcon({ kind, size = 22 }: { kind: BadgeIconKind; size?: number }) {
  if (kind === "perfect") return <span className="emoji" style={{ fontSize: size * 0.85 }} aria-hidden="true">💯</span>;
  if (kind === "xxl" || kind === "xxs") {
    return <span className="text-badge" aria-hidden="true">{kind.toUpperCase()}</span>;
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
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={`smoke ${kind}`}>
      <path d={SMOKE} />
      <path d={WISPS} className="wisp" />
    </svg>
  );
}

export function BadgeButton({ kind, on, label, onClick }: { kind: BadgeIconKind; on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`badge ${kind}`} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <BadgeIcon kind={kind} />
    </button>
  );
}

function Img({ file, size }: { file: string | null; size: number }) {
  const urls = imageUrls(file);
  const [i, setI] = useState(0);
  if (i >= urls.length) {
    return <span className="noimg" style={{ width: size, height: size }} aria-hidden="true">?</span>;
  }
  return <img src={urls[i]} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setI(i + 1)} />;
}

export function MonImage({ file, size = 72 }: { file: string | null; size?: number }) {
  return <Img file={file} size={size} />;
}

/** Dex card image: regular, swapping to shiny while the pointer hovers (desktop). */
export function HoverShiny({ regular, shiny, size = 72 }: { regular: string | null; shiny: string | null; size?: number }) {
  return (
    <span className="hover-shiny" style={{ width: size, height: size }}>
      <span className="reg"><Img file={regular} size={size} /></span>
      {shiny && <span className="shy"><Img file={shiny} size={size} /></span>}
    </span>
  );
}

/** Regular image that shows the shiny one on hover (desktop) or click (any device). */
export function ShinySwap({ regular, shiny, size = 96, label }: { regular: string | null; shiny: string | null; size?: number; label: string }) {
  const [pinned, setPinned] = useState(false);
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
      <span className="shy"><Img file={shiny} size={size} /></span>
    </button>
  );
}
