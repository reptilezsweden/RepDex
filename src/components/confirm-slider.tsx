"use client";

import { useEffect, useState } from "react";

/** Confirmation box: drag the slider all the way to unlock Confirm. */
export function ConfirmSlider({
  title, text, slideLabel, confirmLabel, cancelLabel, onConfirm, onCancel,
}: {
  title: string;
  text: string;
  slideLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(0);
  const unlocked = value >= 100;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">{title}</h2>
        <p>{text}</p>
        <label className="slide">
          <span>{slideLabel}</span>
          <input
            type="range" min={0} max={100} step={1} value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onPointerUp={() => { if (value < 100) setValue(0); }}
            aria-valuetext={`${value}%`}
          />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn" disabled={!unlocked} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
