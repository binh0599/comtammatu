# Cơm Tấm Má Tư — F&B SaaS Platform

Nền tảng quản lý nhà hàng đa thương hiệu (multi-brand SaaS) dành cho chuỗi **Cơm Tấm Má Tư**. Bao gồm toàn bộ vòng đời vận hành: quản lý đơn hàng, bếp hiển thị (KDS), thu ngân & thanh toán, tồn kho, CRM & loyalty, nhân sự & lương, báo cáo — trong một codebase duy nhất.

**Live:** [comtammatu.vercel.app](https://comtammatu.vercel.app)

---

## Phiên bản hiện tại

| Giai đoạn | Trạng thái |
|---|---|
| V2 MVP (8 tuần + 9 sprints + 6 waves) | **Hoàn thành** — 57 pages, 87 tables, 35 migrations |
| **V4.1 Multi-brand SaaS Migration** | **Đang triển khai** |

> Source of truth: `comtammatu_master_plan_v4.1.md` · Roadmap: `docs/ROADMAP.md` · Tasks: `tasks/todo.md`

---

## Giao diện

Hệ thống gồm 4 giao diện từ một ứng dụng Next.js, cộng REST API cho Flutter mobile app:

| Giao diện | Đường dẫn | Người dùng |
|---|---|---|
| **Admin Panel** | `/admin` | Owner, Manager |
| **POS Terminal** | `/pos` | Cashier, Waiter |
| **Kitchen Display (KDS)** | `/kds/:stationId` | Chef |
| **Employee Portal** | `/employee` | All staff |
| **Mobile App API** | `/api/mobile/*` | Customers (Flutter) |

**V4.1 Target:** 7 app surfaces — thêm Platform Admin, Brand Manager, Staff App, Customer Loyalty. URL pattern chuyển sang `/b/[brandId]/br/[branchId]/...`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 App Router · React 19.2 · TypeScript 5.9 strict |
| Database | Supabase (PostgreSQL) · Prisma 7.5 (migrations only) · supabase-js (queries) |
| Auth | Supabase Auth · `@supabase/ssr@0.9.0` — cookie sessions + JWT custom claims (V4.1) |
| UI | shadcn/ui (new-york) · Tailwind CSS v4.2 · Lucide React |
| State | React Query · Zustand |
| Monorepo | Turborepo 2.8 · pnpm 9.15.0 |
| Hosting | Vercel · GitHub Actions CI |
| Mobile | Flutter 3.x — 3 flavors (Manager / Staff / Customer) · Riverpod |
| Packages | `@comtammatu/database` · `@comtammatu/shared` · `@comtammatu/security` · `@comtammatu/ui` |

---

## Cấu trúc dự án

```
.
├── apps/
│   └── web/                        # Next.js application
│       └── app/
│           ├── (admin)/admin/       # Admin (15 modules: dashboard, menu, HR, CRM, inventory, reports…)
│           ├── (pos)/pos/           # POS (orders, cashier, session, printer, notifications)
│           ├── (kds)/kds/           # Kitchen Display (tickets, printer)
│           ├── (employee)/employee/ # Employee portal (profile, schedule, leave, payroll)
│           ├── login/               # Auth pages
│           └── api/                 # Route handlers (auth, health, cron, webhooks, mobile API, push)
│
├── packages/
│   ├── database/                   # Prisma client (migrations) + Supabase helpers (server/client/middleware)
│   ├── shared/                     # Zod schemas (16 files) + constants + formatters + logger
│   ├── security/                   # Upstash Redis rate limiters (6) + account lockout
│   └── ui/                         # 26 shadcn/ui components (barrel export)
│
├── supabase/
│   └── migrations/                 # 35 SQL migrations
│
├── docs/                           # Technical documentation
│   ├── REFERENCE.md                # Dependencies, DB conventions, env vars, API tiers
│   ├── ROADMAP.md                  # V4.1 roadmap
│   ├── TASK_TEMPLATES.md           # Task contract templates
│   ├── API.md                      # REST API reference (mobile)
│   ├── state-machines.md           # Order, payment, delivery state machines
│   ├── SESSION_PROTOCOL.md         # AI agent session rules
│   └── archive/                    # V2 docs (historical reference)
│
└── tasks/
    ├── todo.md                     # V4.1 task progress
    ├── regressions.md              # Rules from past failures
    ├── lessons.md                  # Patterns + prevention
    └── friction.md                 # Contradiction tracker
```

---

## Bắt đầu

### Yêu cầu

- Node.js >= 20
- pnpm 9.15.0 (`npm install -g pnpm@9.15.0`)
- Supabase project với migrations đã apply
- Vercel project (tùy chọn, cho deployment)

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Cấu hình environment variables

Tạo `apps/web/.env.local` (không bao giờ commit file này):

```bash
# Public
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Server-only
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1   # PgBouncer (port 6543)
DIRECT_URL=postgresql://...                                       # Direct (port 5432)

# Rate limiting (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# V4.1: Payment keys (PayOS, VNPay, Zalo) stored in Supabase Vault, NOT here
```

### 3. Generate Prisma client

```bash
pnpm --filter @comtammatu/database db:generate
```

### 4. Apply migrations

```bash
supabase db push
```

### 5. Chạy dev server

```bash
pnpm dev
# → http://localhost:3000
```

---

## Scripts

```bash
# Development
pnpm dev                                          # Tất cả apps (Turborepo)
pnpm --filter @comtammatu/web dev                 # Web app only

# Quality
pnpm lint
pnpm typecheck
pnpm test
pnpm format

# Database
pnpm --filter @comtammatu/database db:generate    # Regenerate Prisma client
pnpm --filter @comtammatu/database db:pull        # Pull schema từ Supabase
pnpm --filter @comtammatu/database db:types       # Generate Supabase TypeScript types
pnpm --filter @comtammatu/database db:studio      # Mở Prisma Studio

# Build
pnpm build
```

---

## Kiến trúc

### Multi-brand & Multi-branch (V4.1)

Mô hình phân cấp 4 tầng:

```
Platform > Brand > Chain > Branch
```

- Mỗi row trong database mang `brand_id` (V4.1, thay thế `tenant_id` cũ) và `branch_id`
- URL là nguồn sự thật duy nhất cho scope: `/b/[brandId]/br/[branchId]/...`
- JWT custom claims chứa `brand_id + user_role` cho RLS trực tiếp
- Mọi Server Action verify brand + branch ownership trước khi xử lý

### Query Strategy (V4.1)

| Tier | Phương thức | Use case |
|---|---|---|
| PostgREST | Auto CRUD + RLS | Standard queries, filters, joins |
| RPC Functions | `supabase.rpc()` | Business logic: close_pos_session, calculate_rfm… |
| Edge Functions | Deno serverless | External APIs: PayOS, E-invoice, GrabFood, Zalo |

**Quyết định V4.1:** supabase-js là primary query client. Prisma chỉ dùng cho migrations.

### Role-Based Access Control

7 roles với hierarchy nghiêm ngặt:

```
owner > manager > cashier > chef > waiter > inventory > hr
```

Customer không truy cập CRM — chỉ dùng Flutter App qua `/api/mobile/*`.

### Order Lifecycle

```
Waiter tạo đơn
  → KDS nhận ticket realtime (Supabase Realtime, scoped theo branch)
  → Chef đánh dấu món xong / bump ticket
  → Cashier chọn phương thức thanh toán và xử lý
  → Đơn hàng → "completed"
```

Chỉ terminal loại `cashier_station` mới được xử lý thanh toán — verify server-side.

### Import Tiers

```
RSC / Server Actions  → import from '@comtammatu/database' (full barrel)
Middleware / Edge      → import from '@comtammatu/database/src/supabase' (no Prisma)
Client components     → import from '@comtammatu/database/src/supabase/client' only
```

### Database Conventions

- Primary keys: `BIGINT GENERATED ALWAYS AS IDENTITY`
- Text: luôn `TEXT` (không `VARCHAR`)
- Timestamps: luôn `TIMESTAMPTZ`
- Money totals: `NUMERIC(14,2)` · prices: `NUMERIC(12,2)` — không bao giờ `FLOAT`
- RLS policies trên mọi table, không ngoại lệ
- `audit_logs` và `security_events` là append-only
- Card/payment data không bao giờ lưu trong DB (PCI DSS SAQ A)

---

## Feature Modules

### Admin Panel (`/admin`) — 15 modules

Dashboard · Menu · Orders · Tables · Payments · Finance · Inventory · HR · CRM · Campaigns · KDS Stations · Terminals · Reports · Security · Settings · Notifications

### POS (`/pos`)

Session management · Order creation · Realtime order board · Cashier payment · Voucher redemption · Notifications · Receipt printing

### Kitchen Display System (`/kds/:stationId`)

Realtime ticket board · Item-level ready bumping · Ticket completion · Printer management

### Employee Portal (`/employee`)

Profile · Schedule · Leave requests · Payroll · Workspace dashboard

### Mobile App API (`/api/mobile/*`)

REST API cho Flutter customer app (Bearer token auth, rate-limited):

| Endpoint | Auth | Mô tả |
|---|---|---|
| `GET /menu` | Public | Menu browsing |
| `GET /stores` | Public | Danh sách chi nhánh |
| `GET /orders` | Required | Lịch sử đơn hàng |
| `GET /loyalty` | Required | Loyalty dashboard |
| `GET /profile` | Required | Hồ sơ khách hàng |
| `GET /vouchers` | Required | Voucher khả dụng |
| `POST /feedback` | Required | Gửi phản hồi |
| `GET /notifications` | Required | Thông báo |

---

## Thanh toán

| Phương thức | Trạng thái |
|---|---|
| Tiền mặt | **Live** |
| Momo | **Live** (HMAC webhook verification) |
| PayOS / VietQR | **V4.1 Sprint 1** — zero-fee payment |
| VNPay (card) | **V4.1 Sprint 2** — card aggregator |

Payment credentials lưu trong **Supabase Vault** — không bao giờ trong env vars hay database.

---

## API Routes

| Endpoint | Mục đích |
|---|---|
| `/api/auth/callback` | Supabase Auth OAuth callback |
| `/api/health` | Health check |
| `/api/mobile/*` | Flutter customer app REST API |
| `/api/push/*` | Web Push notifications |
| `/api/cron/process-deletions` | GDPR auto-deletion |
| `/api/cron/expire-points` | Loyalty point expiration |
| `/api/cron/upgrade-tiers` | Loyalty tier upgrades |
| `/api/cron/inventory-alerts` | Low stock alerts |
| `/api/cron/expire-payments` | Expire stale payments |
| `/api/cron/refresh-views` | Daily analytics materialized views |
| `/api/webhooks/momo` | Momo payment webhook |
| `/api/privacy/data-export` | GDPR data export |
| `/api/privacy/deletion-request` | GDPR deletion request |

---

## V4.1 Roadmap

### 3 Ưu tiên cao nhất

1. **CI/CD broken** — Fix lint errors, branch protection (CRITICAL)
2. **Scope confusion** — URL as source of truth + ScopeContextBar (HIGH)
3. **Compliance gap** — E-invoicing Decree 70/2025 + VietQR (HIGH)

### Tier 1 — Compliance & Revenue (0–3 tháng)

PayOS/VietQR · E-invoicing · Refunds · VNPay · GrabFood · ShopeeFood · Zalo OA · Schema-per-module · Flutter TestFlight · SaaS billing

### Tier 2 — Competitive Parity (3–6 tháng)

Reservation · RFM segmentation · Financial reporting · Inter-branch stock transfer · MoMo/ZaloPay e-wallets · Payroll SI compliance

### Tier 3 — Differentiation (6–24 tháng)

BCG menu matrix · AI demand forecasting · Dynamic pricing · Staff analytics · Zalo Mini App · VNPAY SmartPOS

> Chi tiết: `docs/ROADMAP.md`

---

## Tài liệu

| File | Nội dung |
|---|---|
| `CLAUDE.md` | AI agent boot instructions, hard boundaries, task contracts |
| `comtammatu_master_plan_v4.1.md` | **Source of truth** — V4.1 architecture, API, Flutter, Zalo, Billing |
| `comtammatu_v4_synthesis.html` | Visual synthesis với Mermaid diagrams |
| `docs/REFERENCE.md` | Dependencies, DB conventions, env vars, import strategy, API tiers |
| `docs/ROADMAP.md` | V4.1 roadmap — 3 tiers, 5 sprints |
| `docs/TASK_TEMPLATES.md` | Task contract templates (5 migration + 4 standard) |
| `docs/API.md` | REST API reference cho Flutter mobile app |
| `docs/state-machines.md` | Order, payment, delivery state machines |
| `docs/SESSION_PROTOCOL.md` | AI agent session rules |

---

## Contributing

1. Đọc `CLAUDE.md` và `tasks/regressions.md` trước khi chỉnh sửa code
2. Điền Task Contract Template cho mọi task ≥3 bước
3. Tạo git checkpoint commit trước khi bắt đầu
4. Chạy `pnpm typecheck && pnpm lint && pnpm build` trước khi commit
5. Không vi phạm hard boundaries trong `CLAUDE.md` Section III

---

## License

Private — all rights reserved. (c) Cơm Tấm Má Tư.
