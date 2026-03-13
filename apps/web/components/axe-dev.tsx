"use client";

import { useEffect } from "react";

/**
 * Axe accessibility checker — chỉ chạy trong development.
 * Logs vi phạm WCAG vào console của trình duyệt.
 */
export function AxeDev() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("@/lib/axe-init").then((mod) => mod.initAxe());
    }
  }, []);
  return null;
}
