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

## 2026-03-02: Realtime postgres_changes payloads don't include joined relations

**Pattern:** KDS board lost order number display after bumping a ticket. The `postgres_changes` payload only contains raw columns from the changed table, not joined relations like `orders(order_number, tables(number))`.
**Rule:** When merging realtime UPDATE payloads into local state, always preserve existing joined relations that the payload won't include: `{ ...existing, ...updated, joinedField: updated.joinedField ?? existing.joinedField }`.
**Prevention:** In every `useRealtime*` hook, audit the merge logic for any `.select()` joins in the initial query. Those fields must be explicitly preserved during UPDATE merges.

## 2026-03-02: system_settings key names must be consistent across all consumers

**Pattern:** Voucher recalculation in `cashier/actions.ts` used `"service_charge_rate"` but the seed data and `orders/actions.ts` used `"service_charge"`. The mismatch caused silent fallback to default values.
**Rule:** Define system_settings keys as constants in `@comtammatu/shared/constants.ts` and import them everywhere. Never hardcode key strings in action files.
**Prevention:** Grep for `system_settings` key strings after adding any new settings consumer. Better yet, create a shared `getTaxSettings()` utility function.

## 2026-03-05: UNIQUE constraints on multi-tenant tables must include tenant_id

**Pattern:** `device_fingerprint TEXT NOT NULL UNIQUE` on `registered_devices` prevented the same physical device from being registered across different tenants. Staff got silent insert failures.
**Rule:** Multi-tenant tables with UNIQUE constraints must use composite unique indexes: `UNIQUE(field, tenant_id)` instead of `UNIQUE(field)`.
**Prevention:** When adding UNIQUE constraints, always ask: "Should this be unique globally or per-tenant?" For tenant-scoped tables, the answer is almost always per-tenant.

## 2026-03-05: RLS silent failures on writes by non-admin roles

**Pattern:** Staff (cashier/waiter/chef) tried to re-register a rejected device via `.update()`, but the only UPDATE RLS policy required owner/manager role. Supabase returned `{ data: null, error: null }` — no error, no update. Staff was stuck forever.
**Rule:** For every Server Action that writes data, trace which RLS policies allow the operation for the calling user's role. Add role-specific policies with tight `WITH CHECK` constraints when non-admin roles need write access.
**Prevention:** After writing any Server Action with `.update()/.insert()/.delete()`, verify the RLS policy chain: "Can role X perform this operation?" Test with a non-admin user.

## 2026-03-13: SupabaseClient type change from `any` — successfully resolved

**Pattern:** Changing `type SupabaseClient = any` to `SupabaseClient<Database>` in `action-context.ts` caused 10+ cascading type errors: column name mismatches (campaigns `message` → `content`, customers `user_id` → `auth_user_id`), nullable columns (`number | null`), `Json` type vs specific interfaces, Recharts formatter type annotations, and `.from(table)` with dynamic string args.
**Rule:** Use `import type { Database } from "@comtammatu/database/types"` (subpath export, NOT barrel) to avoid rootDir errors. Generic table helpers (verifyBranchOwnership etc.) need `(supabase as any).from(table)` for dynamic table names. Tables not in generated types (push_subscriptions) keep `as any`.
**Prevention:** After regenerating `database.types.ts`, run `pnpm turbo build --force` to catch all mismatches. Fix iteratively: column renames, nullable handling, Json casts, then Recharts formatters.

## 2026-03-13: Package.json `exports` field is strict — only listed paths are resolvable

**Pattern:** Adding an `exports` map to `@comtammatu/database/package.json` with clean paths (`./supabase/client`) broke all existing imports that used `/src/` prefix (`./src/supabase/client`). Node.js `exports` field takes precedence over filesystem.
**Rule:** When adding `exports` to an existing package, you must include BOTH the new clean paths AND the old paths for backward compatibility. Or update all consumers first.
**Prevention:** Always grep for all import patterns of the package before adding `exports`. Include both old and new path patterns in the exports map.

## 2026-03-13: Agent worktree permission issues with bypassPermissions

**Pattern:** Background agents in worktree isolation failed due to denied Write/Bash/Edit permissions. Even with `bypassPermissions` mode, some agents couldn't complete work.
**Rule:** For refactoring tasks that modify many files, prefer running agents directly (not in worktrees) with `bypassPermissions` mode. Monitor agent progress and take over manually if stuck.
**Prevention:** Check agent output files periodically. If an agent stalls (output file size stops growing), take over its remaining work directly.

## 2026-03-13: PostgreSQL function params — defaults must come last

**Pattern:** `CREATE FUNCTION foo(p_a INT DEFAULT 0, p_b INT)` fails with `input parameters after one with a default value must also have defaults`.
**Rule:** In PostgreSQL function definitions, all parameters with DEFAULT values must come after all required (no-default) parameters.
**Prevention:** When defining RPC functions, always order: required params first, then optional params with defaults.

## 2026-03-13: Supabase client export is `createClient`, not `createBrowserClient`

**Pattern:** Build error "Export createBrowserClient doesn't exist in target module" when importing from `@comtammatu/database/src/supabase/client`.
**Rule:** The `packages/database/src/supabase/client.ts` wraps `@supabase/ssr`'s `createBrowserClient` internally but exports it as `createClient()`. Always use `import { createClient } from "@comtammatu/database/src/supabase/client"`.
**Prevention:** Check the actual export name in the source file before writing imports. Don't assume the internal function name matches the export name.

## 2026-03-13: Vitest requires `@types/node` in packages using `process.env`

**Pattern:** TypeScript error `TS2580: Cannot find name 'process'` in `packages/shared/src/server/logger.ts` which uses `process.env.NODE_ENV`.
**Rule:** Packages that reference `process`, `Buffer`, or other Node.js globals need `@types/node` in devDependencies, even if they're consumed by apps that have it.
**Prevention:** When creating server-side utilities in shared packages, add `@types/node` to the package's devDependencies.

## 2026-03-02: Server Actions must validate client-provided IDs against auth context

**Pattern:** `createOrder` accepted a `terminal_id` from the client without verifying it belonged to the user's branch or was the correct type. A waiter could spoof a cashier terminal ID.
**Rule:** Every Server Action that receives an entity ID from the client must verify ownership (branch, tenant) before using it. Never trust client-provided foreign keys.
**Prevention:** Add a verification step for any ID parameter that crosses a trust boundary (client → server). Pattern: fetch the entity, check branch/tenant match, check type/status.

## 2026-03-13: Account lockout must clear on successful login

**Pattern:** Without clearing failed attempts after a successful login, the counter accumulates across sessions, causing unexpected lockouts for legitimate users who occasionally mistype passwords.
**Rule:** Always call `clearFailedLogins()` immediately after a successful `signInWithPassword()`, before any other logic (profile fetch, device check, etc.).
**Prevention:** In the login flow: (1) check lockout → (2) attempt auth → (3) on failure: record attempt → (4) on success: clear attempts → (5) proceed with profile/device checks.

## 2026-03-13: X-XSS-Protection should be `0` not `1; mode=block`

**Pattern:** The legacy `X-XSS-Protection: 1; mode=block` header can actually introduce XSS vulnerabilities in older browsers via "false positive" blocking. Modern browsers have removed XSS auditors entirely.
**Rule:** Set `X-XSS-Protection: 0` and rely on CSP `script-src` instead. CSP is the correct modern defense against XSS.
**Prevention:** When setting security headers, always check current OWASP recommendations. Legacy headers may be counterproductive.

## 2026-03-13: Monolithic file must be deleted after splitting into directory

**Pattern:** After splitting `actions.ts` (monolithic) into `actions/` directory with `index.ts` barrel re-export, the old `actions.ts` was not deleted. Node.js resolves `import from "./actions"` to `actions.ts` (file) before `actions/index.ts` (directory). Locally, the old monolithic code runs instead of the split modules — silently.
**Rule:** When refactoring a file into a directory with the same name, the original file MUST be deleted in the same commit. Verify with `ls` after the split.
**Prevention:** After any file→directory refactor: (1) delete original file, (2) verify `git status` shows original as deleted, (3) test an import resolves to the new barrel, (4) commit delete + new directory together.

## 2026-03-13: CQRS materialized views need UNIQUE indexes for CONCURRENTLY refresh

**Pattern:** `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires at least one unique index on the view. Without it, PostgreSQL errors out.
**Rule:** Every materialized view must have a UNIQUE index on its natural key columns (e.g., `branch_id, report_date`). Add the index in the same migration that creates the view.
**Prevention:** When creating a new MV, always pair it with `CREATE UNIQUE INDEX ON mv_name (key_columns)` in the same migration.

## 2026-03-14: Customer PWA removal — multi-layer blocking required

**Pattern:** Architecture V3.0 §1.4 specified Customer PWA removed (PR #60), but the `(customer)/` route group was still fully functional with 20+ pages/components and no auth guard on the layout. Customers could access CRM features directly.
**Rule:** When deprecating a web-facing route group in favor of a mobile app, implement blocking at ALL layers: (1) middleware redirect, (2) layout redirect, (3) login action rejection for the role, (4) stub out all page/component files. A single layer is insufficient — defense in depth.
**Prevention:** After any "remove feature X" architectural decision, grep for all route groups, components, and actions that serve feature X. Block at middleware + layout + login. Create REST API endpoints (`/api/mobile/*`) as the replacement surface.

## 2026-03-14: Always verify DB column names before writing Supabase queries

**Pattern:** Agent-generated mobile API routes used non-existent columns (`discount_percentage`, `valid_until`, `title`, `description` on vouchers table) and non-existent tables (`customer_branch_access`). TypeScript caught these via generated types, but only after wasted iterations.
**Rule:** Before writing any new `.from("table").select("columns")` query, check actual column names from either `database.types.ts` or existing working queries in the codebase that use the same table.
**Prevention:** When creating new API routes that mirror existing Server Actions, copy the exact `.select()` column list from the working action. Don't guess column names.
