# REFERENCE.md — Full Technical Reference

> Moved from CLAUDE.md to keep the boot file short. This file is for deep dives, not boot reads.
> Updated for V4.1 migration (2026-03-15).

---

## DEPENDENCIES (Key packages)

### apps/web

- `next@^16.1.0`, `react@^19.1.0`, `@supabase/supabase-js@^2.99.0`, `@supabase/ssr@^0.9.0`
- `tailwindcss@^4.2.1`, shadcn/ui (new-york style, 26 components via `@comtammatu/ui`)
- `sonner@^2.0.7` (toasts), `zod@^4.3.0`, `vaul` (drawer), `next-themes@^0.4.6`
- `@tanstack/react-query@^5`, `zustand@^5` (state management)
- `web-push` (VAPID push notifications), `recharts` (charts, dynamically imported)

### packages/database

- `prisma@^7.5.0`, `@prisma/client@^7.5.0`, `@prisma/adapter-pg@^7.5.0`, `pg@^8.20.0`
- Generated client at: `packages/database/generated/prisma/client/` (git-ignored, must `db:generate`)
- **V4.1 Decision:** Prisma CHỈ cho migrations. Query code dùng supabase-js.

### packages/shared

- `zod@^4.3.0` — 16 schema files, constants, formatters
- `server/logger.ts` — structured logging (JSON prod / pretty dev)
- `server/error-reporter.ts` — replaceable error reporting abstraction

### packages/ui

- 26 shadcn/ui primitives + `cn()` utility + `useIsMobile` hook
- Barrel export from `@comtammatu/ui`

### packages/security

- Upstash Redis rate limiting (6 limiters) + account lockout

---

## DATABASE CONVENTIONS

| Item | Rule |
|---|---|
| Primary keys | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| Text | `TEXT` (never VARCHAR) |
| Timestamps | `TIMESTAMPTZ` (never TIMESTAMP) |
| Money totals | `NUMERIC(14,2)` |
| Unit prices | `NUMERIC(12,2)` |
| Cost prices | `NUMERIC(12,4)` |
| Money | NEVER FLOAT |
| Enums | `TEXT` + `CHECK` constraint (not PG ENUM type) |
| Multi-tenant | `(brand_id, field)` composite unique (**V4.1: brand_id replaces tenant_id**) |
| FK indexes | On every foreign key column |
| JSONB | GIN index |
| Idempotency | `UUID NOT NULL UNIQUE` on orders + payments |
| Concurrency | `version INT` on `stock_levels` (optimistic locking) |
| Audit tables | `REVOKE UPDATE, DELETE` on `audit_logs`, `security_events` |

### Key Tables (Current V2 schema — pending V4.1 migration)

```
tenants → branches → tables  (V4.1: tenants becomes brands)
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

### V4.1 Target: 11 Database Schemas

| Schema | Tables |
|---|---|
| `core` | brands, branches, brand_members, profiles, audit_logs |
| `pos` | pos_terminals, pos_sessions, printers |
| `orders` | orders, order_items, order_status_history, delivery_orders |
| `payments` | payments, refunds, settlement_batches, payment_webhooks |
| `inventory` | ingredients, recipes, recipe_ingredients, stock_levels, stock_movements, stock_transfers, waste_logs, purchase_orders |
| `menu` | menus, menu_items, categories, menu_branch_assignments |
| `crm` | customers, loyalty_tiers, loyalty_transactions, campaigns, segments, zalo_followers, zalo_oa_configs |
| `hr` | staff, shifts, payroll_periods, payroll_entries, payroll_si_breakdown |
| `einvoice` | einvoices, einvoice_configs, einvoice_providers |
| `delivery` | delivery_platforms, platform_menu_mappings, platform_orders |
| `billing` | subscriptions, billing_events, invoices, promo_codes |

### Materialized Views (CQRS — refreshed daily 2:30 AM UTC)

```
Current (V2):
mv_daily_revenue, mv_daily_payment_methods, mv_daily_order_type_mix
mv_item_popularity, mv_staff_performance, mv_inventory_usage, mv_peak_hours

V4.1 additions (Sprint 2–4):
daily_branch_financials, delivery_platform_perf, customer_rfm_scores
food_cost_avt, labor_cost_metrics, menu_bcg_matrix, platform_metrics
```

### Migrations location: `supabase/migrations/`

36 migrations applied (V2). V4.1 migrations will continue in same directory.

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

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT

# V4.1: Payment keys in Supabase Vault (NOT in env vars)
# PayOS: clientId, apiKey, checksumKey — per brand_id
# VNPay: tmnCode, hashSecret — per brand_id
# Zalo OA: oa_id, access_token — per brand_id
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

| Limiter | Limit | Window | Used by |
|---|---|---|---|
| `authLimiter` | 5 req | 60s | Login (by IP) |
| `apiLimiter` | 30 req | 60s | Authenticated API endpoints |
| `webhookLimiter` | 10 req | 60s | Payment webhooks (by IP) |
| `paymentLimiter` | 10 req | 60s | `processPayment` (by user ID) |
| `orderLimiter` | 20 req | 60s | `createOrder` (by user ID) |
| `campaignLimiter` | 3 req | 300s | `sendCampaign` (by user ID) |

### Account Lockout

- 5 failed login attempts → 15-minute lockout (by email)
- Cleared on successful login

---

## REALTIME CONVENTIONS

- **V4.1:** Scoped to `brand_id + branch_id` (was `tenant_id + branch_id`)
- Channel naming: `branch:{branch_id}`
- RLS filters automatically
- Hooks: `use-realtime-orders.ts`, `use-realtime-tables.ts`, `use-realtime-broadcast.ts`, `use-kds-realtime.ts`
- **Critical:** `postgres_changes` payloads don't include JOIN relations. Preserve existing joined fields during UPDATE merges.

### V4.1 Target Realtime Channels

| Channel | Event | Receiver |
|---|---|---|
| `kitchen:[branchId]:[stationId]` | INSERT order_items | KDS station |
| `orders:[branchId]` | UPDATE status | POS terminal |
| `payments:[orderId]` | UPDATE status | POS cashier |
| `tables:[branchId]` | UPDATE status | Host / manager |
| `delivery:[branchId]` | INSERT orders | Branch manager |
| `stock_alerts:[branchId]` | pg_cron trigger | Branch manager |

---

## AGENT SKILLS MAP

### gstack — Development Workflow Skills

| Skill | Role | Purpose |
|---|---|---|
| `/plan-ceo-review` | Founder/CEO | Product-level plan review |
| `/plan-eng-review` | Engineering Mgr | Architecture, data flow, edge cases |
| `/review` | Staff Engineer | Find production bugs |
| `/ship` | Release Engineer | Sync, test, push, PR |
| `/browse` | QA Engineer | Headless browser testing |
| `/qa` | QA Lead | Systematic QA testing |
| `/setup-browser-cookies` | Session Manager | Import cookies for auth testing |
| `/retro` | Engineering Mgr | Retrospectives |

**Rule:** Always use `/browse` for web browsing. Never use `mcp__Claude_in_Chrome__*` tools.

### Connected Services (MCP)

| Service | Status | Use case |
|---|---|---|
| Supabase | Connected | Database, Auth, Edge Functions, Realtime |
| Vercel | Connected | Deploy, hosting, build logs |
| Figma | Connected | Design files, screenshots |

---

## V4.1 API Architecture — 3 Tầng

| Tier | Method | Use case |
|---|---|---|
| PostgREST | Auto CRUD + RLS | Standard queries, filters, joins |
| RPC Functions | `supabase.rpc()` | Business logic: close_pos_session, calculate_rfm, etc. |
| Edge Functions | Deno serverless | External APIs: PayOS, E-invoice, GrabFood, Zalo |

---

## GIT HISTORY (Milestones)

| Milestone | Description |
|---|---|
| Week 1-2 | Foundation — auth, admin layout, menu CRUD |
| Week 3-4 | Split POS, Orders, KDS & Cash Payment |
| Week 5-6 | Inventory, HR, Dashboard, Security |
| Week 7-8 | CRM, Privacy API, Customer PWA |
| Sprint 1-9 | Payment, offline, campaigns, analytics, push notifications |
| Wave 1-6 | Code splitting, React Query/Zustand, security, WCAG, CQRS |
| **V4.1 Pre-Sprint** | **CI fix, brand_id migration, nav-config** |

See `git log --oneline` for full commit history.
