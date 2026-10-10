"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Confirmation box: drag the slider all the way to unlock Confirm. */
export function ConfirmSlider({
  title, text, slideLabel, confirmLabel, cancelLabel, onConfirm, onCancel, children, canConfirm = true,
}: {
  title: string;
  text: string;
  /** Extra choices shown between the text and the slider. */
  children?: ReactNode;
  /** False keeps Confirm locked even when the slider is at the end (e.g. nothing chosen). */
  canConfirm?: boolean;
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
        {children}
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
          <button type="button" className="btn" disabled={!unlocked || !canConfirm} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
