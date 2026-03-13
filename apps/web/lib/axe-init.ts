/**
 * Axe-core accessibility checker — development only.
 * Logs violations to the browser console on every React render cycle.
 *
 * Loaded via dynamic import in root layout (dev mode only).
 */
export async function initAxe() {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  const React = await import("react");
  const ReactDOM = await import("react-dom");
  const axe = await import("@axe-core/react");

  // Run axe after 1s delay to let page render settle
  axe.default(React, ReactDOM, 1000, {
    rules: [
      // Enforce WCAG 2.1 AA
      { id: "color-contrast", enabled: true },
      { id: "label", enabled: true },
      { id: "button-name", enabled: true },
      { id: "image-alt", enabled: true },
      { id: "link-name", enabled: true },
    ],
  });
}
