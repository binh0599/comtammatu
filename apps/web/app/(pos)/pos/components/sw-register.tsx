"use client";

import { useEffect } from "react";

/**
 * Registers the POS Service Worker on mount.
 * Only registers in production or when SW is supported.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/pos" })
        .catch(() => {
          // SW registration failed — non-critical, POS works without it
        });
    }
  }, []);

  return null;
}
