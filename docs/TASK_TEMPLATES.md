# TASK_TEMPLATES.md — Contract Templates & Adjacent Code Patterns

> Inspired by production Claude Code workflow: declare scope before building, not after.
> Use a template for every task with 3+ steps. Paste into chat at session start.

---

## THE CONTRACT FORMAT

```
## Task: [name]

Goal: [one sentence]

Adjacent Code:
- path/to/file.ts — [what it does + how it connects]

Constraints:
- Hard boundaries: [which rules from CLAUDE.md Section II]
- Do NOT touch: [explicit out-of-scope files]
- Scope lock: only modify files listed above

Output Format: [what gets created/changed]

Failure Conditions:
- If [risk], stop and surface to user
```

---

## PRE-FILLED TEMPLATES BY TASK TYPE

### 1. New Admin Tab

```
## Task: Add [X] tab to /admin/[section]

Goal: Add a [X] management tab to the [section] admin page.

Adjacent Code:
- apps/web/app/(admin)/admin/[section]/page.tsx — hub page, add new tab to Tabs component
- apps/web/app/(admin)/admin/[section]/actions.ts — add new Server Actions here
- apps/web/app/(admin)/admin/[section]/[x]-tab.tsx — CREATE this file
- apps/web/components/admin/app-sidebar.tsx — only if adding a new top-level nav link
- packages/shared/src/schemas/[domain].ts — add Zod schema if new input forms
- packages/shared/src/constants.ts — add any new status enums

Constraints:
- Hard boundaries: ZOD_SCHEMAS, VALIDATE_CLIENT_IDS, RLS_EVERYWHERE
- Do NOT touch: other admin routes, pos/, kds/, customer/
- Scope lock: only 3-5 files listed above

Output Format: 1 new tab component + Server Actions + optional Zod schema

Failure Conditions:
- If new DB columns required → write migration FIRST, confirm with user
- If touching shared constants → check all 11 schema files for conflicts
```

---

### 2. Order Flow Change

```
## Task: Modify order [lifecycle step]

Goal: Change how orders transition from [A] to [B].

Adjacent Code:
- apps/web/app/(pos)/pos/orders/actions.ts — updateOrderStatus(), isValidTransition()
- apps/web/app/(pos)/pos/orders/helpers.ts — isValidTransition() state machine
- apps/web/app/(kds)/kds/[stationId]/actions.ts — bumpTicket() if KDS affected
- apps/web/app/(pos)/pos/cashier/actions.ts — processPayment() if cashier affected
- apps/web/hooks/use-realtime-orders.ts — if realtime update payload changes
- packages/shared/src/constants.ts — VALID_TRANSITIONS, ORDER_STATUSES
- supabase/migrations/ — if DB trigger logic changes

Constraints:
- Hard boundaries: PAYMENT_TERMINAL, VALIDATE_CLIENT_IDS, ZOD_SCHEMAS
- Do NOT touch: customer PWA, admin routes, inventory
- Scope lock: only files above

Output Format: Updated Server Action + constants + migration (if needed)

Failure Conditions:
- If status transition logic changes → update VALID_TRANSITIONS in constants.ts first
- If DB trigger changes → write + test migration before touching app code
- Any change to KDS bump must be reflected in realtime hook merge logic
```

---

### 3. Schema / Migration Change

```
## Task: Add/modify [table or column]

Goal: [What data needs to be stored and why].

Adjacent Code:
- supabase/migrations/[new_migration].sql — CREATE this
- packages/database/src/types/database.types.ts — regenerate after migration
- packages/database/generated/prisma/client/ — regenerate via db:generate
- apps/web/app/(admin)/admin/[section]/actions.ts — update queries
- packages/shared/src/schemas/[domain].ts — update Zod schema if new columns

Constraints:
- Hard boundaries: PK_TYPE, MONEY_TYPE, TIME_TYPE, TEXT_TYPE, RLS_EVERYWHERE
- Do NOT touch: existing column types (migration only adds, never modifies type)
- Scope lock: migration first, then regenerate types, then update app

Output Format: SQL migration + regenerated types + updated actions

Failure Conditions:
- If adding SQL functions → MUST run `supabase gen types typescript` before any .rpc() call
- If RLS needed → write RLS policy in same migration, confirm with user
- If breaking change to existing columns → write compensating migration, surface risk
```

---

### 4. New Realtime Feature

```
## Task: Add realtime [X] subscription

Goal: Subscribe to [table] changes and update [UI component] in real-time.

Adjacent Code:
- apps/web/hooks/use-realtime-[x].ts — CREATE this hook
- apps/web/app/(zone)/[route]/[component].tsx — consume the hook
- packages/database/src/types/database.types.ts — type the payload
- supabase/migrations/ — only if new DB triggers needed

Constraints:
- Hard boundaries: scope channel to branch_id + tenant_id (RLS + channel naming)
- Do NOT touch: other hooks, unrelated routes
- Scope lock: 1 hook + 1 consumer component

Output Format: useRealtime[X].ts hook + updated consumer component

Failure Conditions:
- postgres_changes payloads don't include JOINs → preserve existing joined fields in UPDATE merge
- If table doesn't have RLS → block, fix RLS first
```

---

### 5. Auth / RBAC Change

```
## Task: Change access control for [route/action]

Goal: [Who should be able to do what and why].

Adjacent Code:
- apps/web/middleware.ts — route-level auth guards
- apps/web/app/(admin)/layout.tsx — admin RBAC guard (owner/manager check)
- apps/web/app/(pos)/layout.tsx — POS auth guard
- apps/web/app/(kds)/layout.tsx — KDS auth guard
- packages/database/src/supabase/middleware.ts — updateSession + role redirect
- packages/shared/src/constants.ts — ROLES arrays (ADMIN_ROLES, POS_ROLES, etc.)

Constraints:
- Hard boundaries: PAYMENT_TERMINAL (cashier only), VALIDATE_CLIENT_IDS
- Do NOT touch: customer/ routes auth (handled per-page)
- Scope lock: only the specific layout + middleware files

Output Format: Updated layout guard + constants

Failure Conditions:
- If adding new role → update all role arrays in constants.ts + check all layout guards
- Never client-side only auth check — always verify in Server Action too
```

---

### 6. Customer PWA Feature

```
## Task: Add/modify customer [page/feature]

Goal: [What the customer can now do].

Adjacent Code:
- apps/web/app/(customer)/customer/[page]/page.tsx — RSC shell
- apps/web/app/(customer)/customer/[page]/[x]-client.tsx — client component
- apps/web/app/(customer)/customer/actions.ts — customer Server Actions
- apps/web/components/customer/customer-nav.tsx — only if adding nav item
- packages/shared/src/schemas/[crm|feedback|privacy].ts — Zod schema
- api/privacy/ — only if GDPR flow involved

Constraints:
- Hard boundaries: ZOD_SCHEMAS, VALIDATE_CLIENT_IDS
- Public pages (menu): NO auth required — skip Supabase call entirely
- Protected pages: redirect to /login in page.tsx RSC
- Do NOT touch: admin/, pos/, kds/ routes

Output Format: RSC page + client component + Server Action

Failure Conditions:
- If page is mixed public/private → auth in individual page.tsx, NOT in customer layout
- Customer can only access their own data — verify user.id === customer.auth_user_id
```

---

### 7. Shared Package Update (constants or schemas)

```
## Task: Add [X] to @comtammatu/shared

Goal: Add [new schema / enum / formatter] for [feature].

Adjacent Code:
- packages/shared/src/constants.ts — add enums/arrays/transitions
- packages/shared/src/schemas/[domain].ts — add/modify Zod schema
- packages/shared/src/utils/format.ts — add Vietnamese label functions
- packages/shared/src/index.ts — export new additions
- [all files that will import the new export] — list them here

Constraints:
- Do NOT use Zod methods that don't exist (.nonzero() → use .refine() instead)
- Do NOT break existing exports — only add, never rename without checking all consumers
- Scope lock: shared package + listed consumers only

Output Format: Updated schema file + constants + barrel export

Failure Conditions:
- If renaming a constant → grep for all usages first, list affected files
- If new system_settings key → define as constant immediately, never hardcode strings
```

---

## COMMON ADJACENT CODE CHEAT SHEET

When you touch... you MUST also check:

| File changed | Always check these too |
| ------------ | ---------------------- |
| `orders/actions.ts` | `orders/helpers.ts` (transitions) + `kds/actions.ts` (ticket state) + `cashier/actions.ts` (payment check) |
| `constants.ts` (VALID_TRANSITIONS) | All consumers: `orders/helpers.ts`, `orders/actions.ts`, `shared/src/index.ts` |
| `supabase/migrations/` | `database.types.ts` (regen) + `generated/prisma/client/` (regen) |
| `database.types.ts` | Any `.rpc()` call in Server Actions |
| `app-sidebar.tsx` | The new route being linked (must exist before linking) |
| `customer/actions.ts` | Auth check: `getAuthenticatedCustomer()` in each action |
| `api/privacy/` | `api/privacy/helpers.ts` (shared auth helper) |
| Any realtime hook | UPDATE merge logic (preserve JOIN fields not in payload) |
| `system_settings` query | Key string must match `constants.ts` — never hardcode |
