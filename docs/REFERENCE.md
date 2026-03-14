# REFERENCE.md — Full Technical Reference

> Moved from CLAUDE.md to keep the boot file short. This file is for deep dives, not boot reads.

---

## DEPENDENCIES (Key packages)

### apps/web

- `next@^16.1.0`, `react@^19.1.0`, `@supabase/supabase-js@^2.49.0`, `@supabase/ssr@^0.8.0`
- `tailwindcss@^4.2.1`, shadcn/ui (new-york style, 26 components via `@comtammatu/ui`)
- `sonner@^2.0.7` (toasts), `zod@^3.24.0`, `vaul` (drawer), `next-themes@^0.4.6`
- `@tanstack/react-query@^5`, `zustand@^5` (state management)
- `web-push` (VAPID push notifications), `recharts` (charts, dynamically imported)

### packages/database

- `prisma@^7.2.0`, `@prisma/client@^7.2.0`, `@prisma/adapter-pg@^7.2.0`, `pg@^8.13.0`
- Generated client at: `packages/database/generated/prisma/client/` (git-ignored, must `db:generate`)

### packages/shared

- `zod@^3.24.0` — 16 schema files, constants, formatters
- `server/logger.ts` — structured logging (JSON prod / pretty dev)
- `server/error-reporter.ts` — replaceable error reporting abstraction

### packages/ui

- 26 shadcn/ui primitives + `cn()` utility + `useIsMobile` hook
- Barrel export from `@comtammatu/ui`

### packages/security

- Upstash Redis rate limiting (6 limiters) + account lockout

---

## DATABASE CONVENTIONS

| Item         | Rule                                                       |
| ------------ | ---------------------------------------------------------- |
| Primary keys | `BIGINT GENERATED ALWAYS AS IDENTITY`                      |
| Text         | `TEXT` (never VARCHAR)                                     |
| Timestamps   | `TIMESTAMPTZ` (never TIMESTAMP)                            |
| Money totals | `NUMERIC(14,2)`                                            |
| Unit prices  | `NUMERIC(12,2)`                                            |
| Cost prices  | `NUMERIC(12,4)`                                            |
| Money        | NEVER FLOAT                                                |
| Enums        | `TEXT` + `CHECK` constraint (not PG ENUM type)             |
| Multi-tenant | `(tenant_id, field)` composite unique                      |
| FK indexes   | On every foreign key column                                |
| JSONB        | GIN index                                                  |
| Idempotency  | `UUID NOT NULL UNIQUE` on orders + payments                |
| Concurrency  | `version INT` on `stock_levels` (optimistic locking)       |
| Audit tables | `REVOKE UPDATE, DELETE` on `audit_logs`, `security_events` |

### Key Tables (v2.2+ schema)

```
tenants → branches → tables
profiles (maps to auth.users via trigger, role + tenant_id + branch_id)
pos_terminals → pos_sessions → registered_devices
menu_items, menu_categories, menu_item_sides, modifiers, modifier_groups
orders → order_items → payments
kds_stations → kds_tickets
ingredients → recipes → stock_levels → stock_movements → stock_counts
suppliers → purchase_orders → purchase_order_items
customers → loyalty_tiers → loyalty_transactions → vouchers
employees → shifts → shift_assignments → attendance → leave_requests
payroll_periods → payroll_entries
push_subscriptions
audit_logs, security_events (append-only)
```

### Materialized Views (CQRS — refreshed daily 2:30 AM UTC)

```
mv_daily_revenue, mv_daily_payment_methods, mv_daily_order_type_mix
mv_item_popularity, mv_staff_performance, mv_inventory_usage, mv_peak_hours
```

### Migrations location: `supabase/migrations/`

- `20260228000000_initial_schema.sql` — v2.1 base (1,782 lines)
- `20260228000001_fix_security_advisors.sql`
- `20260228000002_schema_v2_2.sql` — junction tables, indexes
- `20260228000003_profile_trigger.sql` — auto-create profile
- `20260228100000_pos_kds_functions.sql` — order_number gen, KDS triggers
- Additional migrations: payroll tables, push_subscriptions, pg_trgm indexes, DB transaction RPCs, materialized views, stock count RPC

---

## IMPORT STRATEGY (Three Tiers)

```
Tier 1 — RSC / Server Actions:
  import { prisma } from '@comtammatu/database'
  import { createServerClient } from '@comtammatu/database/src/supabase/server'

Tier 2 — Middleware / Edge routes:
  import { updateSession } from '@comtammatu/database/src/supabase/middleware'
  // Never import Prisma here — breaks Edge Runtime

Tier 3 — Client components ("use client"):
  import { createClient } from '@comtammatu/database/src/supabase/client'
  // Export is `createClient`, NOT `createBrowserClient` (see regressions: CLIENT_EXPORT_NAME)
  // NEVER import from barrel — it re-exports server.ts (next/headers)
```

---

## ENVIRONMENT VARIABLES

```bash
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Server-only (Vercel env vars)
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL        # PgBouncer URL (port 6543, ?pgbouncer=true&connection_limit=1)
DIRECT_URL          # Direct connection (port 5432, for Prisma CLI / db:pull / studio)
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT

# Payment keys (Supabase Vault, not in Vercel)
MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY
```

---

## SCRIPTS

```bash
# Root (Turborepo)
pnpm dev / build / lint / typecheck / test / format

# apps/web
pnpm --filter @comtammatu/web dev|build|lint|typecheck

# packages/database
pnpm --filter @comtammatu/database db:generate   # Generate Prisma client
pnpm --filter @comtammatu/database db:pull       # Pull schema from Supabase
pnpm --filter @comtammatu/database db:types      # Generate Supabase TS types
pnpm --filter @comtammatu/database db:studio     # Prisma Studio
```

---

## RATE LIMITS (Upstash Redis)

| Limiter           | Limit  | Window | Used by                       |
| ----------------- | ------ | ------ | ----------------------------- |
| `authLimiter`     | 5 req  | 60s    | Login (by IP)                 |
| `apiLimiter`      | 30 req | 60s    | Authenticated API endpoints   |
| `webhookLimiter`  | 10 req | 60s    | Momo IPN webhook (by IP)      |
| `paymentLimiter`  | 10 req | 60s    | `processPayment` (by user ID) |
| `orderLimiter`    | 20 req | 60s    | `createOrder` (by user ID)    |
| `campaignLimiter` | 3 req  | 300s   | `sendCampaign` (by user ID)   |

### Account Lockout

- 5 failed login attempts → 15-minute lockout (by email)
- Stored in Redis via `checkAccountLockout()` / `recordFailedLogin()` / `clearFailedLogins()`
- Cleared on successful login

### Security Headers (next.config.ts)

- CSP: `unsafe-eval` only in dev, `object-src 'none'`, `upgrade-insecure-requests`
- HSTS: 2 years + includeSubDomains + preload
- COOP: `same-origin`, CORP: `same-origin`
- X-XSS-Protection: `0` (rely on CSP instead)

---

## REALTIME CONVENTIONS

- Always scoped to `branch_id` + `tenant_id`
- Channel naming: `branch:{branch_id}`
- RLS filters automatically
- Hooks: `use-realtime-orders.ts`, `use-realtime-tables.ts`, `use-realtime-broadcast.ts`, `use-kds-realtime.ts`
- **Critical:** `postgres_changes` payloads don't include JOIN relations. Preserve existing joined fields during UPDATE merges.

---

## AGENT SKILLS MAP

### Always load for this stack:

- `supabase-postgres-best-practices` — any DB/schema/RLS task
- `nextjs-supabase-auth` — auth flows, middleware, session handling
- `next-best-practices` — any Next.js route/RSC/Server Action work
- `clean-code` — every coding task

### By domain:

| Domain                | Skills                                                                               |
| --------------------- | ------------------------------------------------------------------------------------ |
| Database schema/RLS   | `supabase-postgres-best-practices` + `database-design:postgresql`                    |
| Admin UI tabs         | `next-best-practices` + `ui-design:web-component-design`                             |
| Customer PWA          | `next-best-practices` + `ui-design:accessibility-compliance`                         |
| Complex SQL/reporting | `data:sql-queries`                                                                   |
| CI/CD                 | `cicd-automation:github-actions-templates`                                           |
| Testing               | `engineering:testing-strategy` + `javascript-typescript:javascript-testing-patterns` |
| Documentation         | `engineering:documentation`                                                          |

---

## POST-MVP BACKLOG (Updated 2026-03-13)

```text
All priorities AND all refactoring waves completed.

Refactoring Waves (code quality):
- [x] Wave 1: Code org (16 sub-modules), error boundaries, DB indexes
- [x] Wave 2: React Query + Zustand + DB transaction RPCs
- [x] Wave 3: Structured logging, optimistic updates, 502 unit tests
- [x] Wave 4: CSP hardening, account lockout, rate limiting expansion, security E2E
- [x] Wave 5: UI package consolidation (@comtammatu/ui), WCAG accessibility audit (i18n skipped — chỉ phục vụ nội địa)
- [x] Wave 6: CQRS materialized views (7 MVs), integration tests (8 test files)

Remaining minor items:
- [ ] Composite UI components: DataTable, StatusBadge, ConfirmDialog, StatCard (Wave 5 stretch)
- [ ] Integration tests in CI (needs SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY secrets in GitHub Actions)
- [ ] Delete redundant monolithic actions.ts files (campaigns, crm, hr, menu, employee)
```

---

## MIGRATION PATH (When Scaling)

| Trigger             | Action                        | Effort    |
| ------------------- | ----------------------------- | --------- |
| > 10 branches       | Extract POS module            | 2-3 weeks |
| > 50 concurrent POS | Dedicated Fastify POS backend | 3-4 weeks |
| > 100K customers    | Extract CRM + Elasticsearch   | 2-3 weeks |
| > 10K orders/day    | CQRS + read replicas          | 3-4 weeks |
| Multi-region        | K8s + multi-region Supabase   | 6-8 weeks |

---

## GIT HISTORY (Milestones)

| Milestone | Description                                                                        |
| --------- | ---------------------------------------------------------------------------------- |
| Week 1-2  | Foundation — auth, admin layout, menu CRUD                                         |
| Week 3-4  | Split POS, Orders, KDS & Cash Payment                                              |
| Week 5-6  | Inventory, HR, Dashboard, Security                                                 |
| Week 7-8  | CRM, Privacy API, Customer PWA                                                     |
| Sprint 1  | Payment hardening (Momo), device approval, security hardening, accessibility       |
| Sprint 2  | Loading states (24), error boundaries (23), rate limiting, Zod v4 fixes            |
| Sprint 3  | Menu restructure (categories, sides, notes), device fingerprinting                 |
| Sprint 4  | Payroll module, branch comparison dashboard, E2E testing, advanced inventory       |
| Sprint 5  | POS offline (Service Worker + IndexedDB + sync queue)                              |
| Sprint 6  | Campaign management, customer online ordering, multi-branch analytics, forecasting |
| Sprint 7  | GDPR retention cron, auto-tier loyalty upgrade                                     |
| Sprint 8  | Inventory alerts, ESC/POS kitchen printing, table management                       |
| Sprint 9  | Web Push notifications (VAPID), performance optimization (dynamic imports, ISR)    |
| Wave 1-4  | Code splitting, React Query/Zustand, logging/tests, security hardening             |
| Wave 5-6  | UI package consolidation, WCAG audit, CQRS materialized views, integration tests   |

See `git log --oneline` for full commit history.
