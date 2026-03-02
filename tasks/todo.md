# Todo — Current Task Plan & Progress

## Completed: Project Initialization

- [x] Create project file structure
- [x] Run `pnpm install` to verify workspace resolution
- [x] Configure shadcn/ui in apps/web (Tailwind v4 + shadcn v3)
- [x] Set up ESLint + Prettier
- [x] Initialize Supabase project (`supabase link` → comtammatu / zrlriuednoaqrsvnjjyo)
- [x] Create initial database migration (v2.1 schema)
- [x] First Vercel deployment test (comtammatu.vercel.app)

## Completed: Week 1-2 Foundation

- [x] v2.2 schema migration (junction tables + drop redundant indexes)
- [x] Database package — Prisma 7.2 + Supabase client setup
- [x] Auth module — login page, middleware, role-based routing
- [x] Seed data — tenant, branches, users, menus
- [x] Admin layout — sidebar, navigation, header
- [x] Menu Management CRUD — list, create, edit, delete

## Completed: Week 3-4 — Split POS & Orders

- [x] Shared package — Zod schemas (order, pos, payment, kds), constants, Vietnamese formatters
- [x] DB migration — `generate_order_number()`, KDS triggers (`create_kds_tickets`, `update_order_from_kds`, `record_order_status_change`)
- [x] Terminal Management — admin CRUD for `mobile_order` + `cashier_station`
- [x] KDS Station Management — admin CRUD with category routing (junction table)
- [x] POS Session Management — open/close shifts, cash reconciliation
- [x] Order Module — create, confirm, status transitions, totals with tax/service charge
- [x] Waiter Mobile Order UI — table grid, menu selector with search, cart drawer
- [x] Cashier Station UI — order queue (60/40 split), cash payment with change calculator
- [x] KDS Display UI — realtime board with bump system, timing colors, dark theme
- [x] Realtime hooks — orders, tables, KDS tickets (postgres_changes), broadcast notifications
- [x] CI update — Prisma generate step added to GitHub Actions
- [x] Build fix — client-side imports bypass server barrel (`@comtammatu/database/src/supabase/client`)

### What was NOT done in Week 3-4 (deferred)

- [ ] VNPay/Momo payment integration (webhooks, HMAC verification) — **cash-only MVP**
- [ ] Offline support (Service Worker, IndexedDB, AES-256-GCM encryption)
- [ ] Device fingerprinting for terminal registration
- [ ] Peripheral config (printers, cash drawers)
- [ ] Receipt printing
- [ ] Order discounts and voucher application
- [ ] Upstash Redis rate limiting

## Completed: Week 5-6 — Operations

### Shared Package Extensions
- [x] Zod schemas — inventory (ingredients, stock movements, recipes), supplier (CRUD, POs, receive), HR (employees, shifts, assignments, leave)
- [x] Constants — 15 new enums (stock movement types, waste reasons, PO statuses, employment types, employee statuses, leave types/statuses, shift assignment statuses, attendance statuses/sources, security severities, module-specific role sets)
- [x] Formatters — 12 new Vietnamese label functions + `formatDate()`, `formatTime()`

### Admin Dashboard
- [x] Dashboard stats (revenue today/week/month, order count, avg order value)
- [x] Recent orders table (last 10 with status badges)
- [x] Top selling items (last 30 days, by quantity)
- [x] Order status counts (today)

### Inventory Management (6 tabs)
- [x] Ingredients CRUD — create, edit, delete with unit/category
- [x] Stock levels — per-branch view with low-stock alert badges ("Sắp hết" / "Đủ hàng")
- [x] Stock movements — log + create dialog, color-coded type badges
- [x] Recipes — link menu items → ingredients with quantities + waste %
- [x] Suppliers CRUD — name, contact, rating stars
- [x] Purchase orders — full workflow (draft → send → receive → cancel), dynamic item rows, stock level auto-update on receive

### HR Basic (5 tabs)
- [x] Employees — directory linked to profiles, CRUD with status/employment type badges
- [x] Shifts — template management with time inputs, branch filter
- [x] Schedule — shift assignments by date, "Phân ca" dialog
- [x] Attendance — read-only view with status/source badges
- [x] Leave — requests with filter tabs, approve/reject buttons

### Security Monitoring (2 tabs)
- [x] Security events — severity filter, 24h summary cards, expandable details
- [x] Audit logs — resource type filter, expandable old/new value JSON diff

### Navigation & Verification
- [x] Sidebar updated — Kho hàng, Nhân sự, Bảo mật links with icons
- [x] Typecheck passes (all packages)
- [x] Lint passes (fixed Date.now() purity violation in HR page)
- [x] Build passes (21 routes including 3 new: /admin/inventory, /admin/hr, /admin/security)
- [x] CI green — all 3 jobs pass (secrets scan, lint/typecheck/test, dependency audit)
- [x] Commit: `0c9f776` — 31 files, +7,274 lines

### What was NOT done in Week 5-6 (deferred)

- [ ] Stock auto-deduction trigger on order completion
- [ ] Charts/graphs for dashboard (plain Cards + Tables for MVP)
- [ ] Payroll calculations
- [ ] Attendance clock-in/clock-out mechanism (QR scan, etc.)
- [ ] Branch comparison in dashboard

## Completed: Week 7-8 — CRM, Privacy & Customer PWA

### Shared Package Extensions (Phase 0)
- [x] Zod schemas — CRM (customer, loyalty tier, loyalty points), voucher (create/update with branch_ids), feedback (create, respond), privacy (deletion request)
- [x] Constants — 5 new enums (customer genders, customer sources, loyalty transaction types, voucher types, deletion request statuses) + CRM_ROLES
- [x] Formatters — 6 new Vietnamese label functions (getCustomerGenderLabel, getCustomerSourceLabel, getLoyaltyTransactionTypeLabel, getVoucherTypeLabel, getDeletionStatusLabel, formatPoints)

### CRM Admin — /admin/crm (Phase 1, 4 tabs)
- [x] Customers tab — CRUD table with loyalty tier badge, total_spent, active/inactive toggle, loyalty history dialog, points adjust dialog (earn/redeem/adjust)
- [x] Loyalty Tiers tab — CRUD with min_points, discount_pct, benefits, sort_order. Delete protection if customers linked
- [x] Vouchers tab — CRUD with type badges (percent/fixed/free_item), branch multi-select via voucher_branches junction, date range, toggle active
- [x] Feedback tab — Star rating display (1-5), response dialog for admin, responded/unanswered badges
- [x] Server Actions — 20 actions (customers CRUD, loyalty points, tiers CRUD, vouchers CRUD with junction, feedback response, GDPR admin: deletion requests, cancel, process anonymization)

### Customer PWA — /customer (Phase 2, 6 pages)
- [x] Layout — Mobile-first with sticky header (Cơm Tấm Mã Tú), bottom nav (Trang chủ, Thực đơn, Đơn hàng, Tài khoản), Toaster
- [x] Home page — Welcome message, 3 action cards, loyalty summary if logged in
- [x] Menu page (PUBLIC) — Category tabs with horizontal scroll, search bar, item cards with price. Read-only for MVP
- [x] Orders page (AUTH) — Order cards with status badges, expandable items, "Đánh giá" link for completed orders
- [x] Loyalty page (AUTH) — Tier card with discount %, points balance, progress bar to next tier, transaction history
- [x] Feedback page (AUTH) — Dynamic route /feedback/[orderId], interactive 5-star rating, comment textarea
- [x] Account page (AUTH) — Profile info, logout, data export (JSON download), deletion request with 30-day grace period AlertDialog
- [x] Server Actions — 8 actions (getPublicMenu, getCustomerOrders, getCustomerLoyalty, submitFeedback, getOrderForFeedback, getCustomerProfile, requestDataExport, requestDeletion)

### GDPR Privacy API (Phase 3)
- [x] GET /api/privacy/data-export — Authenticated JSON download of all customer data (orders, loyalty, feedback)
- [x] GET/POST /api/privacy/deletion-request — Create deletion request (30-day grace) / check status
- [x] Shared auth helper (helpers.ts) — getAuthenticatedCustomer() for privacy routes

### Middleware & Verification (Phase 4)
- [x] Middleware updated — Added `/customer` and `/api/privacy` to publicRoutes
- [x] Typecheck passes (all 5 packages)
- [x] Lint passes (0 errors, 0 warnings — fixed unused isLoggedIn prop, img→Image)
- [x] Build passes (30 routes including 9 new: /admin/crm, /customer, /customer/menu, /customer/orders, /customer/loyalty, /customer/feedback/[orderId], /customer/account, /api/privacy/data-export, /api/privacy/deletion-request)
- [x] Commit: `244fa73` — 37 files, +4,963 lines
- [x] Pushed to origin/main

### What was NOT done in Week 7-8 (deferred)

- [ ] Campaigns (email/SMS/push notifications)
- [ ] Notifications system
- [ ] Auto-tier upgrade triggers (auto-promote customer when points reach tier threshold)
- [ ] Retention cron jobs (scheduled deletion after 30-day grace)
- [ ] E2E testing for critical flows
- [ ] RLS validation test suite
- [ ] Documentation (API docs, user guide, deployment runbook)
- [ ] Order discounts/voucher redemption at POS (voucher application during order creation)

## Completed: Post-MVP Sprint 1 (Week 9-10)

### Payment & Order Flow Hardening
- [x] Momo payment integration (webhook, HMAC verification) — commit `e2bc0dc`
- [x] Stock auto-deduction on order completion (DB trigger) — commit `e2bc0dc`
- [x] Voucher redemption at POS during order creation — commit `e2bc0dc`
- [x] Dashboard charts (revenue chart, hourly chart, status chart) — commit `e2bc0dc`
- [x] Allow takeaway orders (null table_id) — commit `b1848f4`
- [x] Allow null variant_id, modifiers, notes in order items — commit `6fa2fa6`
- [x] Complete order flow fix — KDS sync, Momo webhook, served status — commit `34c8462`
- [x] Admin payment management page — commit `60bcbef`
- [x] Next.js 16.1 middleware → proxy.ts migration — commit `82e5c12`

### HR Redesign
- [x] Redesign HR employee management — create auth accounts from admin — commit `05a8df3`

### Security Hardening
- [x] Harden POS/KDS device flow — 7 security and correctness fixes — commit `f6f5183`
- [x] Harden KDS station actions — role check, ownership verification, tenant filtering — commit `ef127d6`
- [x] Validate client-provided IDs against auth context (VALIDATE_CLIENT_IDS rule)

### Accessibility & Quality
- [x] WCAG AAA accessibility fixes across admin components — commit `96398c0`
- [x] Accessibility improvements across all modules — commit `49299b6`
- [x] State machine documentation for order flow
- [x] CLAUDE.md workflow restructure for production use — commit `cebc9f0`

### What was NOT done in Post-MVP Sprint 1 (deferred)
- [ ] VNPay payment integration (only Momo done)
- [ ] Retention cron jobs (auto-delete after 30-day grace period)
- [ ] Auto-tier upgrade triggers for loyalty

## Completed: Post-MVP Sprint 2 — Production Resilience

### Loading States (22 loading.tsx files)
- [x] Reusable skeleton components — `StatCardSkeleton`, `ChartSkeleton`, `TableSkeleton`, `TabsSkeleton`, `CardSkeleton`, `OrderCardSkeleton`, `KdsTicketSkeleton`
- [x] Admin routes (9) — dashboard, menu, crm, hr, inventory, payments, security, terminals, kds-stations
- [x] POS routes (5) — pos, orders, order/new, cashier, session
- [x] KDS routes (2) — station list, station board (dark theme)
- [x] Customer routes (6) — home, menu, orders, loyalty, account, feedback

### Error Boundaries (8 files)
- [x] Route group level (4) — admin, pos, kds (dark), customer (mobile)
- [x] Critical sub-routes (3) — pos/orders, pos/cashier, kds/[stationId]
- [x] Global not-found.tsx — Vietnamese 404 page

### Lazy Loading
- [x] Recharts lazy loaded via `next/dynamic` on admin dashboard (3 chart components)

### Rate Limiting
- [x] `@comtammatu/security` — Upstash Redis sliding window rate limiter with graceful degradation
- [x] `authLimiter` (5/60s) on login
- [x] `webhookLimiter` (10/60s) on Momo webhook
- [x] `apiLimiter` (30/60s) on privacy data-export and deletion-request

### Zod v4 Compatibility Fixes
- [x] `.error.errors` → `.error.issues` (41 occurrences across 11 action files)
- [x] `required_error` → `error` in `z.enum()` (5 occurrences in hr.ts, inventory.ts)
- [x] `z.record(schema)` → `z.record(z.string(), schema)` (3 occurrences in kds.ts, pos.ts)

---

## Current Roadmap — Post-MVP

### Priority 1 — Core Business (Week 11-12)
```
- [ ] VNPay payment integration (webhooks, HMAC verification)
- [ ] Retention cron jobs (scheduled deletion after 30-day GDPR grace period)
- [ ] Auto-tier upgrade triggers (auto-promote customer when points reach tier)
- [ ] Receipt printing (thermal printer integration)
- [ ] Notifications system (in-app + push for order status)
```

### Priority 2 — Operations (Week 13-14)
```
- [ ] Payroll calculations (HR module)
- [ ] Attendance clock-in/clock-out (QR scan)
- [ ] Branch comparison in dashboard
- [ ] Offline support — Service Worker + IndexedDB (critical for POS reliability)
- [ ] Device fingerprinting for terminal registration
```

### Priority 3 — Quality & Scale (Week 15-16)
```
- [ ] E2E testing (Playwright — critical flows: login, order, payment, KDS)
- [ ] RLS validation test suite
- [ ] API documentation (OpenAPI spec)
- [x] Upstash Redis rate limiting ← Sprint 2
- [ ] Peripheral config (printers, cash drawers)
```

### Priority 4 — Growth (Week 17+)
```
- [ ] Campaigns & notifications (email/SMS/push marketing)
- [ ] Customer ordering (online menu → place order via PWA)
- [ ] Multi-branch reporting & analytics
- [ ] Inventory forecasting (based on order history)
- [ ] Staff performance metrics
```
