# TASK_TEMPLATES.md — Contract Templates & Adjacent Code Patterns

> Declare scope before building, not after.
> Use a template for every task with 3+ steps. Paste into chat at session start.
> Updated for V4.1 migration (2026-03-15).

---

## THE CONTRACT FORMAT

```
## Task: [name]

Goal: [one sentence]

Adjacent Code:
- path/to/file.ts — [what it does + how it connects]

Constraints:
- Hard boundaries: [which rules from CLAUDE.md Section III]
- Do NOT touch: [explicit out-of-scope files]
- Scope lock: only modify files listed above

Output Format: [what gets created/changed]

Failure Conditions:
- If [risk], stop and surface to user
```

---

## V4.1 MIGRATION TEMPLATES

### M1. Brand ID Migration (tenant_id → brand_id)

```
## Task: Migrate tenant_id → brand_id

Goal: Rename tenant_id to brand_id across all tables and app code.

Adjacent Code:
- supabase/migrations/[new_migration].sql — ALTER TABLE RENAME COLUMN
- packages/database/src/types/database.types.ts — regenerate after migration
- apps/web/app/**/actions/ — update all .from() queries referencing tenant_id
- packages/shared/src/schemas/*.ts — update Zod schemas
- docs/REFERENCE.md — update conventions table

Constraints:
- Hard boundaries: RLS_EVERYWHERE, REGEN_TYPES
- Create backward-compat view: CREATE VIEW brand_tenants AS SELECT id AS brand_id, * FROM tenants
- Single migration, run off-peak
- Do NOT touch: auth flow, UI components (only data layer)

Output Format: SQL migration + updated types + updated queries

Failure Conditions:
- If RLS policies reference tenant_id → update in same migration
- If any query fails after rename → surface immediately
```

### M2. URL Restructure (flat → scoped)

```
## Task: Restructure URLs to /b/[brandId]/...

Goal: Move flat admin routes to brand/branch-scoped URL structure.

Adjacent Code:
- apps/web/app/(admin)/ → split into (brand)/ and (branch)/ route groups
- apps/web/app/(brand)/b/[brandId]/layout.tsx — CREATE BrandScopeProvider wrapper
- apps/web/app/(branch)/b/[brandId]/br/[branchId]/layout.tsx — CREATE BranchScopeProvider wrapper
- packages/auth/src/nav-config.ts — centralized navigation
- packages/auth/src/scope-context.tsx — ScopeProvider + useScope()

Constraints:
- Hard boundaries: URL là nguồn sự thật duy nhất (không localStorage, không React Context cho scope)
- Do NOT touch: POS routes, KDS routes, Employee routes (separate apps later)
- Scope lock: only admin route group restructure

Output Format: New route groups + layout files + ScopeContextBar

Failure Conditions:
- If existing admin pages break → stop and rollback
- If nav links 404 → update nav-config.ts first
```

### M3. JWT Custom Claims Hook

```
## Task: Implement custom access token hook

Goal: Inject brand_id + user_role into Supabase JWT for direct RLS.

Adjacent Code:
- supabase/migrations/[new].sql — CREATE FUNCTION custom_access_token_hook
- Supabase Dashboard > Auth > Hooks — configure hook
- supabase/migrations/[new].sql — UPDATE RLS policies to use auth.jwt()
- packages/database/src/types/database.types.ts — regenerate

Constraints:
- Hard boundaries: RLS_EVERYWHERE, REGEN_TYPES
- Hook must be SECURITY DEFINER with SET search_path
- brand_members table must exist before hook references it
- Do NOT touch: app-level auth code (middleware, login) in this task

Output Format: SQL migration + RLS policy updates + type regeneration

Failure Conditions:
- If brand_members table doesn't exist → create it first
- If existing RLS policies break → test with 2 brand accounts before deploy
```

### M4. Edge Function (External Integration)

```
## Task: Create [service-name] Edge Function

Goal: Integrate with [PayOS/GrabFood/E-invoice/Zalo] via Supabase Edge Function.

Adjacent Code:
- supabase/functions/[function-name]/index.ts — CREATE Deno function
- supabase/migrations/[new].sql — webhook idempotency table if needed
- packages/database/src/types/database.types.ts — regenerate if new tables

Constraints:
- Hard boundaries: NO_CARD_DATA, AUDIT_APPEND_ONLY
- All secrets from Supabase Vault — NEVER in env vars or code
- HMAC verify all inbound webhooks
- Idempotency key check before processing
- Do NOT touch: app-level code (Edge Functions are independent)

Output Format: Edge Function + migration (if new tables) + Vault secret setup

Failure Conditions:
- If Vault secret not provisioned → stop, provision first
- If webhook ACK timeout > 5s (GrabFood) → optimize or queue
```

### M5. Schema-per-Module Migration

```
## Task: Migrate [tables] to [schema] schema

Goal: Move tables from public to dedicated schema for module isolation.

Adjacent Code:
- supabase/migrations/[new].sql — CREATE SCHEMA + ALTER TABLE SET SCHEMA
- Search path config for backward compat
- packages/database/src/types/database.types.ts — regenerate
- All queries referencing moved tables — update schema prefix if needed

Constraints:
- Hard boundaries: RLS_EVERYWHERE (policies must work after move)
- Move tables in batches (1 schema per migration)
- Set search_path for backward compat during transition
- Do NOT touch: app queries initially (PostgREST handles schema via search_path)

Output Format: SQL migration + updated types

Failure Conditions:
- If RLS policies break after move → rollback migration
- If PostgREST can't find tables → check search_path config
```

---

## STANDARD TEMPLATES (Updated for V4.1)

### 1. New Admin Page (Brand-scoped)

```
## Task: Add [X] page under /b/[brandId]/

Goal: Add a [X] management page scoped to brand level.

Adjacent Code:
- apps/web/app/(brand)/b/[brandId]/[x]/page.tsx — CREATE RSC page
- apps/web/app/(brand)/b/[brandId]/[x]/actions/ — CREATE Server Actions
- packages/auth/src/nav-config.ts — add to BRAND_NAV
- packages/shared/src/schemas/[domain].ts — add Zod schema if new forms

Constraints:
- Hard boundaries: ZOD_SCHEMAS, VALIDATE_CLIENT_IDS, RLS_EVERYWHERE
- Page must use useScope() to get brandId from URL
- Do NOT touch: branch-scoped pages, POS, KDS

Output Format: RSC page + Server Actions + nav config entry + Zod schema
```

### 2. New Admin Page (Branch-scoped)

```
## Task: Add [X] page under /b/[brandId]/br/[branchId]/

Goal: Add a [X] management page scoped to branch level.

Adjacent Code:
- apps/web/app/(branch)/b/[brandId]/br/[branchId]/[x]/page.tsx — CREATE
- apps/web/app/(branch)/b/[brandId]/br/[branchId]/[x]/actions/ — CREATE
- packages/auth/src/nav-config.ts — add to BRANCH_NAV

Constraints:
- Hard boundaries: ZOD_SCHEMAS, VALIDATE_CLIENT_IDS
- RLS must check both brand_id AND branch_id
- Page must use useScope() to get brandId + branchId from URL
```

### 3. Schema / Migration Change

```
## Task: Add/modify [table or column]

Goal: [What data needs to be stored and why].

Adjacent Code:
- supabase/migrations/[new_migration].sql — CREATE this
- packages/database/src/types/database.types.ts — regenerate after migration

Constraints:
- Hard boundaries: PK_TYPE, MONEY_TYPE, TIME_TYPE, TEXT_TYPE, RLS_EVERYWHERE
- V4.1: Use brand_id (not tenant_id) for new tables
- V4.1: Place table in correct schema (core/orders/payments/etc.)
- Scope lock: migration first, then regenerate types, then update app

Failure Conditions:
- If adding SQL functions → MUST run `supabase gen types typescript`
- If RLS needed → write RLS policy in same migration
```

### 4. Order Flow Change

```
## Task: Modify order [lifecycle step]

Goal: Change how orders transition from [A] to [B].

Adjacent Code:
- apps/web/app/(pos)/pos/orders/actions.ts — updateOrderStatus()
- apps/web/app/(pos)/pos/orders/helpers.ts — isValidTransition()
- apps/web/app/(kds)/kds/[stationId]/actions.ts — bumpTicket() if KDS affected
- apps/web/app/(pos)/pos/cashier/actions.ts — processPayment() if cashier affected
- packages/shared/src/constants.ts — VALID_TRANSITIONS, ORDER_STATUSES

Constraints:
- Hard boundaries: PAYMENT_TERMINAL, VALIDATE_CLIENT_IDS, ZOD_SCHEMAS
- Do NOT touch: customer routes, admin routes, inventory

Failure Conditions:
- If status transition logic changes → update VALID_TRANSITIONS first
- If DB trigger changes → write + test migration before app code
```

---

## COMMON ADJACENT CODE CHEAT SHEET

| File changed | Always check these too |
|---|---|
| `**/actions.ts` | Related `helpers.ts` + downstream consumers |
| `constants.ts` (transitions) | All consumers: helpers, actions, shared index |
| `supabase/migrations/` | `database.types.ts` (regen) + `generated/prisma/client/` (regen) |
| `database.types.ts` | Any `.rpc()` call in Server Actions |
| `nav-config.ts` | The route being linked (must exist) |
| Any realtime hook | UPDATE merge logic (preserve JOIN fields) |
| `system_settings` query | Key string must match `constants.ts` |
| **V4.1: brand_id references** | RLS policies + JWT claims hook |
| **V4.1: scope providers** | Layout files + ScopeContextBar |
