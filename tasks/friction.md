# Friction Log — Contradiction Tracker

> When a new instruction contradicts a previous one, LOG IT here.
> Surface to user at the next natural break point.

## 2026-03-15: V4.1 package naming (@comtammatu/* vs @repo/*)

**Contradiction:** Master Plan V4.1 uses `@repo/ui`, `@repo/auth`, `@repo/types` as package names. Current codebase uses `@comtammatu/database`, `@comtammatu/shared`, `@comtammatu/ui`, `@comtammatu/security`.

**Resolution:** Keep `@comtammatu/*` naming — it's a brand namespace and works. V4.1 `@repo/*` was a generic convention suggestion, not a requirement. New packages (e.g., auth) will also use `@comtammatu/auth`.

## 2026-03-15: V4.1 app structure (1 app vs 5 apps)

**Contradiction:** Master Plan V4.1 specifies 5 separate Next.js apps (admin, pos, kds, employee, platform). Current codebase has 1 app (`apps/web`) with route groups.

**Resolution:** Defer app split to after URL restructure is complete. Route groups already provide logical separation. Split into separate apps when deployment independence is needed (Tier 2). Current priority is scope system (brand/branch URLs), not app separation.
