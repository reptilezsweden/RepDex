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
export function WantedButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className="want" aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d={PUZZLE} />
      </svg>
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
