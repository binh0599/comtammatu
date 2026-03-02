# CLAUDE.md — Com Tấm Mã Tú F&B CRM

> Read this first. Details live in `docs/REFERENCE.md`. Task templates in `docs/TASK_TEMPLATES.md`. Session rules in `docs/SESSION_PROTOCOL.md`.

---

## I. STACK

| Layer | Choice |
| ----- | ------ |
| Framework | Next.js 16.1 App Router + React 19.1 + TypeScript 5.9 strict |
| Database | Supabase (project: `zrlriuednoaqrsvnjjyo`) + Prisma 7.2 + `@prisma/adapter-pg` |
| Auth | Supabase Auth + `@supabase/ssr@0.8.0` — cookie-based sessions |
| UI | shadcn/ui (new-york) + Tailwind CSS v4.2 + Lucide React |
| Monorepo | Turborepo 2.8 + pnpm 9.15.0 workspaces |
| Hosting | Vercel (`comtammatu.vercel.app`) + GitHub Actions CI |
| Shared packages | `@comtammatu/database`, `@comtammatu/shared` (Zod schemas), `@comtammatu/security` (stub), `@comtammatu/ui` (stub) |

**Phase:** MVP Complete (8 weeks). ~180 source files, 30 routes, `main` branch.

---

## II. HARD BOUNDARIES
> Violation = stop immediately, `git checkout .`, and diagnose root cause.

1. **CLIENT_IMPORT** — `"use client"` files import from `@comtammatu/database/src/supabase/client` (never the barrel). Middleware/Edge from `@comtammatu/database/src/supabase`. RSC/Actions from `@comtammatu/database` (full barrel).
2. **RLS_EVERYWHERE** — Every new table needs RLS policies. No exceptions.
3. **MONEY_TYPE** — `NUMERIC(14,2)` for totals, `NUMERIC(12,2)` for prices. Never `FLOAT`.
4. **TIME_TYPE** — `TIMESTAMPTZ` always. Never `TIMESTAMP`.
5. **PK_TYPE** — `BIGINT GENERATED ALWAYS AS IDENTITY`. Never `SERIAL`, never `UUID` for internal PKs.
6. **TEXT_TYPE** — `TEXT` always. Never `VARCHAR`.
7. **PAYMENT_TERMINAL** — Only `cashier_station` terminals can process payments. Verify server-side.
8. **AUDIT_APPEND_ONLY** — Never `UPDATE`/`DELETE` on `audit_logs` or `security_events`.
9. **NO_CARD_DATA** — Card/payment data never stored in our DB. PCI DSS SAQ A.
10. **VALIDATE_CLIENT_IDS** — Every Server Action receiving an entity ID from client must verify branch + tenant ownership before use.
11. **REGEN_TYPES** — After any migration adding/modifying SQL functions, run `supabase gen types typescript` before referencing via `.rpc()`.
12. **ZOD_SCHEMAS** — Every Server Action and API route validates input with a Zod schema from `@comtammatu/shared`.

---

## III. CRITICAL FILE PATHS

```
apps/web/app/
  login/actions.ts            ← Auth: login(), logout()
  (admin)/layout.tsx          ← RBAC guard (owner/manager only)
  (admin)/admin/              ← All admin routes + actions.ts per route
  (pos)/layout.tsx            ← POS auth guard
  (pos)/pos/orders/actions.ts ← Order lifecycle (createOrder, updateStatus)
  (pos)/pos/cashier/actions.ts← Payment processing
  (kds)/kds/[stationId]/      ← KDS realtime board
  (customer)/customer/        ← Customer PWA (6 pages)
  api/privacy/                ← GDPR endpoints

packages/
  database/src/supabase/client.ts  ← Client components ONLY import from here
  database/src/supabase/server.ts  ← RSC/Actions import from here
  shared/src/constants.ts          ← All enums, status arrays, valid transitions
  shared/src/schemas/              ← All Zod schemas (11 files)

tasks/
  regressions.md  ← Rules from past failures — CHECK EVERY SESSION
  lessons.md      ← Patterns + prevention — CHECK EVERY SESSION
  todo.md         ← Current progress
```

---

## IV. TASK CONTRACT TEMPLATE
> Use before starting any task with 3+ steps. Pre-filled examples in `docs/TASK_TEMPLATES.md`.

```
## Task: [name]

Goal: [one sentence — what changes and why]

Adjacent Code:
- path/to/file.ts — [what it does and how it connects to this task]

Constraints:
- Hard boundaries that apply: [list from Section II]
- Do NOT touch: [files explicitly out of scope]
- Scope lock: only modify files listed above

Output Format: [e.g., "Server Action + Client component + Zod schema update"]

Failure Conditions:
- If touching auth/payment/RLS → stop and surface to user
- If [specific risk] → [specific action]
```

---

## V. BOOT SEQUENCE
```
1. Check tasks/regressions.md — any rule that applies?
2. Check tasks/lessons.md — any relevant pattern?
3. Fill Task Contract Template → confirm scope before coding
4. git commit checkpoint BEFORE starting work
5. After task: typecheck + lint + build → commit → kill session
```

---

## VI. ROLES & ORDER FLOW (Quick Reference)

**Roles:** `owner > manager > cashier > chef > waiter > inventory > hr > customer`

**Order flow:** Waiter creates → KDS receives (realtime) → Chef bumps ready → Cashier pays → completed

**Terminal split:** `mobile_order` (waiter, no payment) | `cashier_station` (payment only)

---

*Full reference: `docs/REFERENCE.md` — dependencies, DB conventions, full file tree, skills map, migration path.*
