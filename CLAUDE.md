# CLAUDE.md — F&B CRM System (Com Tam Ma Tu)

> Boot file for AI assistants. Read this FIRST at the start of every session.
> Then follow the Session Boot Sequence (Section XI) before beginning any work.

---

## I. PROJECT STATUS

**Phase: WEEK 7-8 COMPLETE — MVP Delivered**

All 8 weeks of the roadmap are complete. The full F&B CRM system is functional: order lifecycle (waiter → KDS → chef → cashier → cash payment), operations management (dashboard, inventory, HR, security), CRM (customers, loyalty, vouchers, feedback), customer-facing PWA (menu, orders, loyalty, feedback, account), and GDPR privacy (data export, deletion requests). Post-MVP enhancements (payments, offline, testing, docs) are tracked in `tasks/todo.md`.

| Aspect                            | Status                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| Architecture specification (v2.2) | Complete (`docs/F&B_CRM_Lightweight_Architecture_v2.2.md`) — performance & budget optimized |
| Development Roadmap               | Complete (`docs/ROADMAP.md`) — timeline, milestones, migration path            |
| Project Operating System          | Complete (`docs/PROJECT_OPERATING_SYSTEM_ENGLISH.md`)                    |
| AI boot file (this file)          | Complete                                                                 |
| Git repository                    | Active (`main` branch, 11 commits)                                       |
| Monorepo scaffolding              | Complete (Turborepo + pnpm workspaces)                                   |
| CI/CD pipeline                    | Complete (`.github/workflows/ci.yml` + Prisma generate step)             |
| Next.js app shell                 | **Working** — 30 routes, auth, admin, POS, KDS, cashier, inventory, HR, security, CRM, customer PWA, privacy API |
| Domain modules                    | 10 stubs created (not yet used — logic lives in app routes)              |
| Shared packages                   | `database` implemented, `shared` implemented (11 Zod schema files + constants + formatters), `security` + `ui` are stubs |
| Database schema                   | **Complete** — 5 migrations, v2.2 with RLS + POS/KDS triggers           |
| Supabase project                  | **Linked** (project: `zrlriuednoaqrsvnjjyo`)                             |
| Vercel project                    | **Deployed** (`comtammatu.vercel.app`)                                   |
| shadcn/ui                         | **Installed** (new-york style, 24 components)                            |
| Tailwind CSS                      | **Installed** (v4.2.1 + design tokens + dark mode)                       |
| Auth module                       | **Working** — login, middleware, role-based routing, RBAC                 |
| Admin UI                          | **Working** — dashboard (real data), menu CRUD, terminal CRUD, KDS station CRUD, inventory (6 tabs), HR (5 tabs), security (2 tabs), CRM (4 tabs) |
| Customer PWA                      | **Working** — home, menu browse, orders, loyalty, feedback, account (6 pages + GDPR) |
| GDPR Privacy API                  | **Working** — data export, deletion requests (30-day grace period)        |
| POS (Waiter)                      | **Working** — table grid, menu selector, cart, order creation, order list |
| POS (Cashier)                     | **Working** — order queue, cash payment, session open/close              |
| KDS                               | **Working** — realtime board, ticket cards, bump system, timing colors   |
| Realtime                          | **Working** — 4 hooks (orders, tables, KDS tickets, broadcast)           |
| Prisma                            | **Configured** — v7.2 with `@prisma/adapter-pg` driver adapter           |
| Agent skills                      | 4 project-level + 70+ platform skills mapped (Section XIX)               |
| tasks/ directory                  | Active — lessons (9), regressions (3), predictions (3)                   |

**Current file count:** ~180 source files (excluding generated/node_modules)

### Git History

```
244fa73 feat: complete Week 7-8 — CRM Admin, Customer PWA, GDPR Privacy
0c9f776 feat: complete Week 5-6 — Inventory, HR, Dashboard, Security
a629b37 fix(lint): resolve React purity violations and unused vars
3c1c1ca fix(ci): Turborepo typecheck must depend on own build task
d7042d4 fix(ci): resolve Prisma DIRECT_URL crash in CI/Vercel builds
8adbbf7 feat: complete Week 3-4 — Split POS, Orders, KDS & Cash Payment
8b48166 feat: complete Week 1-2 foundation — auth, admin layout, menu CRUD
15ee48d merge: schema v2.2 upgrade (junction tables, index policy)
18ad052 feat(db): schema v2.2 — junction tables, index policy, RLS
22cb765 feat: complete project setup — Supabase schema, shadcn/ui, Vercel config
a4d9dcf chore: initial project scaffold
```

### Lessons Learned (from `tasks/lessons.md`)

1. **@supabase/ssr version must match @supabase/supabase-js** — Use `@supabase/ssr@0.8.0+` with `@supabase/supabase-js@2.98.0`
2. **Separate Prisma from Supabase exports for Edge Runtime** — Middleware imports from `@comtammatu/database/src/supabase` subpath (never barrel export)
3. **Prisma 7 breaking changes** — Use `prisma.config.ts` for datasource URL, `@prisma/adapter-pg` driver adapter, generated client at `../generated/prisma/client`
4. **Client components must bypass supabase barrel** — Import from `@comtammatu/database/src/supabase/client` directly (not barrel which re-exports `server.ts` with `next/headers`)
5. **Regenerate DB types after adding SQL functions** — `supabase gen types typescript` after every migration with `CREATE FUNCTION`
6. **Date.now() is impure in RSC** — ESLint `react-hooks/purity` flags `Date.now()`. Use `const now = new Date(); now.getTime() - offset` instead.
7. **Parallel Task agents for independent modules** — When modules don't share files, build concurrently. Shared package first, then consumers in parallel.
8. **Zod `.nonzero()` does not exist** — Use `.refine((v) => v !== 0, "message")` instead. Always check Zod API docs before assuming a method exists.
9. **Customer layout should be lightweight** — Keep route group layouts minimal (shell only). Individual pages handle auth checks independently: public pages skip auth, protected pages redirect.

---

## II. PROJECT OVERVIEW

**F&B CRM System** — Lightweight architecture for a Vietnamese restaurant chain (5-10 branches).

| Attribute        | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Pattern          | Modular Monolith (single Next.js app, domain modules internally)            |
| Stack            | Next.js 16.1 (App Router) + Supabase + Vercel + TypeScript 5.9 + Prisma 7.2 |
| Monorepo         | Turborepo 2.8 with pnpm 9.15.0                                              |
| UI               | shadcn/ui (new-york style) + Tailwind CSS v4.2 + dark mode                  |
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
│   │   ├── layout.tsx                 # Root layout (lang="vi", TooltipProvider)
│   │   ├── page.tsx                   # Home page (placeholder)
│   │   ├── globals.css                # Tailwind v4 + shadcn design tokens + dark mode
│   │   ├── login/
│   │   │   ├── page.tsx               # Login page (RSC, checks auth, role redirect)
│   │   │   ├── login-form.tsx         # Client component — email/password form
│   │   │   └── actions.ts            # Server Actions: login() + logout() with Zod validation
│   │   ├── (admin)/
│   │   │   ├── layout.tsx             # Admin layout (auth guard, RBAC: owner/manager only)
│   │   │   └── admin/
│   │   │       ├── page.tsx           # Dashboard (real data — revenue, orders, top items)
│   │   │       ├── actions.ts         # getDashboardStats(), getRecentOrders(), getTopSellingItems()
│   │   │       ├── dashboard-cards.tsx # Stat cards: revenue, order count, avg value
│   │   │       ├── recent-orders.tsx  # Recent orders table (last 10)
│   │   │       ├── top-items.tsx      # Top selling items table (last 30 days)
│   │   │       ├── inventory/
│   │   │       │   ├── page.tsx       # Inventory hub (6 tabs RSC)
│   │   │       │   ├── actions.ts     # All inventory + supplier Server Actions
│   │   │       │   ├── ingredients-tab.tsx     # Ingredient CRUD table + dialogs
│   │   │       │   ├── stock-levels-tab.tsx    # Stock per branch, low-stock alerts
│   │   │       │   ├── stock-movements-tab.tsx # Movement log + create dialog
│   │   │       │   ├── recipes-tab.tsx         # Recipe editor (multi-row ingredients)
│   │   │       │   ├── suppliers-tab.tsx       # Supplier CRUD with rating
│   │   │       │   └── purchase-orders-tab.tsx # PO workflow (draft→send→receive)
│   │   │       ├── hr/
│   │   │       │   ├── page.tsx       # HR hub (5 tabs RSC)
│   │   │       │   ├── actions.ts     # All HR Server Actions
│   │   │       │   ├── employees-tab.tsx  # Employee directory CRUD
│   │   │       │   ├── shifts-tab.tsx     # Shift template management
│   │   │       │   ├── schedule-tab.tsx   # Shift assignments by date
│   │   │       │   ├── attendance-tab.tsx # Attendance records (read-only)
│   │   │       │   └── leave-tab.tsx      # Leave requests + approve/reject
│   │   │       ├── security/
│   │   │       │   ├── page.tsx       # Security hub (2 tabs RSC)
│   │   │       │   ├── actions.ts     # getSecurityEvents(), getAuditLogs()
│   │   │       │   ├── events-tab.tsx # Security events with severity filter
│   │   │       │   └── audit-tab.tsx  # Audit log viewer with JSON diff
│   │   │       ├── menu/
│   │   │       │   ├── page.tsx       # Menu list (RSC, fetches via Server Action)
│   │   │       │   ├── actions.ts     # Server Actions: getMenus(), createMenu(), etc.
│   │   │       │   ├── menus-table.tsx # Client component — data table
│   │   │       │   └── [menuId]/
│   │   │       │       ├── page.tsx           # Menu detail/edit page
│   │   │       │       └── menu-detail.tsx    # Client component — edit form
│   │   │       ├── terminals/
│   │   │       │   ├── page.tsx       # Terminal list (RSC)
│   │   │       │   ├── actions.ts     # CRUD: register, approve, revoke, delete terminals
│   │   │       │   └── terminals-table.tsx # Client — table with approve/revoke actions
│   │   │       ├── kds-stations/
│   │   │       │   ├── page.tsx       # KDS station list (RSC)
│   │   │       │   ├── actions.ts     # CRUD: create, update, toggle, delete stations
│   │   │       │   └── stations-table.tsx # Client — table with category multi-select
│   │   │       └── crm/
│   │   │           ├── page.tsx       # CRM hub (4 tabs: Khách hàng, Hạng thành viên, Voucher, Phản hồi)
│   │   │           ├── actions.ts     # 20 Server Actions (customers, loyalty, vouchers, feedback, GDPR admin)
│   │   │           ├── customers-tab.tsx      # Customer CRUD + loyalty history + points adjust
│   │   │           ├── loyalty-tiers-tab.tsx  # Tier CRUD with delete protection
│   │   │           ├── vouchers-tab.tsx       # Voucher CRUD with branch multi-select (junction)
│   │   │           └── feedback-tab.tsx       # Star ratings + admin response dialog
│   │   ├── (pos)/
│   │   │   ├── layout.tsx             # POS layout (auth guard, BottomNav, Toaster)
│   │   │   └── pos/
│   │   │       ├── page.tsx           # POS landing — table grid overview
│   │   │       ├── session/
│   │   │       │   ├── page.tsx       # Cashier shift management
│   │   │       │   ├── actions.ts     # open/close session, reconciliation
│   │   │       │   └── session-form.tsx # OpenSessionForm + ActiveSessionCard
│   │   │       ├── order/
│   │   │       │   ├── new/
│   │   │       │   │   ├── page.tsx           # New order (RSC — loads tables, menu, categories)
│   │   │       │   │   ├── new-order-client.tsx # Orchestrator (table → menu → cart → submit)
│   │   │       │   │   ├── table-selector.tsx  # Table grid with zone grouping + status colors
│   │   │       │   │   ├── menu-selector.tsx   # Category tabs, search, item cards with +/-
│   │   │       │   │   └── order-cart.tsx      # Drawer-based cart with subtotal
│   │   │       │   └── [orderId]/
│   │   │       │       ├── page.tsx               # Order detail (RSC)
│   │   │       │       └── order-detail-client.tsx # Status actions (confirm/serve/cancel)
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx       # Order list (RSC)
│   │   │       │   ├── actions.ts     # createOrder, confirmOrder, updateStatus, getOrders, etc.
│   │   │       │   ├── helpers.ts     # isValidTransition(), calculateOrderTotals()
│   │   │       │   └── orders-list.tsx # Filterable order list with status tabs
│   │   │       └── cashier/
│   │   │           ├── page.tsx       # Cashier station (RSC — session check)
│   │   │           ├── actions.ts     # processPayment(), getCashierOrders()
│   │   │           ├── cashier-client.tsx # Split layout (60/40)
│   │   │           ├── session-bar.tsx    # Top bar with session info + elapsed time
│   │   │           ├── order-queue.tsx    # Left panel — scrollable order cards
│   │   │           └── payment-panel.tsx  # Right panel — cash payment + change calculator
│   │   ├── (kds)/
│   │   │   ├── layout.tsx             # KDS layout (auth guard, dark theme)
│   │   │   └── kds/
│   │   │       ├── page.tsx           # Station picker (auto-redirect if single station)
│   │   │       └── [stationId]/
│   │   │           ├── page.tsx           # KDS board (RSC — loads station + tickets)
│   │   │           ├── actions.ts         # getStationTickets(), bumpTicket()
│   │   │           ├── kds-board.tsx      # Realtime grid with timing legend
│   │   │           ├── ticket-card.tsx    # Large card with timing colors + bump buttons
│   │   │           └── use-kds-realtime.ts # Supabase postgres_changes subscription
│   │   ├── (customer)/
│   │   │   ├── layout.tsx             # Customer layout (mobile-first shell: header, nav, toaster)
│   │   │   └── customer/
│   │   │       ├── page.tsx           # Home (welcome, action cards, loyalty summary)
│   │   │       ├── actions.ts         # 8 customer-facing Server Actions
│   │   │       ├── customer-home.tsx  # Client — home page with optional auth context
│   │   │       ├── menu/
│   │   │       │   ├── page.tsx           # Menu browse (PUBLIC, no auth required)
│   │   │       │   └── menu-browser.tsx   # Client — category tabs, search, item cards
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx           # Order history (AUTH required)
│   │   │       │   └── order-history.tsx  # Client — order cards with expandable items
│   │   │       ├── loyalty/
│   │   │       │   ├── page.tsx               # Loyalty dashboard (AUTH required)
│   │   │       │   └── loyalty-dashboard.tsx  # Client — tier card, progress bar, transactions
│   │   │       ├── feedback/
│   │   │       │   └── [orderId]/
│   │   │       │       ├── page.tsx           # Feedback form (AUTH, dynamic route)
│   │   │       │       └── feedback-form.tsx  # Client — interactive 5-star rating + comment
│   │   │       └── account/
│   │   │           ├── page.tsx           # Account (AUTH — profile, logout, GDPR)
│   │   │           └── account-client.tsx # Client — export, deletion request with AlertDialog
│   │   └── api/
│   │       ├── health/route.ts        # Health check endpoint (working)
│   │       ├── auth/callback/route.ts # Supabase PKCE auth callback
│   │       └── privacy/
│   │           ├── helpers.ts             # Shared auth + customer lookup for privacy routes
│   │           ├── data-export/route.ts   # GET: JSON download of all customer data
│   │           └── deletion-request/route.ts # GET: check status / POST: create (30-day grace)
│   ├── components/
│   │   ├── admin/
│   │   │   ├── app-sidebar.tsx        # Admin sidebar (Dashboard, Menu, Terminals, KDS, Inventory, HR, Security, CRM links)
│   │   │   ├── header.tsx             # Admin header with breadcrumbs
│   │   │   └── nav-user.tsx           # User dropdown (avatar, logout)
│   │   ├── customer/
│   │   │   ├── customer-header.tsx    # Sticky header with restaurant name + ChefHat icon
│   │   │   └── customer-nav.tsx       # Bottom nav (Trang chủ, Thực đơn, Đơn hàng, Tài khoản)
│   │   ├── pos/
│   │   │   └── bottom-nav.tsx         # Mobile bottom nav (Bàn, Tạo đơn, Đơn hàng, Ca làm)
│   │   └── ui/                        # 24 shadcn/ui components (auto-generated)
│   │       ├── button, card, dialog, dropdown-menu, input, label, select,
│   │       │   separator, sheet, sidebar, skeleton, table, tabs, textarea,
│   │       │   tooltip, sonner, alert-dialog, avatar, badge, breadcrumb,
│   │       │   switch, checkbox, drawer, scroll-area
│   │       └── (New-York style, RSC-compatible, Tailwind CSS vars)
│   ├── hooks/
│   │   ├── use-mobile.ts             # Mobile breakpoint detection hook
│   │   ├── use-realtime-orders.ts    # Realtime subscription for orders (postgres_changes)
│   │   ├── use-realtime-tables.ts    # Realtime subscription for table status
│   │   └── use-realtime-broadcast.ts # Broadcast channel for toast notifications
│   ├── lib/
│   │   └── utils.ts                   # cn() helper (clsx + tailwind-merge)
│   ├── middleware.ts                   # Supabase session refresh + auth redirect
│   ├── next.config.ts                 # Transpiles workspace packages
│   ├── components.json                # shadcn/ui config (new-york, RSC, Tailwind vars)
│   ├── postcss.config.mjs             # @tailwindcss/postcss plugin
│   ├── eslint.config.mjs              # ESLint flat config (core-web-vitals + TS)
│   ├── package.json                   # Next 16.1, React 19.1, Supabase, shadcn, Tailwind, vaul
│   └── tsconfig.json                  # Extends root, Next.js plugin, @/* alias
├── modules/                           # Domain modules (all export-only stubs — NOT YET USED)
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
│   ├── database/                      # @comtammatu/database (IMPLEMENTED)
│   │   ├── prisma.config.ts           # Prisma 7 datasource config (DIRECT_URL / DATABASE_URL)
│   │   ├── src/
│   │   │   ├── index.ts               # Barrel: prisma client + Supabase clients + types
│   │   │   ├── prisma.ts              # Prisma singleton (PrismaPg adapter, global cache)
│   │   │   ├── supabase/
│   │   │   │   ├── index.ts           # Edge-safe exports (server + client, no Prisma)
│   │   │   │   ├── server.ts          # createServerClient (cookie-based, RSC/Actions)
│   │   │   │   ├── client.ts          # createBrowserClient (client components — DIRECT IMPORT)
│   │   │   │   └── middleware.ts       # updateSession (auth guard + role-based redirect)
│   │   │   └── types/
│   │   │       └── database.types.ts  # Supabase generated types (incl. RPC functions)
│   │   ├── generated/prisma/client/   # Generated Prisma client (git-ignored)
│   │   ├── package.json               # prisma, @prisma/client, @prisma/adapter-pg, pg
│   │   └── tsconfig.json
│   ├── shared/                        # @comtammatu/shared (IMPLEMENTED — 11 Zod schema files + constants + formatters)
│   │   ├── package.json               # zod
│   │   ├── src/
│   │   │   ├── index.ts               # Barrel: all schemas, constants, formatters
│   │   │   ├── constants.ts           # Status enums, role arrays, valid transitions (40+ exports)
│   │   │   ├── schemas/
│   │   │   │   ├── order.ts           # createOrderSchema, updateOrderStatusSchema, addOrderItemsSchema
│   │   │   │   ├── pos.ts             # registerTerminalSchema, openSessionSchema, closeSessionSchema
│   │   │   │   ├── payment.ts         # processPaymentSchema (cash-only MVP)
│   │   │   │   ├── kds.ts             # createKdsStationSchema, updateKdsStationSchema, bumpTicketSchema
│   │   │   │   ├── inventory.ts       # createIngredientSchema, createStockMovementSchema, createRecipeSchema
│   │   │   │   ├── supplier.ts        # createSupplierSchema, createPurchaseOrderSchema, receivePurchaseOrderSchema
│   │   │   │   ├── hr.ts             # createEmployeeSchema, createShiftSchema, createLeaveRequestSchema, etc.
│   │   │   │   ├── crm.ts            # createCustomerSchema, createLoyaltyTierSchema, adjustLoyaltyPointsSchema
│   │   │   │   ├── voucher.ts        # createVoucherSchema (with branch_ids), updateVoucherSchema
│   │   │   │   ├── feedback.ts       # createFeedbackSchema, respondFeedbackSchema
│   │   │   │   └── privacy.ts        # deletionRequestSchema
│   │   │   └── utils/
│   │   │       └── format.ts          # formatPrice, formatElapsedTime, 20+ Vietnamese label functions
│   │   └── tsconfig.json
│   ├── security/                      # @comtammatu/security (Upstash) — STUB
│   │   ├── package.json               # @upstash/ratelimit, @upstash/redis
│   │   ├── src/index.ts               # Export stub
│   │   └── tsconfig.json
│   └── ui/                            # @comtammatu/ui (React 19.1) — STUB
│       ├── package.json               # react, react-dom
│       ├── src/index.ts               # Export stub (UI components live in apps/web/components/ui)
│       └── tsconfig.json
├── supabase/
│   ├── config.toml                    # Local dev config (linked to zrlriuednoaqrsvnjjyo)
│   ├── functions/.gitkeep             # Edge Functions (empty)
│   ├── migrations/
│   │   ├── 20260228000000_initial_schema.sql       # v2.1 base schema (1,782 lines)
│   │   ├── 20260228000001_fix_security_advisors.sql # Security advisory fixes
│   │   ├── 20260228000002_schema_v2_2.sql          # v2.2 upgrade (junction tables, indexes)
│   │   ├── 20260228000003_profile_trigger.sql       # Auto-create profile on auth.users insert
│   │   └── 20260228100000_pos_kds_functions.sql     # POS/KDS: order_number gen, KDS ticket triggers
│   ├── tests/.gitkeep                 # RLS tests (empty)
│   └── seed.sql                       # Seed data (tenant, branches, users, menus, terminals, KDS)
├── .github/workflows/ci.yml           # CI: Prisma generate, typecheck, lint, test, secrets, audit
├── tasks/                             # Task tracking (Operating System)
│   ├── todo.md                        # Current plan & progress (active)
│   ├── regressions.md                 # Named failure rules (3 rules)
│   ├── lessons.md                     # Learning log (9 lessons)
│   ├── friction.md                    # Contradiction tracker
│   └── predictions.md                 # Prediction log (3 entries)
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
├── vercel.json                        # Vercel config (install command)
├── package.json                       # Root workspace (Turborepo)
├── pnpm-workspace.yaml                # apps/*, packages/*, modules/*
├── turbo.json                         # Build orchestration
├── tsconfig.json                      # Root TS config (strict, ES2022)
├── .prettierrc                        # Prettier config (semi, double quotes, 100 width)
├── .prettierignore                    # Prettier ignore patterns
├── .env.example                       # Environment variable template (with Prisma URLs)
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
| typescript | ^5.9.0  | Type system                  |
| prettier   | ^3.4.0  | Code formatting              |

### apps/web (@comtammatu/web)

| Package                | Version  | Purpose                            |
| ---------------------- | -------- | ---------------------------------- |
| next                   | ^16.1.0  | Framework (App Router, Turbopack)  |
| react                  | ^19.1.0  | UI library                         |
| react-dom              | ^19.1.0  | React DOM renderer                 |
| @supabase/supabase-js  | ^2.49.0  | Supabase client                    |
| @supabase/ssr          | ^0.8.0   | Supabase SSR utilities             |
| tailwindcss            | ^4.2.1   | Utility-first CSS framework        |
| @tailwindcss/postcss   | ^4.2.1   | PostCSS integration for Tailwind   |
| postcss                | ^8.5.6   | CSS processing                     |
| radix-ui               | ^1.4.3   | Headless UI primitives (shadcn)    |
| class-variance-authority | ^0.7.1 | Component variant styles           |
| clsx                   | ^2.1.1   | Conditional class utility          |
| tailwind-merge         | ^3.5.0   | Tailwind class deduplication       |
| lucide-react           | ^0.575.0 | Icon library                       |
| next-themes            | ^0.4.6   | Dark/light theme switching         |
| sonner                 | ^2.0.7   | Toast notifications                |
| zod                    | ^3.24.0  | Runtime validation (login forms)   |
| eslint                 | ^9.0.0   | Linting                            |
| eslint-config-next     | ^16.1.0  | Next.js ESLint rules               |
| shadcn                 | ^3.8.5   | shadcn/ui CLI (devDep)             |
| tw-animate-css         | ^1.4.0   | Tailwind animation utilities       |

### packages/database (@comtammatu/database)

| Package             | Version | Purpose                                    |
| ------------------- | ------- | ------------------------------------------ |
| @prisma/client      | ^7.2.0  | Type-safe ORM client                       |
| @prisma/adapter-pg  | ^7.2.0  | Prisma driver adapter for PgBouncer        |
| pg                  | ^8.13.0 | PostgreSQL client (used by adapter)        |
| @supabase/supabase-js | ^2.49.0 | Supabase client (auth, realtime, storage) |
| @supabase/ssr       | ^0.8.0  | SSR cookie-based auth                      |
| prisma              | ^7.2.0  | Schema management, migrations (devDep)     |
| dotenv              | ^16.4.0 | Environment variable loading (devDep)      |

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

> **Note:** shadcn/ui components are installed directly in `apps/web/components/ui/`, not in `packages/ui`. The shared UI package is a stub for future extraction.

### NOT YET INSTALLED (Planned)

- Sentry (error monitoring)
- vitest (testing framework)

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
pnpm --filter @comtammatu/database db:generate  # Generate Prisma client (from pulled schema)
pnpm --filter @comtammatu/database db:pull      # Pull schema from Supabase DB
pnpm --filter @comtammatu/database db:studio    # Open Prisma Studio
pnpm --filter @comtammatu/database db:types     # Generate Supabase TypeScript types
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

### Key Database Tables (CREATED — v2.2 schema)

- `tenants` -> `branches` -> `tables` (multi-tenant, multi-branch)
- `profiles` (maps to auth.users via trigger, has role + tenant_id + branch_id)
- `pos_terminals` -> `pos_sessions` (device management, cash shifts)
- `menu_items`, `menu_categories`, `modifiers`, `modifier_groups` (menu management)
- `orders` -> `order_items` -> `payments` (order lifecycle)
- `kds_stations` -> `kds_tickets` (kitchen display)
- `ingredients` -> `recipes` -> `stock_levels` -> `stock_movements` (inventory)
- `customers` -> `loyalty_tiers` -> `loyalty_transactions` (CRM)
- `audit_logs`, `security_events` (append-only, REVOKE UPDATE/DELETE)

> All tables have RLS policies enabled. Schema lives in `supabase/migrations/`.

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

### API Routes

- Auth endpoints: `/api/auth/*` (no auth required)
- Privacy endpoints: `/api/privacy/*` (self-auth via Supabase, customer-facing)
- Webhooks: `/api/webhooks/*` (HMAC signature verification) — planned
- Public: `/api/public/*` (optional auth) — planned
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
SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN

# Prisma (PgBouncer pooler for queries, direct for CLI)
DATABASE_URL       # PgBouncer URL (port 6543, ?pgbouncer=true&connection_limit=1)
DIRECT_URL         # Direct connection (port 5432, for db:pull / db:generate / studio)

# Payment keys (Supabase Vault, server-side only)
VNPAY_TMN_CODE / VNPAY_HASH_SECRET
MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY

# Local dev: .env.local (git-ignored)
```

### Connected Services

| Service  | Use                                               | Status                               |
| -------- | ------------------------------------------------- | ------------------------------------ |
| Supabase | Database, Auth, Realtime, Storage, Edge Functions | **Linked** (`zrlriuednoaqrsvnjjyo`)  |
| Vercel   | Hosting, CDN, serverless functions, deployments   | **Deployed** (`comtammatu.vercel.app`) |
| GitHub   | Source control, CI/CD via Actions                 | Active                               |

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

Per `tasks/todo.md`, the completed and upcoming phases are:

### Completed: Project Initialization + Week 1-2 Foundation + Week 3-4 Split POS & Orders

All three phases are done. See `tasks/todo.md` for full checklist.

**Week 3-4 delivered (18 routes, 8,849 lines):**
- Terminal & KDS Station admin management
- POS session open/close with cash reconciliation
- Full order lifecycle: draft → confirmed → preparing → ready → served → completed
- Waiter mobile UI: table grid, menu selector, cart drawer
- Cashier station: order queue (60/40 split), cash payment with change calculator
- KDS realtime board: ticket cards with timing colors, bump system
- Realtime hooks for orders, tables, KDS tickets, and broadcast notifications
- DB triggers: `generate_order_number()`, `create_kds_tickets`, `update_order_from_kds`, `record_order_status_change`

### Completed: Week 5-6 — Operations

**Week 5-6 delivered (31 files, +7,274 lines, 3 new routes → 21 total):**
- Admin Dashboard with real data — revenue (today/week/month), order counts, recent orders, top items
- Inventory Management (6 tabs) — ingredients CRUD, stock levels with low-stock alerts, stock movements with optimistic concurrency, recipes, suppliers CRUD, purchase orders (draft→send→receive workflow)
- HR Basic (5 tabs) — employee directory linked to profiles, shift templates, schedule assignments, attendance records, leave requests with approve/reject
- Security Monitoring (2 tabs) — security events with severity filter + 24h summary, audit logs with resource type filter + JSON diff
- Shared package extended — 3 new Zod schema files (inventory, supplier, hr), 15 new constants, 12 new formatters
- Sidebar navigation updated — Kho hàng, Nhân sự, Bảo mật links

**Deferred from Weeks 3-6 (enhancements, not blockers):**
- VNPay/Momo payment integration (webhooks, HMAC verification)
- Offline support (Service Worker, IndexedDB, AES-256-GCM)
- Device fingerprinting, peripheral config, receipt printing
- Order discounts/voucher application
- Upstash Redis rate limiting
- Stock auto-deduction trigger on order completion
- Charts/graphs for dashboard (plain Cards + Tables for MVP)
- Payroll calculations
- Attendance clock-in/clock-out mechanism

### Completed: Week 7-8 — CRM, Privacy & Customer PWA

**Week 7-8 delivered (30 routes, +4,963 lines, commit `244fa73`):**
- Shared package extended — 4 new Zod schema files (crm, voucher, feedback, privacy), 5 new constants, 6 new formatters
- CRM Admin (/admin/crm, 4 tabs) — customers CRUD with loyalty tier badges, loyalty tiers CRUD with delete protection, vouchers CRUD with branch multi-select (junction table), feedback with star ratings + response dialog, 20 Server Actions, GDPR admin (deletion requests list, cancel, process anonymization)
- Customer PWA (/customer, 6 pages) — home (optional auth, action cards, loyalty summary), menu browse (PUBLIC, category tabs, search), orders (AUTH, expandable items), loyalty (AUTH, tier card, progress bar, transactions), feedback (AUTH, 5-star interactive), account (AUTH, export, deletion request with 30-day grace AlertDialog), 8 Server Actions
- GDPR Privacy API — data export (JSON download), deletion requests (create with 30-day grace, check status), shared auth helper
- Sidebar updated — Khách hàng link added
- Customer layout — lightweight shell (header, nav, toaster), auth in individual pages

**Deferred from Week 7-8 (enhancements, not blockers):**
- Campaigns (email/SMS/push notifications)
- Notifications system
- Auto-tier upgrade triggers
- Retention cron jobs (scheduled deletion after 30-day grace)
- E2E testing, RLS validation suite
- Documentation (API docs, user guide, deployment runbook)
- Voucher redemption at POS during order creation

### Next: Post-MVP Enhancements

```
- [ ] VNPay/Momo payment integration
- [ ] Offline support (Service Worker, IndexedDB)
- [ ] Charts/graphs for admin dashboard
- [ ] E2E testing (Vitest/Playwright)
- [ ] RLS validation suite
- [ ] API documentation
- [ ] Stock auto-deduction on order completion
- [ ] Payroll calculations
- [ ] Attendance clock-in/clock-out (QR scan)
- [ ] Receipt printing + peripheral config
- [ ] Campaigns & notifications
- [ ] Voucher redemption at POS
- [ ] Auto-tier upgrade triggers
- [ ] Retention cron jobs
```

### Open Technical Decisions

1. **`modules/` directory** — 10 stubs exist but are unused. Domain logic lives in `apps/web/app/` route files. Decide: implement modules pattern or remove stubs. (Recommendation: remove stubs — route-colocated Server Actions work well at current scale.)
2. **`packages/ui`** — Stub package, but shadcn components live in `apps/web/components/ui/`. Decide: centralize or keep local. (Recommendation: keep local until multi-app needed.)
3. **Prisma schema** — No `.prisma` file in repo. Uses `db:pull` from Supabase. Decide: commit pulled schema or document pull-based workflow.
4. **Import boundary enforcement** — Three-tier import strategy works but is convention-based. Consider adding ESLint `no-restricted-imports` rules to enforce at CI level.

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
- **Right to erasure:** 30-day grace period, then anonymize orders + delete customer data — **IMPLEMENTED** (`/api/privacy/deletion-request` + admin CRM actions)
- **DSAR:** JSON export via `/api/privacy/data-export` — **IMPLEMENTED** (authenticated customer data download)
- **Admin tools:** Deletion requests list, cancel, process anonymization (sets name/phone to `[Đã xóa]`, email=NULL, is_active=false) — **IMPLEMENTED** (CRM admin actions)
- **Customer self-service:** Account page with "Xuất dữ liệu" (export) + "Yêu cầu xóa" (deletion request with AlertDialog) — **IMPLEMENTED**
- **Audit log PII:** Hashed (SHA-256) before storage
- **Retention jobs:** Daily cron via Supabase Edge Function — **NOT YET IMPLEMENTED** (manual admin processing for now)

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
