"use client";

import { useEffect } from "react";

/** Registers the service worker so the app can be installed to the home screen. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
