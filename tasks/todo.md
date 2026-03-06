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
- [x] Stock levels — per-branch view with low-stock alert badges
- [x] Stock movements — log + create dialog, color-coded type badges
- [x] Recipes — link menu items -> ingredients with quantities + waste %
- [x] Suppliers CRUD — name, contact, rating stars
- [x] Purchase orders — full workflow (draft -> send -> receive -> cancel), dynamic item rows, stock level auto-update on receive

### HR Basic (5 tabs)
- [x] Employees — directory linked to profiles, CRUD with status/employment type badges
- [x] Shifts — template management with time inputs, branch filter
- [x] Schedule — shift assignments by date
- [x] Attendance — read-only view with status/source badges
- [x] Leave — requests with filter tabs, approve/reject buttons

### Security Monitoring (2 tabs)
- [x] Security events — severity filter, 24h summary cards, expandable details
- [x] Audit logs — resource type filter, expandable old/new value JSON diff

### Navigation & Verification
- [x] Sidebar updated — Kho hang, Nhan su, Bao mat links with icons
- [x] Typecheck, lint, build all pass
- [x] CI green

## Completed: Week 7-8 — CRM, Privacy & Customer PWA

### CRM Admin — /admin/crm (4 tabs)
- [x] Customers tab — CRUD table with loyalty tier badge, total_spent, loyalty history dialog, points adjust dialog
- [x] Loyalty Tiers tab — CRUD with min_points, discount_pct, benefits, sort_order
- [x] Vouchers tab — CRUD with type badges (percent/fixed/free_item), branch multi-select
- [x] Feedback tab — Star rating display, response dialog, responded/unanswered badges
- [x] Server Actions — 20 actions (customers, loyalty points, tiers, vouchers, feedback, GDPR admin)

### Customer PWA — /customer (6 pages)
- [x] Layout — Mobile-first with sticky header, bottom nav
- [x] Home, Menu (public), Orders (auth), Loyalty (auth), Feedback (auth), Account (auth)
- [x] Server Actions — 8 actions

### GDPR Privacy API
- [x] GET /api/privacy/data-export, GET/POST /api/privacy/deletion-request

## Completed: Post-MVP Sprint 1 (Week 9-10)

### Payment & Order Flow Hardening
- [x] Momo payment integration (webhook, HMAC verification)
- [x] Stock auto-deduction on order completion (DB trigger)
- [x] Voucher redemption at POS during order creation
- [x] Dashboard charts (revenue, hourly, status)
- [x] Allow takeaway orders (null table_id)
- [x] Complete order flow fix — KDS sync, Momo webhook, served status
- [x] Admin payment management page
- [x] Next.js 16.1 middleware -> proxy.ts migration

### HR Redesign
- [x] Redesign HR employee management — create auth accounts from admin

### Security Hardening
- [x] Harden POS/KDS device flow — 7 security and correctness fixes
- [x] Harden KDS station actions — role check, ownership verification, tenant filtering
- [x] Validate client-provided IDs against auth context (VALIDATE_CLIENT_IDS rule)

### Accessibility & Quality
- [x] WCAG AAA accessibility fixes across admin components
- [x] Accessibility improvements across all modules
- [x] State machine documentation for order flow
- [x] CLAUDE.md workflow restructure

## Completed: Post-MVP Sprint 2 — Production Resilience

### Loading States (24 loading.tsx files)
- [x] Admin routes (10), POS routes (6), KDS routes (2), Customer routes (6)
- [x] Reusable skeleton components

### Error Boundaries (9 files)
- [x] Route group level (4) — admin, pos, kds (dark), customer (mobile)
- [x] Critical sub-routes (4) — pos/orders, pos/cashier, pos/order/[orderId], kds/[stationId]
- [x] Menu detail error boundary — admin/menu/[menuId]
- [x] Global not-found.tsx

### Rate Limiting
- [x] `@comtammatu/security` — Upstash Redis sliding window rate limiter
- [x] authLimiter (5/60s), webhookLimiter (10/60s), apiLimiter (30/60s)

### Zod v4 Compatibility Fixes
- [x] `.error.errors` -> `.error.issues`, `required_error` -> `error` in `z.enum()`, `z.record()` fix

## Completed: Post-MVP Sprint 3 — Menu & Devices

### Menu System Restructure
- [x] Category types, side dishes, and item notes
- [x] Harden validation, variant handling, and DB constraints
- [x] Handle menu query errors and batch side validation

### Device & POS Management
- [x] Device approval flow and fingerprinting for terminal registration
- [x] Move printer settings to POS/KDS (Peripheral config)
- [x] Require `table_id` and `guest_count` for dine-in orders
- [x] KDS connection redesign

## Completed: Post-MVP Sprint 4 — Payroll, Analytics & Quality

### Payroll Module (HR)
- [x] DB migration — payroll_periods, payroll_entries tables
- [x] Zod schemas, constants, server actions
- [x] Admin UI — /admin/hr payroll tab: period list, calculate, approve flow
- [x] Employee Portal — /employee/payroll: view pay stubs

### Branch Comparison Dashboard
- [x] Server Actions — getBranchComparison (revenue, orders, avg ticket by branch + date range)
- [x] Admin UI — /admin/dashboard branch comparison tab with bar charts

### E2E Testing Foundation
- [x] Playwright setup — config, fixtures, auth helpers
- [x] Critical flow tests: auth, order flow, menu CRUD, employee attendance
- [x] 4 spec files: auth.spec.ts, order-flow.spec.ts, menu-crud.spec.ts, attendance.spec.ts

### Advanced Inventory Features
- [x] Partial PO receiving, stock counts, prep list, food cost, expiry tracking
- [x] Admin UI tabs, urgent restock from KDS, price anomaly alerts
- [x] getBranchIdsForTenant helper to deduplicate 7 queries
- [x] 4 rounds of code review fixes (RBAC, error handling, schema safety, ownership)

### Verification
- [x] Typecheck, lint, build all pass
- [x] CI green

---

## Current State Summary (2026-03-06)

### What Exists Now
| Module | Routes | Status |
|--------|--------|--------|
| Auth | /login | Done |
| Admin Dashboard | /admin | Done (charts, branch comparison) |
| Menu Management | /admin/menu, /admin/menu/[menuId] | Done (categories, sides, notes) |
| CRM | /admin/crm | Done (customers, loyalty, vouchers, feedback) |
| HR | /admin/hr | Done (employees, shifts, schedule, attendance, leave, payroll) |
| Inventory | /admin/inventory | Done (ingredients, stock, POs, recipes, suppliers, food cost, expiry) |
| Security | /admin/security | Done (events, audit logs) |
| Payments | /admin/payments | Done |
| Orders (Admin) | /admin/orders | Done |
| Reports | /admin/reports | Exists (page created) |
| Settings | /admin/settings | Exists (page created) |
| Terminals | /admin/terminals | Done (device approval, fingerprinting) |
| KDS Stations | /admin/kds-stations | Done |
| POS | /pos, /pos/orders, /pos/order/new, /pos/order/[orderId], /pos/cashier, /pos/session | Done |
| POS Printer | /pos/printer | Done |
| KDS | /kds, /kds/[stationId], /kds/printer | Done |
| Customer PWA | /customer (6 pages) | Done |
| Employee Portal | /employee (5 pages: home, schedule, profile, workspace, leave, payroll) | Done |
| Privacy API | /api/privacy/* | Done |

**37 page routes, 20 action files, 16 Zod schema files, 4 E2E spec files**

### Infrastructure
- 24 loading.tsx skeletons, 9 error boundaries
- Rate limiting on auth, webhooks, privacy APIs
- Momo payment integration (cash + QR)
- Realtime subscriptions (orders, tables, KDS tickets)
- Device fingerprinting & approval flow
- Printer config for POS & KDS

---

## In Progress: Post-MVP Sprint 5 — Offline & Resilience

### POS Offline Support
- [x] IndexedDB utility module — pending orders, menu cache, table cache stores
- [x] Service Worker — POS asset caching (stale-while-revalidate), navigation fallback
- [x] Offline order queue — queue orders in IndexedDB when offline, sync on reconnect
- [x] Online/offline detection hook — `useOnlineStatus` with `useSyncExternalStore`
- [x] Sync-on-reconnect hook — auto-sync pending orders with toast notifications
- [x] Offline indicator component — status badge in POS header (online/offline/syncing)
- [x] Order creation offline path — queue to IndexedDB when offline, normal flow when online
- [x] SW registration in POS layout + offline fallback page
- [x] PWA manifest for POS standalone mode
- [x] next.config.ts — SW headers (no-cache, Service-Worker-Allowed)
- [x] Build verification — lint, build pass

---

## Remaining Roadmap

### Priority 1 — Offline & Resilience (Remaining)
```text
- [x] Offline support — Service Worker + IndexedDB for POS reliability ✓
- [ ] Offline menu/table caching (pre-populate IndexedDB from server data)
- [ ] Pending orders UI (view/retry/discard queued orders)
```

### Priority 2 — Quality & Compliance
```text
- [ ] RLS validation test suite (verify all policies per role)
- [ ] API documentation (OpenAPI spec for privacy + webhook endpoints)
- [ ] Admin reports page — build out actual report content
- [ ] Admin settings page — build out actual settings management
```

### Priority 3 — Growth Features
```text
- [ ] Campaigns & notifications (email/SMS/push marketing)
- [ ] Customer ordering (online menu -> place order via PWA)
- [ ] Multi-branch reporting & analytics (beyond current comparison)
- [ ] Inventory forecasting (based on order history)
- [ ] Staff performance metrics
```

### Priority 4 — Operational Polish
```text
- [ ] Retention cron jobs (auto-delete after 30-day GDPR grace period)
- [ ] Auto-tier upgrade triggers (auto-promote on points threshold)
- [ ] VNPay payment integration (if Momo QR insufficient)
```

### Excluded (not planned)
```text
- [--] VNPay — Momo QR sufficient for current operations
```
