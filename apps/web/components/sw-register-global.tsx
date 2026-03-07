"use client";

import { useEffect } from "react";

export function SwRegisterGlobal() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // SW registration failed — non-critical, push will just not work
      });
    }
  }, []);

  return null;
}
