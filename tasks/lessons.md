# Lessons Learned

> Updated after every correction from user.
> Format: Pattern -> Rule -> Prevention

## 2026-02-28: @supabase/ssr version must match @supabase/supabase-js
**Pattern:** Supabase typed operations (.insert/.update/.eq) resolve to `never`
**Rule:** `@supabase/ssr@0.6.1` passes 3 type params to `SupabaseClient`, but `@supabase/supabase-js@2.98.0` expects 5 (added `SchemaNameOrClientOptions` + `ClientOptions`). This causes Schema (object) to land in SchemaName (string) position → everything becomes `never`.
**Prevention:** Always update `@supabase/ssr` when bumping `@supabase/supabase-js`. Use `@supabase/ssr@0.8.0+` with `@supabase/supabase-js@2.98.0`.

## 2026-02-28: Separate Prisma from Supabase exports for Edge Runtime
**Pattern:** Middleware importing from `@comtammatu/database` barrel export pulls in Prisma (Node.js modules) which breaks Edge Runtime.
**Rule:** Create a `@comtammatu/database/src/supabase` subpath export that only includes Supabase utilities. Middleware and auth callback routes import from this subpath instead.
**Prevention:** Never import Prisma in Edge-compatible routes. Use `@comtammatu/database/src/supabase` for middleware and API routes that run on Edge.

## 2026-02-28: Prisma 7 breaking changes
**Pattern:** Prisma 7 removed `url`/`directUrl` from `schema.prisma`, changed generator provider from `prisma-client-js` to `prisma-client`, requires explicit output directory.
**Rule:** Use `prisma.config.ts` for datasource URL config. Use `@prisma/adapter-pg` driver adapter pattern. Generated client is at `../generated/prisma/client` (not `@prisma/client`).
**Prevention:** Always check Prisma version migration guides when upgrading major versions.

## 2026-03-01: Client components CANNOT import from supabase barrel — must use direct file import
**Pattern:** Turbopack build fails with "Module not found: Can't resolve 'next/headers'" in client components that import from `@comtammatu/database/src/supabase` (the barrel `index.ts`).
**Rule:** The barrel at `packages/database/src/supabase/index.ts` re-exports both `server.ts` (uses `next/headers`) and `client.ts`. Client components pulling this barrel get server-only code bundled. Client components MUST import from `@comtammatu/database/src/supabase/client` directly.
**Prevention:** Three-tier import strategy:
  - **Server components / Server Actions:** `@comtammatu/database` (full barrel with Prisma) or `@comtammatu/database/src/supabase` (Supabase server+client)
  - **Middleware / Edge routes:** `@comtammatu/database/src/supabase` (no Prisma)
  - **Client components (hooks, "use client"):** `@comtammatu/database/src/supabase/client` (direct file, no server deps)

## 2026-03-01: Regenerate database types after adding SQL functions
**Pattern:** TypeScript error `TS2345` — Supabase RPC function `generate_order_number` not found in `Database['public']['Functions']`.
**Rule:** After adding SQL functions via migration (`CREATE OR REPLACE FUNCTION`), you must regenerate `database.types.ts` before the app can call `supabase.rpc("function_name")`.
**Prevention:** After every migration that adds/modifies functions, run `supabase gen types typescript` (or Supabase MCP `generate_typescript_types`) and update `packages/database/src/types/database.types.ts`.

## 2026-03-02: Date.now() is flagged as impure in React Server Components
**Pattern:** ESLint `react-hooks/purity` rule flags `Date.now()` as impure function call during render in RSC.
**Rule:** In React Server Components (async function components), avoid `Date.now()`. Instead, create a `new Date()` once and use `.getTime()` for arithmetic.
**Prevention:** Use `const now = new Date(); const ts = now.getTime() - offset;` instead of `new Date(Date.now() - offset)`.

## 2026-03-02: Parallel Task agents accelerate multi-module delivery
**Pattern:** Week 5-6 had 6 independent modules (shared, dashboard, inventory, suppliers, HR, security). Sequential implementation would take much longer.
**Rule:** When modules are independent (different routes, different files), launch multiple Task agents in parallel. Group by dependency: shared package first, then consumer modules in parallel.
**Prevention:** Identify module boundaries early. If modules don't share new files, they can be built concurrently. Verify with typecheck + lint + build after all agents complete.

## 2026-03-02: Zod `.nonzero()` does not exist — use `.refine()` instead
**Pattern:** TypeScript error `TS2339: Property 'nonzero' does not exist on type 'ZodNumber'` when using `z.coerce.number().int().nonzero()`.
**Rule:** The `.nonzero()` method is not available in Zod v3.24. Use `.refine((v) => v !== 0, "message")` to validate non-zero values.
**Prevention:** When needing non-zero validation, always use `.refine()`. Check Zod API docs for available number methods before assuming a method exists.

## 2026-03-02: Customer layout should be lightweight — auth in individual pages
**Pattern:** Customer layout initially imported Supabase and fetched user/customer data, but this was unnecessary since public pages (menu) don't need auth and auth-required pages handle their own redirect.
**Rule:** Keep route group layouts minimal. The customer layout only needs the shell (header, nav, toaster). Individual pages handle auth checks independently: public pages skip auth, protected pages redirect to /login.
**Prevention:** For mixed public/private route groups, put auth logic in individual page RSCs, not in the shared layout. This avoids unnecessary DB calls on public pages.
