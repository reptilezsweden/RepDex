"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Warns before leaving Settings or an admin page with unsaved changes. Every form on those pages is
 * watched (forms marked data-no-guard, like search filters, are skipped): a form counts as changed
 * when its values differ from how they were when the page opened or the form was last saved, so
 * changing something back clears the warning. Covers closing or reloading the tab and the site's
 * own links; the browser's Back button isn't covered.
 */
export function UnsavedGuard({ message }: { message: string }) {
  const pathname = usePathname();
  const active = pathname === "/settings" || pathname.startsWith("/settings/") || pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (!active) return;
    const saved = new WeakMap<HTMLFormElement, string>();
    const watched = () => [...document.querySelectorAll<HTMLFormElement>("main form:not([data-no-guard])")];
    const state = (f: HTMLFormElement) => {
      const parts: string[] = [];
      for (const el of Array.from(f.elements)) {
        const e = el as HTMLInputElement;
        if (!e.name || e.type === "submit" || e.type === "button") continue;
        if (e.type === "checkbox" || e.type === "radio") parts.push(`${e.name}=${e.value}:${e.checked}`);
        else if (e.type === "file") parts.push(`${e.name}=${Array.from(e.files ?? []).map((x) => x.name).join("|")}`);
        else parts.push(`${e.name}=${e.value}`);
      }
      return parts.join("\n");
    };
    const snapshot = (f: HTMLFormElement) => saved.set(f, state(f));
    // Forms rendered later (after a save re-renders the page) are taken as they first appear.
    const remember = () => { for (const f of watched()) if (!saved.has(f)) snapshot(f); };
    remember();
    const observer = new MutationObserver(remember);
    observer.observe(document.body, { childList: true, subtree: true });
    const dirty = () => watched().some((f) => saved.has(f) && saved.get(f) !== state(f));

    // Saving makes the current values the new starting point.
    const onSubmit = (e: Event) => { if (e.target instanceof HTMLFormElement) snapshot(e.target); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    // The site's own links navigate without a page load, so they're checked here first.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page (#links)
      if (dirty() && !window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      observer.disconnect();
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active, pathname, message]);

  return null;
}
