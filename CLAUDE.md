# CLAUDE.md — F&B CRM System (Com Tam Ma Tu)

> Boot file for AI assistants. Read this FIRST at the start of every session.
> Then follow the Session Boot Sequence (Section XI) before beginning any work.

---

## I. PROJECT STATUS

**Phase: SCAFFOLDED — Ready for Active Development**

The monorepo is fully initialized with configuration, CI/CD, and stub structure. All domain modules, packages, and route groups exist as placeholders. No business logic, database schema, or UI has been implemented yet.

| Aspect                            | Status                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| Architecture specification (v2.2) | Complete (`docs/F&B_CRM_Lightweight_Architecture_v2.2.md`) — performance & budget optimized |
| Development Roadmap               | Complete (`docs/ROADMAP.md`) — timeline, milestones, migration path            |
| Project Operating System          | Complete (`docs/PROJECT_OPERATING_SYSTEM_ENGLISH.md`)                    |
| AI boot file (this file)          | Complete                                                                 |
| Git repository                    | Initialized (main branch)                                                |
| Monorepo scaffolding              | Complete (Turborepo + pnpm workspaces)                                   |
| CI/CD pipeline                    | Complete (`.github/workflows/ci.yml`)                                    |
| Next.js app shell                 | Scaffolded (route groups + health endpoint only)                         |
| Domain modules                    | 10 stubs created, no implementation                                      |
| Shared packages                   | 4 packages created, no implementation                                    |
| Database schema                   | Not created (no Prisma schema, no migrations)                            |
| Supabase project                  | config.toml exists, not linked to remote                                 |
| Vercel project                    | Not linked                                                               |
| shadcn/ui                         | Not installed                                                            |
| Agent skills                      | 4 project-level + 70+ platform skills mapped (Section XIX)               |
| tasks/ directory                  | Created with empty tracking files                                        |

**Current file count:** ~43 files (mostly config + stubs + documentation)

---

## II. PROJECT OVERVIEW

**F&B CRM System** — Lightweight architecture for a Vietnamese restaurant chain (5-10 branches).

| Attribute        | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Pattern          | Modular Monolith (single Next.js app, domain modules internally)            |
| Stack            | Next.js 16.1 (App Router) + Supabase + Vercel + TypeScript 5.7 + Prisma 7.2 |
| Monorepo         | Turborepo 2.8 with pnpm 9.15.0                                              |
| UI               | shadcn/ui components (not yet installed)                                    |
| Cost target      | $46/month (base)                                                            |
| Team size        | 2-3 developers                                                              |
| Time to MVP      | 4-6 weeks (8-week roadmap)                                                  |
| Architecture doc | `docs/F&B_CRM_Lightweight_Architecture_v2.2.md` (source of truth)           |
| Roadmap          | `docs/ROADMAP.md` (timeline, milestones, migration path)                    |

---

## III. ACTUAL PROJECT STRUCTURE

```
comtammatu/
├── apps/web/                          # Next.js 16.1 app (@comtammatu/web)
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (lang="vi")
│   │   ├── page.tsx                   # Home page (placeholder)
│   │   ├── (admin)/layout.tsx         # Admin route group (empty)
│   │   ├── (pos)/layout.tsx           # POS route group (empty)
│   │   ├── (kds)/layout.tsx           # KDS route group (empty)
│   │   ├── (customer)/layout.tsx      # Customer route group (empty)
│   │   └── api/health/route.ts        # Health check endpoint (working)
│   ├── next.config.ts                 # Transpiles workspace packages
│   ├── package.json                   # Next 16.1, React 19.1, Supabase
│   └── tsconfig.json                  # Extends root, Next.js plugin
├── modules/                           # Domain modules (all export-only stubs)
│   ├── auth/index.ts                  # Authentication & RBAC
│   ├── terminals/index.ts             # Terminal registration
│   ├── pos/index.ts                   # POS sessions, payments
│   ├── orders/index.ts                # Order lifecycle
│   ├── kds/index.ts                   # Kitchen display routing
│   ├── inventory/index.ts             # Stock, recipes, suppliers
│   ├── hr/index.ts                    # Employees, shifts, payroll
│   ├── crm/index.ts                   # Customers, loyalty
│   ├── privacy/index.ts               # GDPR deletion, export
│   └── reports/index.ts               # Analytics, reporting
├── packages/
│   ├── database/                      # @comtammatu/database (Prisma 7.2)
│   │   ├── package.json               # prisma + @prisma/client
│   │   ├── src/index.ts               # Export stub
│   │   └── tsconfig.json
│   ├── shared/                        # @comtammatu/shared (Zod 3.24)
│   │   ├── package.json               # zod
│   │   ├── src/index.ts               # Export stub
│   │   └── tsconfig.json
│   ├── security/                      # @comtammatu/security (Upstash)
│   │   ├── package.json               # @upstash/ratelimit, @upstash/redis
│   │   ├── src/index.ts               # Export stub
│   │   └── tsconfig.json
│   └── ui/                            # @comtammatu/ui (React 19.1)
│       ├── package.json               # react, react-dom
│       ├── src/index.ts               # Export stub
│       └── tsconfig.json
├── supabase/
│   ├── config.toml                    # Local dev config (not linked)
│   ├── functions/.gitkeep             # Edge Functions (empty)
│   ├── migrations/.gitkeep            # SQL migrations (empty)
│   ├── tests/.gitkeep                 # RLS tests (empty)
│   └── seed.sql                       # Seed data (empty template)
├── .github/workflows/ci.yml           # CI: typecheck, lint, test, secrets, audit
├── tasks/                             # Task tracking (Operating System)
│   ├── todo.md                        # Current plan & progress
│   ├── regressions.md                 # Named failure rules (empty)
│   ├── lessons.md                     # Learning log (empty)
│   ├── friction.md                    # Contradiction tracker (empty)
│   └── predictions.md                 # Prediction log (empty)
├── docs/
│   ├── F&B_CRM_Lightweight_Architecture_v2.2.md  # Architecture spec (source of truth)
│   ├── ROADMAP.md                                # Development roadmap & migration path
│   ├── PROJECT_OPERATING_SYSTEM_ENGLISH.md       # Workflow rules
│   └── README.md                      # Minimal
├── .agents/skills/                    # Project-level AI agent skills
│   ├── supabase-postgres-best-practices/  # Postgres optimization (Supabase)
│   ├── nextjs-supabase-auth/              # Auth integration patterns
│   ├── next-best-practices/               # Next.js conventions & RSC
│   └── clean-code/                        # Clean Code principles
├── CLAUDE.md                          # This file
├── package.json                       # Root workspace (Turborepo)
├── pnpm-workspace.yaml                # apps/*, packages/*, modules/*
├── turbo.json                         # Build orchestration
├── tsconfig.json                      # Root TS config (strict, ES2022)
├── .env.example                       # Environment variable template
├── .gitignore                         # 59 rules
├── .npmrc                             # pnpm config
└── .pre-commit-config.yaml            # detect-secrets v1.4.0
```

---

## IV. INSTALLED DEPENDENCIES

### Root

| Package    | Version | Purpose                      |
| ---------- | ------- | ---------------------------- |
| turbo      | ^2.8.0  | Monorepo build orchestration |
| typescript | ^5.7.0  | Type system                  |
| prettier   | ^3.4.0  | Code formatting              |

### apps/web (@comtammatu/web)

| Package               | Version | Purpose                           |
| --------------------- | ------- | --------------------------------- |
| next                  | ^16.1.0 | Framework (App Router, Turbopack) |
| react                 | ^19.1.0 | UI library                        |
| react-dom             | ^19.1.0 | React DOM renderer                |
| @supabase/supabase-js | ^2.49.0 | Supabase client                   |
| @supabase/ssr         | ^0.6.0  | Supabase SSR utilities            |
| eslint                | ^9.0.0  | Linting                           |
| eslint-config-next    | ^16.1.0 | Next.js ESLint rules              |

### packages/database (@comtammatu/database)

| Package        | Version | Purpose                       |
| -------------- | ------- | ----------------------------- |
| @prisma/client | ^7.2.0  | Type-safe ORM client          |
| prisma         | ^7.2.0  | Schema management, migrations |

### packages/shared (@comtammatu/shared)

| Package | Version | Purpose                    |
| ------- | ------- | -------------------------- |
| zod     | ^3.24.0 | Runtime validation schemas |

### packages/security (@comtammatu/security)

| Package            | Version | Purpose                   |
| ------------------ | ------- | ------------------------- |
| @upstash/ratelimit | ^2.0.0  | Rate limiting             |
| @upstash/redis     | ^1.34.0 | Redis client (serverless) |

### packages/ui (@comtammatu/ui)

| Package   | Version | Purpose             |
| --------- | ------- | ------------------- |
| react     | ^19.1.0 | Component rendering |
| react-dom | ^19.1.0 | DOM rendering       |

### NOT YET INSTALLED (Planned)

- shadcn/ui (component library)
- Sentry (error monitoring)
- vitest (testing)
- Tailwind CSS (styling)

---

## V. WORKSPACE ALIASES

Defined in root `tsconfig.json` paths:

| Alias                  | Resolves to               |
| ---------------------- | ------------------------- |
| `@comtammatu/database` | `./packages/database/src` |
| `@comtammatu/shared`   | `./packages/shared/src`   |
| `@comtammatu/security` | `./packages/security/src` |
| `@comtammatu/ui`       | `./packages/ui/src`       |

All four are also listed in `apps/web/next.config.ts` → `transpilePackages`.

---

## VI. SCRIPTS

### Root (via Turborepo)

```bash
pnpm dev          # Start all workspaces in dev mode
pnpm build        # Build all workspaces
pnpm lint         # Lint all workspaces
pnpm typecheck    # Type-check all workspaces
pnpm test         # Run all tests
pnpm format       # Format with Prettier
pnpm format:check # Check formatting
```

### apps/web

```bash
pnpm --filter @comtammatu/web dev        # Next.js dev (Turbopack)
pnpm --filter @comtammatu/web build      # Next.js production build
pnpm --filter @comtammatu/web lint       # ESLint
pnpm --filter @comtammatu/web typecheck  # tsc --noEmit
```

### packages/database

```bash
pnpm --filter @comtammatu/database db:generate  # Generate Prisma client
pnpm --filter @comtammatu/database db:push      # Push schema to DB
pnpm --filter @comtammatu/database db:studio    # Open Prisma Studio
```

---

## VII. CORE DOMAIN CONCEPTS

### Split POS Model (Critical)

Two terminal types with different capabilities:

- **`mobile_order`** (Waiter's phone): Create/edit orders, select tables, track status. **CANNOT process payments.**
- **`cashier_station`** (Cashier's tablet/laptop): View orders, process payments, print receipts, open/close shifts.

### Order Flow

1. Waiter creates order on mobile (`pos_session_id = NULL`)
2. KDS receives order via Supabase Realtime -> kitchen cooks
3. Chef marks ready -> waiter notified -> serves food
4. Cashier processes payment -> links order to `pos_session` -> prints receipt

### Key Database Tables (to be created)

- `tenants` -> `branches` -> `tables` (multi-tenant, multi-branch)
- `profiles` (maps to auth.users, has role + tenant_id + branch_id)
- `pos_terminals` -> `pos_sessions` (device management, cash shifts)
- `orders` -> `order_items` -> `payments` (order lifecycle)
- `kds_stations` -> `kds_tickets` (kitchen display)
- `ingredients` -> `recipes` -> `stock_levels` -> `stock_movements` (inventory)
- `customers` -> `loyalty_tiers` -> `loyalty_transactions` (CRM)
- `audit_logs`, `security_events` (append-only, REVOKE UPDATE/DELETE)

### Roles (hierarchy: owner > manager > staff > customer)

`owner` | `manager` | `cashier` | `chef` | `waiter` | `inventory` | `hr` | `customer`

---

## VIII. DATABASE CONVENTIONS (MUST FOLLOW)

- **Identity:** `BIGINT GENERATED ALWAYS AS IDENTITY` (NOT SERIAL, NOT UUID for internal PKs)
- **Text:** `TEXT` (NOT VARCHAR) — PostgreSQL stores both identically
- **Timestamps:** `TIMESTAMPTZ` (NOT TIMESTAMP) — timezone-aware
- **Money:** `NUMERIC(14,2)` for totals, `NUMERIC(12,2)` for unit prices, `NUMERIC(12,4)` for cost prices — NEVER FLOAT
- **NOT NULL by default** for every column that should have a value
- **CHECK constraints** on every enum-like column (not relying on app code)
- **FK indexes** on every foreign key column
- **Composite uniqueness** using `(tenant_id, field)` pattern for multi-tenant
- **GIN indexes** for JSONB and array columns
- **Idempotency keys** (`UUID NOT NULL UNIQUE`) on `orders` and `payments`
- **Optimistic concurrency** via `version INT` on `stock_levels`
- **RLS on every table** — tenant isolation enforced at DB level

---

## IX. SECURITY RULES (NON-NEGOTIABLE)

1. **RLS everywhere** — Every table must have Row Level Security policies
2. **No card data** — PCI DSS SAQ A: card data NEVER touches our infrastructure
3. **Offline payments** — Only cash when offline; card/eWallet requires network
4. **Audit logs are append-only** — `REVOKE UPDATE, DELETE` on `audit_logs` and `security_events`
5. **Input validation** — Zod schemas for every API endpoint
6. **Generic errors** — Never reveal whether user exists (prevents enumeration)
7. **HMAC verification** — All payment webhooks verify signatures with timing-safe comparison
8. **MFA required** for owner, manager, admin roles
9. **Secrets** — Never commit secrets; use Vercel env vars + Supabase Vault
10. **Offline encryption** — AES-256-GCM with PBKDF2 600K iterations (SHA-256)
11. **Terminal-aware RLS** — Waiters cannot process payments; only cashier_station can

---

## X. CODING CONVENTIONS

### TypeScript

- Strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`)
- Target: ES2022, Module: ESNext, Resolution: bundler
- Zod for runtime validation on all API endpoints
- Prisma for type-safe database queries
- `@supabase/supabase-js` for client-side Supabase access

### API Routes (planned structure)

- Auth endpoints: `/api/auth/*` (no auth required)
- Webhooks: `/api/webhooks/*` (HMAC signature verification)
- Public: `/api/public/*` (optional auth)
- Everything else: `/api/*` (JWT required, RLS enforced)
- Health check: `/api/health` (exists, no auth)

### Rate Limits

| Endpoint         | Limit    | Window |
| ---------------- | -------- | ------ |
| Login/Auth       | 5 req    | 15 min |
| GET queries      | 100 req  | 1 min  |
| POST/PUT/DELETE  | 30 req   | 1 min  |
| Payment webhooks | 1000 req | 1 min  |
| Bulk exports     | 5 req    | 1 hour |
| Customer app     | 20 req   | 1 min  |

### Realtime Subscriptions

- Always scoped to user's `branch_id` and `tenant_id`
- Channel naming: `branch:{branch_id}`
- Filtered by RLS automatically

---

## XI. CI/CD PIPELINE

### GitHub Actions (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`/`staging`, PRs to `main`/`staging`
**Concurrency:** Cancel in-progress runs on same branch

**Jobs:**

1. **lint-typecheck-test** — pnpm install (frozen-lockfile) -> typecheck -> lint -> test
2. **secrets-scan** — TruffleHog v3.82.13 (verified secrets only)
3. **dependency-check** — `pnpm audit --audit-level=high` (continue-on-error)

**Not yet implemented:**

- Vercel deployment job
- SBOM generation (CycloneDX)
- RLS policy validation tests
- Integration tests

### Git Branching

- `main` — Production (auto-deploy to Vercel)
- `staging` — Staging environment
- `feature/*` — Feature branches (Vercel preview deployments)
- Branch protection: required reviews (1+), status checks must pass, no force push

### Pre-commit Hooks

- `detect-secrets` v1.4.0 (Yelp) with baseline file

---

## XII. DEVELOPMENT WORKFLOW

### Database Migrations

- Local: `supabase start` (Docker)
- Create: `supabase migration new <name>` -> write SQL
- Push: `supabase db push` (dev) / `supabase db push --linked` (production)
- Rollback: `supabase migration repair` + reverse migration

### Environment Variables

```
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Server-side only (Vercel env vars)
SUPABASE_SERVICE_ROLE_KEY
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN

# Payment keys (Supabase Vault, server-side only)
VNPAY_TMN_CODE / VNPAY_HASH_SECRET
MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY

# Local dev: .env.local (git-ignored)
```

### Connected Services

| Service  | Use                                               | Status                       |
| -------- | ------------------------------------------------- | ---------------------------- |
| Supabase | Database, Auth, Realtime, Storage, Edge Functions | config.toml only, not linked |
| Vercel   | Hosting, CDN, serverless functions, deployments   | Not linked                   |
| GitHub   | Source control, CI/CD via Actions                 | Active                       |

---

## XIII. WORKFLOW OPERATING SYSTEM

> Integrated from `docs/PROJECT_OPERATING_SYSTEM_ENGLISH.md`. Follow these phases for every task.

### Core Principles

1. **Simplicity First** — Every change as simple as possible. No hacky fixes. Find root cause.
2. **Plan Before Build** — Tasks with 3+ steps or architectural decisions -> Plan Mode first.
3. **Verify Before Done** — Never mark done without proving it works.
4. **Learning Compounds** — Every failure -> a new rule. Optimize across sessions.

### Task Execution Phases

**Phase 1: Receive Task**

1. Read & understand the requirement
2. Check `tasks/lessons.md` — any relevant lessons?
3. Check `tasks/regressions.md` — any rules to follow?
4. Assess complexity -> Simple (execute directly) | Complex (Plan Mode)

**Phase 2: Plan Mode (for complex tasks)**

1. Write detailed plan to `tasks/todo.md`
2. Confirm plan with user before starting
3. Break into independent sub-tasks if needed
4. Write prediction: "I predict X will happen"

**Phase 3: Build**

1. Execute step by step, mark complete in todo.md
2. Each step -> explain high-level changes
3. If contradiction with previous instruction -> log in `tasks/friction.md`, surface to user
4. If bug found -> self-fix, no hand-holding

**Phase 4: Verify & Deliver**

1. Run tests / demo correctness
2. Diff before-after behavior if relevant
3. Compare prediction vs actual outcome -> log Delta & Lesson
4. Update `tasks/todo.md` with review section

**Phase 5: Learn**

1. Correction from user? -> Update `tasks/lessons.md`
2. Failure occurred? -> Add rule to `tasks/regressions.md`
3. Write rule to prevent the same mistake in the future

### Meta-Learning Files

| File                   | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `tasks/regressions.md` | One-line rules from serious failures. Check every session.  |
| `tasks/lessons.md`     | Pattern -> Rule -> Prevention. Updated on every correction. |
| `tasks/friction.md`    | Contradictions between instructions. Surface to user.       |
| `tasks/predictions.md` | Prediction -> Delta -> Lesson. Improves calibration.        |

### Quality Gates (Before Delivering)

- [ ] Does the code run? (test/demo)
- [ ] Is it as simple as possible? (simplicity check)
- [ ] Would a staff engineer approve? (quality check)
- [ ] Does it violate any rule in regressions.md? (regression check)
- [ ] Does prediction match reality? If not, log lesson (learning check)

---

## XIV. SESSION BOOT SEQUENCE

```
At the start of every new task:
1. Load this file (CLAUDE.md) -- already loaded if you're reading this
2. Check tasks/regressions.md -- any applicable rules?
3. Check tasks/lessons.md -- any relevant lessons?
4. Check tasks/friction.md -- any unresolved contradictions?
5. Identify relevant skills from Section XIX -- invoke before coding
6. Assess task complexity -> choose appropriate workflow
7. Begin execution
```

---

## XV. WHAT NEEDS TO BE BUILT NEXT

Per `tasks/todo.md`, the immediate next steps are:

```
Current Phase: Project Initialization (completing)
- [x] Create project file structure
- [ ] Run pnpm install to verify workspace resolution
- [ ] Initialize Supabase project (supabase link)
- [ ] Create initial database migration (v2.2 schema)
- [ ] Configure shadcn/ui in apps/web
- [ ] Set up ESLint + Prettier
- [ ] First Vercel deployment test
```

### Development Roadmap

**Week 1-2: Foundation + Security Baseline**

- Database: Schema (v2.2 DDL) + RLS policies + seed data + RLS validation tests
- Auth: Supabase Auth config, RBAC, MFA, login pages
- Security: Pre-commit hooks, CI pipeline
- Core UI: Layout, navigation, shadcn/ui components
- Menu Management: CRUD menu items, categories, modifiers

**Week 3-4: Split POS & Orders**

- Terminal Management, Mobile Order (Waiter), Cashier Station
- Payment: Cash + VNPay/Momo, Order Lifecycle, KDS, Offline support

**Week 5-6: Operations**

- Inventory, Suppliers, HR Basic, Admin Dashboard, Security Events

**Week 7-8: CRM, Privacy & Polish**

- CRM, Vouchers, Customer PWA, GDPR, Testing, Documentation

---

## XVI. ANTI-PATTERNS (NEVER DO)

### Code & Architecture

1. Store card/payment data in our DB — use provider tokenization only
2. Use SERIAL/UUID for internal PKs — use BIGINT GENERATED ALWAYS AS IDENTITY
3. Use VARCHAR — use TEXT
4. Use TIMESTAMP — use TIMESTAMPTZ
5. Use FLOAT for money — use NUMERIC
6. Skip RLS on any table
7. Allow mobile_order terminals to process payments
8. Store secrets in code — use env vars / Supabase Vault
9. Skip idempotency keys on orders/payments
10. Delete/update audit_logs or security_events

### Workflow

11. Build without planning (complex tasks need Plan Mode)
12. Mark tasks done without verification
13. Silently swallow contradictions — log in friction.md
14. Repeat past mistakes — always check regressions.md first
15. Over-engineer simple fixes — elegance for complex, simplicity for simple
16. Patch the surface — find root cause, no temporary patches
17. Ask user what you can self-fix — self-investigate, self-fix
18. Build loops that never close — a log nobody reads = doesn't exist

---

## XVII. GDPR & PRIVACY

- **Data retention:** Configured per data type (see architecture doc Section 11)
- **Right to erasure:** 30-day grace period, then anonymize orders + delete customer data
- **DSAR:** JSON/CSV export via `/api/privacy/data-export`
- **Audit log PII:** Hashed (SHA-256) before storage
- **Retention jobs:** Daily cron via Supabase Edge Function

---

## XVIII. MIGRATION PATH

When scaling beyond 10 branches, extract modules into standalone services:

| Trigger             | Action                          | Effort    |
| ------------------- | ------------------------------- | --------- |
| > 10 branches       | Extract POS module              | 2-3 weeks |
| > 50 concurrent POS | Dedicated POS backend (Fastify) | 3-4 weeks |
| > 100K customers    | Extract CRM + Elasticsearch     | 2-3 weeks |
| Complex payroll     | Extract HR/Payroll service      | 2-3 weeks |
| > 10K orders/day    | CQRS + read replicas            | 3-4 weeks |
| Multi-region        | K8s + multi-region Supabase     | 6-8 weeks |

---

## XIX. AGENT SKILLS REFERENCE

> Skills are specialized AI capabilities installed at the project level or available via platform plugins.
> **Always invoke the most relevant skill(s) before starting work on a task.**

### Project-Level Skills (`.agents/skills/`)

These 4 skills are installed directly in the repo and tailored to our stack:

| Skill | Trigger | When to Use |
| ----- | ------- | ----------- |
| `supabase-postgres-best-practices` | Writing/reviewing SQL, schema design, RLS policies, query optimization, connection pooling | **Every database task.** Schema migrations, RLS, indexes, seed data, query tuning. Aligns with Section VIII conventions. |
| `nextjs-supabase-auth` | Auth flows, login/signup pages, middleware auth, protected routes, session handling | **Auth module (Week 1-2).** Supabase Auth + Next.js App Router integration, cookie-based sessions, Server Actions for auth. |
| `next-best-practices` | Any Next.js code — routes, layouts, RSC boundaries, data fetching, metadata, error handling | **Every frontend task.** File conventions, async API patterns (Next.js 15+/16), route handlers, image/font optimization. |
| `clean-code` | Writing new code, reviewing PRs, refactoring, naming, function design | **Every code task.** Naming conventions, single responsibility, error handling, testability. |

### Platform Skills — Mapped to Roadmap Phases

#### Week 1-2: Foundation + Security Baseline

| Task | Primary Skill(s) | Notes |
| ---- | ---------------- | ----- |
| Database schema (v2.2 DDL) | `supabase-postgres-best-practices` + `database-design:postgresql` | Use both: project skill for Supabase-specific patterns, platform skill for general PG schema design (types, indexes, constraints, partitioning) |
| RLS policies + validation tests | `supabase-postgres-best-practices` + `engineering:testing-strategy` | RLS performance rules from project skill; test strategy for RLS validation suite |
| Auth: Supabase config, RBAC, MFA, login pages | `nextjs-supabase-auth` + `next-best-practices` | Project skill covers middleware auth, callback routes, cookie sessions |
| CI pipeline enhancements | `cicd-automation:github-actions-templates` | Extend existing `.github/workflows/ci.yml` with deployment, SBOM, RLS test jobs |
| Core UI: Layout, navigation, shadcn/ui | `next-best-practices` + `ui-design:design-system-patterns` + `ui-design:responsive-design` | Design tokens, component architecture, mobile-first for POS/KDS interfaces |
| Menu Management CRUD | `next-best-practices` + `javascript-typescript:typescript-advanced-types` | RSC data patterns, Zod schema typing, Server Actions |

#### Week 3-4: Split POS & Orders

| Task | Primary Skill(s) | Notes |
| ---- | ---------------- | ----- |
| Terminal Management + Mobile Order | `next-best-practices` + `ui-design:interaction-design` | Offline-capable PWA, touch interactions for waiter mobile |
| Cashier Station | `next-best-practices` + `ui-design:responsive-design` | Tablet/laptop layout, payment flow UI |
| Payment integration (VNPay/Momo) | `javascript-typescript:modern-javascript-patterns` | Async webhook handling, HMAC verification, idempotency |
| Order lifecycle + KDS Realtime | `supabase-postgres-best-practices` + `next-best-practices` | Supabase Realtime subscriptions, optimistic updates, RLS-filtered channels |
| Offline support | `javascript-typescript:modern-javascript-patterns` | Service workers, IndexedDB sync, AES-256-GCM encryption |

#### Week 5-6: Operations

| Task | Primary Skill(s) | Notes |
| ---- | ---------------- | ----- |
| Inventory module | `database-design:postgresql` + `supabase-postgres-best-practices` | Optimistic concurrency (version column), stock movement queries |
| Admin Dashboard + Reports | `data:build-dashboard` or `data:create-viz` | Interactive charts for revenue, orders, inventory levels |
| Security Events | `supabase-postgres-best-practices` | Append-only tables, audit trail queries, GIN indexes on JSONB |

#### Week 7-8: CRM, Privacy & Polish

| Task | Primary Skill(s) | Notes |
| ---- | ---------------- | ----- |
| CRM + Loyalty | `database-design:postgresql` | Customer segmentation queries, loyalty tier calculations |
| Customer PWA | `next-best-practices` + `ui-design:accessibility-compliance` | WCAG compliance for customer-facing app |
| GDPR/Privacy | `supabase-postgres-best-practices` | Data retention jobs, anonymization queries, Edge Functions |
| Testing & QA | `engineering:testing-strategy` + `javascript-typescript:javascript-testing-patterns` | Vitest setup, integration tests, E2E strategy |
| Documentation | `engineering:documentation` | API docs, architecture docs, onboarding guide |

### Cross-Cutting Skills (Use Anytime)

| Skill | When to Invoke |
| ----- | -------------- |
| `engineering:code-review` | Before merging any PR or completing a significant feature |
| `engineering:debug` | When encountering bugs — structured reproduce/isolate/diagnose/fix |
| `engineering:system-design` | When making architectural decisions (ADRs) |
| `javascript-typescript:typescript-advanced-types` | Complex generics, discriminated unions, Zod inference types |
| `javascript-typescript:modern-javascript-patterns` | Async patterns, error handling, functional patterns |
| `data:write-query` | Complex SQL queries, especially reporting and analytics |
| `ui-design:accessibility-compliance` | Any user-facing UI (WCAG 2.2 compliance) |
| `clean-code` | Every code task (naming, functions, error handling) |

### Future Migration Skills (Tier 3 — Not Needed Until Scale)

These become relevant when scaling beyond 10 branches (see Section XVIII):

| Skill | Trigger Condition |
| ----- | ----------------- |
| `backend-development:microservices-patterns` | > 10 branches, extracting POS module |
| `backend-development:architecture-patterns` | Moving to Clean/Hexagonal Architecture |
| `backend-development:cqrs-implementation` | > 10K orders/day, read replica separation |
| `backend-development:saga-orchestration` | Distributed transactions across extracted services |
| `cicd-automation:deployment-pipeline-design` | Multi-service deployment orchestration |
| `data-engineering:data-quality-frameworks` | Data warehouse, analytics pipeline at scale |

### Skill Invocation Rules

1. **Always check project-level skills first** — they're tuned to our exact stack
2. **Combine skills when tasks span domains** — e.g., database + auth for RLS policies
3. **Platform skills supplement, never override** — if project skill conflicts with platform skill, project skill wins
4. **Log skill gaps in `tasks/friction.md`** — if a skill gives bad advice for our setup, document it

---

_This is a living document. Update when project status changes, new lessons emerge, or architecture evolves._
