"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

const KEY = "rd-first-use-hidden";

/**
 * Getting started, on the start page for signed-in users until they hide it (remembered per browser).
 * Steps are marked done where RepDex can tell: settings saved, something ticked.
 */
export function FirstUse({ t, settingsDone, hasTicks }: { t: Dict; settingsDone: boolean; hasTicks: boolean }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem(KEY) === "1"); } catch { setHidden(false); }
  }, []);
  if (hidden) return null;
  const hide = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, "1"); } catch { /* shown again next time */ }
  };
  const steps: { text: string; href: string; done?: boolean; optional?: boolean }[] = [
    { text: t.firstUseSettings, href: "/settings", done: settingsDone },
    { text: t.firstUseSheet, href: "/help/spreadsheet", optional: true },
    { text: t.firstUseBatch, href: "/dexes", done: hasTicks },
    { text: t.firstUseTick, href: "/help/dexes" },
  ];
  return (
    <section className="panel first-use" aria-labelledby="first-use-title">
      <div className="first-use-head">
        <h2 id="first-use-title">{t.firstUseTitle}</h2>
        <button type="button" className="link-button" onClick={hide}>{t.firstUseHide}</button>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={i} className={s.done ? "done" : undefined}>
            <span className="step-mark" aria-hidden="true">{s.done ? "✓" : i + 1}</span>
            <Link href={s.href}>{s.text}</Link>
            {s.optional && <span className="optional">{t.firstUseOptional}</span>}
          </li>
        ))}
      </ol>
      <p><Link href="/help/first-use">{t.firstUseGuide} →</Link></p>
    </section>
  );
}
