"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Fold-out menu behind a ☰ button, for screens too narrow for the links in a row. Closes on navigation and outside clicks. */
export function MenuButton({ label, children }: { label: string; children?: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <details ref={ref} className="nav-menu">
      <summary aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <nav onClick={(e) => { if ((e.target as HTMLElement).closest("a") && ref.current) ref.current.open = false; }}>{children}</nav>
    </details>
  );
}
