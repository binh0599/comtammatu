# Com Tấm Mã Tú — F&B CRM Platform

A multi-tenant, multi-branch restaurant management platform built for the **Com Tấm Mã Tú** chain. Covers the full service lifecycle: order management, kitchen display, cashier & payment, inventory, loyalty, HR, and admin reporting — all in one codebase.

**Live:** [comtammatu.vercel.app](https://comtammatu.vercel.app)

---

## Overview

The system is split into four distinct UIs served from a single Next.js application:

| Interface | Path | Who uses it |
|---|---|---|
| **Admin Panel** | `/admin` | Owner, Manager |
| **POS Terminal** | `/pos` | Cashier, Waiter |
| **Kitchen Display (KDS)** | `/kds/:stationId` | Chef |
| **Customer PWA** | `/customer` | Guests |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 App Router · React 19.1 · TypeScript 5.9 strict |
| Database | Supabase (PostgreSQL) · Prisma 7.2 · `@prisma/adapter-pg` |
| Auth | Supabase Auth · `@supabase/ssr@0.8.0` — cookie-based sessions |
| UI | shadcn/ui (new-york) · Tailwind CSS v4.2 · Lucide React |
| Monorepo | Turborepo 2.8 · pnpm 9.15.0 workspaces |
| Hosting | Vercel · GitHub Actions CI |

---

## Repository Structure

```
.
├── apps/
│   └── web/                        # Next.js application
│       └── app/
│           ├── (admin)/admin/       # Admin routes (dashboard, menu, HR, CRM, inventory…)
│           ├── (pos)/pos/           # POS routes (orders, cashier, session)
│           ├── (kds)/kds/           # Kitchen Display routes
│           ├── (customer)/customer/ # Customer PWA (menu, orders, loyalty, feedback)
│           ├── login/               # Auth pages + actions
│           └── api/                 # Route handlers (privacy/GDPR)
│
├── packages/
│   ├── database/                   # Prisma client, Supabase helpers (server/client/middleware)
│   ├── shared/                     # Zod schemas + constants (no runtime dependencies)
│   ├── security/                   # Security utilities (stub)
│   └── ui/                         # Shared UI components (stub)
│
├── supabase/
│   └── migrations/                 # SQL migration history
│
└── tasks/
    ├── todo.md                     # Current sprint progress
    ├── regressions.md              # Rules derived from past failures
    └── lessons.md                  # Patterns + prevention notes
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm 9.15.0 (`npm install -g pnpm@9.15.0`)
- A Supabase project with the migrations applied
- A Vercel project (optional, for deployment)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create `apps/web/.env.local` (never commit this file):

```bash
# Public
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Server-only
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1   # PgBouncer (port 6543)
DIRECT_URL=postgresql://...                                         # Direct (port 5432)

# Optional — rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional — error tracking
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Payment keys are stored in Supabase Vault, not here
```

### 3. Generate the Prisma client

```bash
pnpm --filter @comtammatu/database db:generate
```

### 4. Apply migrations

```bash
supabase db push
```

### 5. Start the dev server

```bash
pnpm dev
# → http://localhost:3000
```

---

## Key Scripts

```bash
# Development
pnpm dev                                          # All apps in parallel (Turborepo)
pnpm --filter @comtammatu/web dev                 # Web app only

# Quality
pnpm lint
pnpm typecheck
pnpm test
pnpm format

# Database
pnpm --filter @comtammatu/database db:generate    # Regenerate Prisma client
pnpm --filter @comtammatu/database db:pull        # Pull schema from Supabase
pnpm --filter @comtammatu/database db:types       # Generate Supabase TypeScript types
pnpm --filter @comtammatu/database db:studio      # Open Prisma Studio

# Build
pnpm build
```

---

## Architecture Highlights

### Multi-tenant & Multi-branch

Every row in the database carries `tenant_id` and usually `branch_id`. All queries and Server Actions validate ownership before use — receiving an entity ID from the client is never trusted at face value.

### Role-Based Access Control

Eight roles with a strict hierarchy:

```
owner > manager > cashier > chef > waiter > inventory > hr > customer
```

The `/admin` layout enforces `owner | manager` server-side. POS and KDS routes carry their own auth guards.

### Order Lifecycle

```
Waiter creates order
  → KDS receives ticket in real-time (Supabase Realtime, scoped to branch)
  → Chef marks items ready / bumps ticket
  → Cashier selects payment method and processes payment
  → Order moves to "completed"
```

Terminal type enforcement: only `cashier_station` terminals can process payments — verified server-side on every payment action.

### Import Tiers

```
RSC / Server Actions  → import from '@comtammatu/database' (full barrel)
Middleware / Edge     → import from '@comtammatu/database/src/supabase' (no Prisma)
Client components     → import from '@comtammatu/database/src/supabase/client' only
```

Violating these tiers causes runtime crashes (`next/headers` in Edge, Prisma in the browser). The rule is enforced via `CLAUDE.md` hard boundaries.

### Database Conventions

- Primary keys: `BIGINT GENERATED ALWAYS AS IDENTITY`
- Text: always `TEXT` (no `VARCHAR`)
- Timestamps: always `TIMESTAMPTZ`
- Money totals: `NUMERIC(14,2)` · prices: `NUMERIC(12,2)` — never `FLOAT`
- RLS policies on every table, no exceptions
- `audit_logs` and `security_events` are append-only (`REVOKE UPDATE, DELETE`)
- Card/payment data is never stored (PCI DSS SAQ A)

---

## Feature Modules

### Admin Panel (`/admin`)
- Dashboard with revenue charts, order stats, top items
- Menu management (categories, items, modifiers)
- Inventory & stock level tracking
- HR — employee profiles, auth account provisioning
- CRM — customer database, loyalty tiers, vouchers
- Payment management
- KDS station configuration
- POS terminal management
- Security event log

### POS (`/pos`)
- Session management (open/close terminal)
- Order creation and item selection
- Real-time order status board
- Cashier — payment processing (cash, Momo; VNPay upcoming)
- Voucher redemption

### Kitchen Display System (`/kds/:stationId`)
- Real-time ticket board per station
- Item-level ready bumping
- Ticket completion

### Customer PWA (`/customer`)
- Menu browsing
- Order placement & status tracking
- Loyalty points and tier status
- Feedback submission
- Account management

---

## Payments

| Method | Status |
|---|---|
| Cash | ✅ Live |
| Momo | ✅ Live (HMAC webhook verification) |
| VNPay | 🔜 Planned (Priority 1) |

Payment credentials are stored in **Supabase Vault** — never in environment variables or the database.

---

## Roadmap

**Priority 1 — Core (Week 11–12)**
- VNPay integration with HMAC webhook verification
- Retention cron jobs (GDPR auto-delete after 30-day grace period)
- Auto loyalty-tier upgrade triggers
- Thermal receipt printing
- In-app + push notification system

**Priority 2 — Operations (Week 13–14)**
- Payroll calculations (HR module)
- Attendance clock-in/out via QR scan
- Branch comparison in dashboard
- Offline support (Service Worker, IndexedDB, AES-256-GCM)
- Device fingerprinting for terminal registration

**Priority 3 — Quality (Week 15–16)**
- Playwright end-to-end test suite
- RLS validation test suite
- OpenAPI documentation
- Upstash Redis rate limiting
- Peripheral configuration (printers, cash drawers)

---

## Documentation

| File | Contents |
|---|---|
| `CLAUDE.md` | AI agent boot instructions, hard boundaries, task contract template |
| `docs/REFERENCE.md` | Full dependency list, DB conventions, env vars, import strategy, agent skills map |
| `docs/TASK_TEMPLATES.md` | Pre-filled task contract templates by domain |
| `docs/SESSION_PROTOCOL.md` | Session rules and workflow |
| `tasks/regressions.md` | Rules derived from past failures |
| `tasks/lessons.md` | Patterns and prevention notes |
| `tasks/todo.md` | Current sprint progress |

---

## Contributing

1. Read `CLAUDE.md` and `tasks/regressions.md` before touching any code.
2. Fill in the Task Contract Template (Section IV of `CLAUDE.md`) before starting any task with 3+ steps.
3. Create a `git commit` checkpoint before starting work.
4. Run `pnpm typecheck && pnpm lint && pnpm build` before committing.
5. Never bypass the hard boundaries in `CLAUDE.md Section II`.

---

## License

Private — all rights reserved. © Com Tấm Mã Tú.
