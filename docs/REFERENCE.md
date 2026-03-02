# REFERENCE.md — Full Technical Reference

> Moved from CLAUDE.md to keep the boot file short. This file is for deep dives, not boot reads.

---

## DEPENDENCIES (Key packages)

### apps/web
- `next@^16.1.0`, `react@^19.1.0`, `@supabase/supabase-js@^2.49.0`, `@supabase/ssr@^0.8.0`
- `tailwindcss@^4.2.1`, shadcn/ui (new-york style, 24 components)
- `sonner@^2.0.7` (toasts), `zod@^3.24.0`, `vaul` (drawer), `next-themes@^0.4.6`

### packages/database
- `prisma@^7.2.0`, `@prisma/client@^7.2.0`, `@prisma/adapter-pg@^7.2.0`, `pg@^8.13.0`
- Generated client at: `packages/database/generated/prisma/client/` (git-ignored, must `db:generate`)

### packages/shared
- `zod@^3.24.0` only — 11 schema files, constants, formatters

---

## DATABASE CONVENTIONS

| Item | Rule |
| ---- | ---- |
| Primary keys | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| Text | `TEXT` (never VARCHAR) |
| Timestamps | `TIMESTAMPTZ` (never TIMESTAMP) |
| Money totals | `NUMERIC(14,2)` |
| Unit prices | `NUMERIC(12,2)` |
| Cost prices | `NUMERIC(12,4)` |
| Money | NEVER FLOAT |
| Enums | `TEXT` + `CHECK` constraint (not PG ENUM type) |
| Multi-tenant | `(tenant_id, field)` composite unique |
| FK indexes | On every foreign key column |
| JSONB | GIN index |
| Idempotency | `UUID NOT NULL UNIQUE` on orders + payments |
| Concurrency | `version INT` on `stock_levels` (optimistic locking) |
| Audit tables | `REVOKE UPDATE, DELETE` on `audit_logs`, `security_events` |

### Key Tables (v2.2 schema)
```
tenants → branches → tables
profiles (maps to auth.users via trigger, role + tenant_id + branch_id)
pos_terminals → pos_sessions
menu_items, menu_categories, modifiers, modifier_groups
orders → order_items → payments
kds_stations → kds_tickets
ingredients → recipes → stock_levels → stock_movements
customers → loyalty_tiers → loyalty_transactions
audit_logs, security_events (append-only)
```

### Migrations location: `supabase/migrations/`
- `20260228000000_initial_schema.sql` — v2.1 base (1,782 lines)
- `20260228000001_fix_security_advisors.sql`
- `20260228000002_schema_v2_2.sql` — junction tables, indexes
- `20260228000003_profile_trigger.sql` — auto-create profile
- `20260228100000_pos_kds_functions.sql` — order_number gen, KDS triggers

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
  import { createBrowserClient } from '@comtammatu/database/src/supabase/client'
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

# Payment keys (Supabase Vault, not in Vercel)
VNPAY_TMN_CODE / VNPAY_HASH_SECRET
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

## RATE LIMITS (Planned via Upstash Redis)

| Endpoint | Limit | Window |
| -------- | ----- | ------ |
| Login/Auth | 5 req | 15 min |
| GET queries | 100 req | 1 min |
| POST/PUT/DELETE | 30 req | 1 min |
| Customer app | 20 req | 1 min |
| Bulk exports | 5 req | 1 hour |
| Payment webhooks | 1000 req | 1 min |

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
| Domain | Skills |
| ------ | ------ |
| Database schema/RLS | `supabase-postgres-best-practices` + `database-design:postgresql` |
| Admin UI tabs | `next-best-practices` + `ui-design:web-component-design` |
| Customer PWA | `next-best-practices` + `ui-design:accessibility-compliance` |
| Complex SQL/reporting | `data:sql-queries` |
| CI/CD | `cicd-automation:github-actions-templates` |
| Testing | `engineering:testing-strategy` + `javascript-typescript:javascript-testing-patterns` |
| Documentation | `engineering:documentation` |

---

## POST-MVP BACKLOG

```
Priority 1 (Core):
- [ ] VNPay/Momo payment integration (webhooks, HMAC verification)
- [ ] Stock auto-deduction on order completion (DB trigger)
- [ ] Voucher redemption at POS during order creation
- [ ] Retention cron jobs (auto-delete after 30-day grace period)

Priority 2 (Operations):
- [ ] Charts/graphs for admin dashboard (recharts or similar)
- [ ] Payroll calculations (HR module)
- [ ] Attendance clock-in/clock-out (QR scan)
- [ ] Auto-tier upgrade triggers for loyalty

Priority 3 (Quality):
- [ ] E2E testing (Playwright)
- [ ] RLS validation test suite
- [ ] API documentation
- [ ] Offline support (Service Worker, IndexedDB, AES-256-GCM)
- [ ] Campaigns & notifications (email/SMS/push)
- [ ] Receipt printing + peripheral config
```

---

## MIGRATION PATH (When Scaling)

| Trigger | Action | Effort |
| ------- | ------ | ------ |
| > 10 branches | Extract POS module | 2-3 weeks |
| > 50 concurrent POS | Dedicated Fastify POS backend | 3-4 weeks |
| > 100K customers | Extract CRM + Elasticsearch | 2-3 weeks |
| > 10K orders/day | CQRS + read replicas | 3-4 weeks |
| Multi-region | K8s + multi-region Supabase | 6-8 weeks |

---

## GIT HISTORY

```
244fa73 feat: complete Week 7-8 — CRM Admin, Customer PWA, GDPR Privacy
0c9f776 feat: complete Week 5-6 — Inventory, HR, Dashboard, Security
a629b37 fix(lint): resolve React purity violations and unused vars
3c1c1ca fix(ci): Turborepo typecheck must depend on own build task
d7042d4 fix(ci): resolve Prisma DIRECT_URL crash in CI/Vercel builds
8adbbf7 feat: complete Week 3-4 — Split POS, Orders, KDS & Cash Payment
8b48166 feat: complete Week 1-2 foundation — auth, admin layout, menu CRUD
```
