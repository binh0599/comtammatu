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

## Current State Summary (2026-03-13)

### What Exists Now

| Module             | Routes                                                                              | Status                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Auth               | /login                                                                              | Done                                                                            |
| Admin Dashboard    | /admin                                                                              | Done (charts, branch comparison)                                                |
| Menu Management    | /admin/menu, /admin/menu/[menuId]                                                   | Done (categories, sides, notes)                                                 |
| CRM                | /admin/crm                                                                          | Done (customers, loyalty, vouchers, feedback)                                   |
| HR                 | /admin/hr                                                                           | Done (employees, shifts, schedule, attendance, leave, payroll, performance)     |
| Inventory          | /admin/inventory                                                                    | Done (ingredients, stock, POs, recipes, suppliers, food cost, expiry, forecast) |
| Security           | /admin/security                                                                     | Done (events, audit logs)                                                       |
| Payments           | /admin/payments                                                                     | Done                                                                            |
| Orders (Admin)     | /admin/orders                                                                       | Done                                                                            |
| Reports            | /admin/reports                                                                      | Done (revenue, peak hours, category mix, branch analytics)                      |
| Settings           | /admin/settings                                                                     | Done (tenant info, tax/service charge, branch management)                       |
| Terminals          | /admin/terminals                                                                    | Done (device approval, fingerprinting)                                          |
| KDS Stations       | /admin/kds-stations                                                                 | Done                                                                            |
| Tables             | /admin/tables                                                                       | Done (CRUD, floor plan, reservations)                                           |
| Campaigns          | /admin/campaigns                                                                    | Done (CRUD, schedule, send, segments)                                           |
| Notifications      | /admin/notifications                                                                | Done (inventory alerts, severity badges)                                        |
| POS                | /pos, /pos/orders, /pos/order/new, /pos/order/[orderId], /pos/cashier, /pos/session | Done                                                                            |
| POS Printer        | /pos/printer                                                                        | Done                                                                            |
| POS Offline        | /pos/pending                                                                        | Done (IndexedDB queue, SW, sync-on-reconnect)                                   |
| KDS                | /kds, /kds/[stationId], /kds/printer                                                | Done (ESC/POS, Web Serial, auto-print)                                          |
| Customer PWA       | /customer (6 pages + cart + ordering)                                               | Done                                                                            |
| Employee Portal    | /employee (home, schedule, profile, workspace, leave, payroll)                      | Done                                                                            |
| Privacy API        | /api/privacy/\*                                                                     | Done                                                                            |
| Cron Jobs          | /api/cron/\*                                                                        | Done (deletions, tier upgrade, inventory alerts, view refresh)                  |
| Push Notifications | /api/push/\*                                                                        | Done (VAPID, SW handlers, order/inventory/campaign triggers)                    |

**40+ page routes, 20+ action files (split into 16 sub-modules), 16 Zod schema files, 13 E2E spec files**

### Infrastructure

- 24 loading.tsx skeletons, 23 error boundaries
- Rate limiting on auth, webhooks, privacy APIs, payments, orders, campaigns
- Account lockout (5 failed attempts → 15-min lock)
- Security headers (CSP hardened, HSTS preload, COOP, CORP, Permissions-Policy)
- Momo payment integration (cash + QR)
- Realtime subscriptions (orders, tables, KDS tickets)
- Device fingerprinting & approval flow
- ESC/POS kitchen printing (Web Serial API)
- POS offline mode (Service Worker + IndexedDB + sync queue)
- Web Push Notifications (VAPID + SW handlers)
- PWA manifests for POS + Customer
- Structured logging (JSON prod / pretty dev) + error reporter abstraction
- React Query + Zustand state management (4 query hooks, 6 mutation hooks with optimistic updates, 4 UI stores)
- 3 Supabase RPC functions (atomic payment, order creation, stock count)
- 13 database indexes (6 pg_trgm GIN + 7 partial/composite)
- Performance: dynamic imports, optimizePackageImports, ISR, image optimization
- 502 unit tests (Vitest), 13 E2E spec files (Playwright)

### Refactoring Status

| Wave   | Focus                                                       | Status |
| ------ | ----------------------------------------------------------- | ------ |
| Wave 1 | Code splitting, error boundaries, DB indexes                | Done   |
| Wave 2 | React Query, Zustand, DB transaction RPCs                   | Done   |
| Wave 3 | Structured logging, unit tests, optimistic updates          | Done   |
| Wave 4 | CSP hardening, account lockout, rate limiting, security E2E | Done   |
| Wave 5 | ~~i18n~~, UI package consolidation, WCAG audit              | Done   |
| Wave 6 | CQRS materialized views, integration tests                  | Done   |

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

## Completed: Post-MVP Sprint 6 — Growth Features (Phase 3)

### Campaign Management (/admin/campaigns)

- [x] Server Actions — CRUD, schedule, send with target segment matching
- [x] Admin UI — campaign table, create/edit dialog, schedule dialog, stats cards
- [x] Loading skeleton

### Customer Online Ordering (/customer)

- [x] Cart context with localStorage persistence
- [x] Cart drawer — quantity controls, voucher code input, order type selector
- [x] Place order action — price lookup, tax/service charge, order creation
- [x] Order confirmation page (/customer/orders/[orderId])
- [x] Menu browser updated with "Add to cart" buttons

### Multi-Branch Analytics (/admin/reports)

- [x] Branch analytics — revenue, orders, avg ticket per branch
- [x] Peak hours heatmap — hourly x day-of-week order volume
- [x] Category mix breakdown per branch

### Inventory Forecasting (/admin/inventory)

- [x] Demand forecast — 30-day historical usage -> projected need
- [x] Days-until-stockout with color-coded urgency
- [x] Forecast tab with days-ahead selector and branch filter

### Staff Performance (/admin/hr)

- [x] Role-specific KPIs — waiters (orders), cashiers (payments), chefs (prep time)
- [x] Attendance rate tracking
- [x] Performance tab with date range and role filters

### Verification

- [x] Typecheck, lint (0 errors), build all pass

## Completed: Post-MVP Sprint 7 — Operational Polish (Phase 4)

### GDPR Retention (already existed)

- [x] Vercel cron job `/api/cron/process-deletions` — daily 3 AM UTC
- [x] Supabase Edge Function `process-deletion-requests` — backup processor
- [x] 30-day grace period on deletion requests
- [x] Anonymize PII, null order refs, delete loyalty/feedback, audit log

### Auto-Tier Upgrade

- [x] Inline upgrade in `adjustLoyaltyPoints` — after earning points, auto-promote to highest qualifying tier
- [x] Batch cron `/api/cron/upgrade-tiers` — daily 4 AM UTC, checks all active customers against tier thresholds
- [x] vercel.json updated with upgrade-tiers schedule

### Verification

- [x] Typecheck, lint (0 errors), build all pass

---

## Completed: Post-MVP Sprint 8 — Inventory Alerts, Kitchen Printing, Table Management

### Inventory Alerts (/admin/notifications)

- [x] Cron job `/api/cron/inventory-alerts` — daily 5 AM UTC, low stock + expiry alerts
- [x] Admin notification center — severity badges, color-coded rows, summary cards
- [x] Notification bell in admin header — 24h unread count badge
- [x] Alerts stored in `security_events` (no new tables needed)

### Kitchen Printing (ESC/POS)

- [x] ESC/POS command library — `kds/lib/escpos.ts`, KDS ticket + POS receipt templates
- [x] Web Serial API hook — `use-serial-printer.ts`, connect/disconnect/print
- [x] Auto-print on new KDS ticket arrival via realtime subscription
- [x] Manual print button on each KDS ticket card
- [x] POS printer config updated with Web Serial connection

### Table Management (/admin/tables)

- [x] Admin CRUD — create, edit, delete, status change with zone/branch filters
- [x] Floor plan tab — visual grid grouped by zone, color-coded by status
- [x] Table list tab — data table with inline status change
- [x] Reservation tab — reserved table quick actions (seated/cancel/no-show)
- [x] Zod schemas + constants (RESERVATION_STATUSES, TABLE_SECTIONS)

### Verification

- [x] Typecheck, lint (0 errors), build all pass

---

## Completed: Post-MVP Sprint 9 — Push Notifications & Performance

### Web Push Notifications

- [x] `web-push` package + VAPID key management (`lib/web-push.ts`)
- [x] `push_subscriptions` DB migration with RLS policies
- [x] Push subscription API route (`POST/DELETE /api/push/subscribe`)
- [x] Service Worker push/notification-click handlers
- [x] `usePushNotifications` client hook (subscribe/unsubscribe/permission)
- [x] Push triggers — order status -> staff, inventory alerts -> managers, campaign send -> customers
- [x] `PushNotificationToggle` component on customer account page
- [x] Admin NotificationBadge upgraded to popover with push toggle
- [x] Zod schemas, constants, labels for push notification types
- [x] Global SW registration (root layout) for push across all routes

### Performance Optimization

- [x] Dynamic import recharts in reports analytics-tab and HR performance-tab
- [x] `optimizePackageImports` for lucide-react, recharts, date-fns
- [x] Image optimization config (avif/webp, cache TTL, device sizes)
- [x] DNS prefetch + preconnect for Supabase host
- [x] Viewport export with theme color
- [x] `revalidate=300` for public menu page (ISR)
- [x] React strict mode enabled
- [x] Service Worker scope widened from `/pos` to `/` for all app routes

### Verification

- [x] Typecheck, lint (0 errors), build all pass

---

## Completed: Refactoring Wave 1 — Foundation

### Code Organization

- [x] Split 5 monolithic action files (3100+ lines) into 16 domain sub-modules
  - HR (873 lines) → employees, shifts, attendance, leave, payroll
  - CRM (671 lines) → customers, loyalty, vouchers, feedback
  - Menu → menus, categories, items
  - Campaigns → campaigns, analytics
  - Employee portal → profile, leave, schedule, payroll, attendance
- [x] Barrel re-exports (`actions/index.ts`) for backward compatibility
- [x] Fix `@comtammatu/database` package.json exports map (clean + `/src/` paths)
- [x] 14 error boundaries for all admin subroutes

### Database Performance

- [x] Enable pg_trgm extension + 6 GIN trigram indexes for fuzzy search
- [x] 7 partial/composite indexes for common query patterns
  - Active/completed orders, KDS tickets, security events, stock levels, payments, loyalty

### Verification

- [x] Typecheck + build all pass (7/7 turbo tasks)

## Completed: Refactoring Wave 2 — State + DB

### State Management

- [x] `@tanstack/react-query` — QueryProvider, query key factory, 4 query hooks, 3 mutation hooks
- [x] `zustand` — 4 UI stores (POS cart, KDS board, admin panel, notifications)
- [x] Root layout wrapped with QueryProvider

### Database Atomicity

- [x] 3 Supabase RPC functions deployed:
  - `process_payment_and_complete_order` — atomic payment + order completion + table release
  - `create_order_with_items` — atomic order + items + table status
  - `approve_stock_count` — atomic count approval + stock adjustments
- [x] SECURITY DEFINER with SET search_path = public
- [x] GRANT EXECUTE TO authenticated

### Type Safety

- [x] Improved SupabaseClient type documentation with TODO for future Database type sharing

### Verification

- [x] Typecheck + build all pass (7/7 turbo tasks)
- [x] Migration applied to Supabase project zrlriuednoaqrsvnjjyo

---

## Completed: Refactoring Wave 3 — Testing + Monitoring

### Structured Logging & Error Reporting

- [x] Structured logger (`packages/shared/src/server/logger.ts`) — JSON (prod) / pretty (dev)
- [x] Error reporter abstraction (`packages/shared/src/server/error-reporter.ts`) — replaceable with Sentry
- [x] Integrated error reporter into `withServerAction` wrapper
- [x] Exported logger + error reporter from `@comtammatu/shared`

### Health Check Enhancement

- [x] Enhanced `/api/health` — parallel DB + Supabase checks, degraded status, uptime tracking

### Unit Test Infrastructure (Vitest)

- [x] 502 tests passing across 9 test files (schemas, utils, constants, RLS specs)
- [x] Test files: order, payment, menu, pos, format, errors, constants (x2), rls-policy-spec

### Optimistic Updates (POS/KDS)

- [x] `useCreateOrderMutation` — cancel queries, invalidate on success/error
- [x] `useUpdateOrderStatusMutation` — snapshot + optimistic cache update + rollback
- [x] `useBumpTicketMutation` — optimistic remove/update + rollback
- [x] `useRecallTicketMutation` — optimistic set pending + rollback
- [x] `useOptimisticCart` hook — Zustand cart + React Query mutation
- [x] `useRealtimeKds` hook — React Query + Supabase Realtime + optimistic mutations

### Verification

- [x] Typecheck + build all pass (7/7 turbo tasks)
- [x] 502 unit tests pass

---

## Completed: Refactoring Wave 4 — Security + Quality

### CSP & Security Headers

- [x] Tighten CSP — remove `unsafe-eval` in production, add `object-src 'none'`, `upgrade-insecure-requests`
- [x] HSTS preload — increase max-age to 2 years + preload directive
- [x] Add `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Resource-Policy: same-origin`
- [x] Permissions-Policy updated — add `payment=()`, `usb=(self)` for Web Serial
- [x] X-XSS-Protection set to `0` (modern recommendation — CSP supersedes)

### Account Lockout

- [x] Redis-based account lockout after 5 failed login attempts (15-minute window)
- [x] `checkAccountLockout()`, `recordFailedLogin()`, `clearFailedLogins()` in `@comtammatu/security`
- [x] Login action integrated — shows remaining attempts, lockout duration message

### Rate Limiting Expansion

- [x] `paymentLimiter` (10 req/60s) — added to `processPayment` action
- [x] `orderLimiter` (20 req/60s) — added to `createOrder` action
- [x] `campaignLimiter` (3 req/300s) — added to `sendCampaign` action
- [x] Shared Redis instance — reuse connection across all limiters

### Security E2E Tests

- [x] RBAC access control — unauthenticated redirect for /admin, /pos, /kds
- [x] Customer cannot access /admin
- [x] Login form security — password field type, empty/invalid credential handling
- [x] HTTP security headers verification (CSP, HSTS, COOP, X-Content-Type-Options, etc.)
- [x] API route authentication checks (privacy endpoints)
- [x] Admin + POS sub-route protection (9 admin routes, 3 POS routes)

### Verification

- [x] Typecheck + build all pass (7/7 turbo tasks)
- [x] Lint: 0 errors, 97 warnings (all pre-existing)

---

## Completed: Refactoring Wave 5 — UI + Accessibility

### ~~i18n Framework~~ — Skipped (chỉ phục vụ khách nội địa, không cần đa ngôn ngữ hiện tại)

### UI Package Consolidation (`@comtammatu/ui`)

- [x] Audit shared components — 26 shadcn primitives + 6 composites identified
- [x] Move shadcn/ui components from `apps/web/components/ui/` → `packages/ui/src/`
- [x] Move `cn()` utility → `packages/ui/src/lib/utils.ts`
- [x] Move `useIsMobile` hook → `packages/ui/src/hooks/use-mobile.ts`
- [x] Create barrel export `packages/ui/src/index.ts` (26 components + cn + useIsMobile)
- [x] Update 126 consumer files — all `@/components/ui/*` → `@comtammatu/ui`
- [x] Update 17 consumer files — all `@/lib/utils` (cn) → `@comtammatu/ui`
- [x] Package.json deps (cva, radix-ui, lucide-react, vaul, react-day-picker, sonner, next-themes peer)
- [x] Package.json exports map (`"."` + `"./src/*"`)
- [x] Update `components.json` shadcn alias → `../../packages/ui/src`
- [x] Verify: typecheck + build all pass (7/7 turbo tasks)
- [x] Create composite components: `DataTable`, `StatusBadge`, `ConfirmDialog`, `StatCard` (2026-03-13)

### WCAG Accessibility Audit

- [x] Install `@axe-core/react` + dev-mode integration (AxeDev component in root layout)
- [x] Verify all layouts have `<main id="main-content">` landmark (all 5 layouts ✓)
- [x] Verify `lang="vi"` on `<html>` and skip link present (✓)
- [x] aria-live regions — cart total, order queue list (POS)
- [x] Semantic list structure — `role="list"` + `role="listitem"` on cart items, order queue
- [x] Form accessibility — `aria-required`, `aria-describedby`, `<fieldset>`+`<legend>` on customer form
- [x] Login form — `aria-describedby` on password field for error announcements
- [x] Table accessibility — `aria-label` on orders history table
- [x] Touch targets verified — POS/KDS buttons already ≥44x44px
- [x] Existing a11y patterns verified: 82 aria-labels, decorative icons hidden, Radix focus traps

---

## Completed: Refactoring Wave 6 — CQRS + Integration Tests

### CQRS Materialized Views

- [x] `mv_daily_revenue` — branch/day revenue, orders, tips, avg ticket
- [x] `mv_daily_payment_methods` — branch/day payment method breakdown
- [x] `mv_daily_order_type_mix` — branch/day order type counts + revenue
- [x] `mv_item_popularity` — branch/day item sales + revenue by menu item
- [x] `mv_staff_performance` — waiter orders + cashier payments per day
- [x] `mv_inventory_usage` — branch/day ingredient usage from recipe ingredients
- [x] `mv_peak_hours` — branch/weekday/hour order aggregation (Asia/Ho_Chi_Minh TZ)
- [x] `refresh_materialized_views()` RPC — SECURITY DEFINER, CONCURRENTLY refresh all 7 MVs
- [x] All MVs have UNIQUE indexes for CONCURRENTLY support
- [x] Refresh cron job `/api/cron/refresh-views` — daily 2:30 AM UTC
- [x] Refactored report actions → query MVs in parallel (reports, analytics, performance, forecast)
- [x] Regenerated `database.types.ts` after migration
- [x] Migration applied to Supabase project zrlriuednoaqrsvnjjyo
- [x] Verify: typecheck + build all pass (7/7 turbo tasks)

### Integration Tests

- [x] Test helpers (`tests/integration/helpers.ts`) — createAuthClient, createServiceClient, assertSuccess, assertBlocked, cleanupRows, waitFor
- [x] `auth.test.ts` — login valid/invalid, getUser, sign out
- [x] `rls-isolation.test.ts` — cross-tenant isolation, customer data scoping, anon client blocked
- [x] `order-lifecycle.test.ts` — create order, status transitions, payment, completion
- [x] `inventory-flow.test.ts` — PO create → status transitions → receive → stock levels
- [x] `crm-loyalty.test.ts` — loyalty tiers, earn points, balance tracking
- [x] `payment.test.ts` — POS session, cash payment insert, amount verification
- [x] `realtime-triggers.test.ts` — order_number generation, KDS ticket auto-creation
- [x] `materialized-views.test.ts` — 6 MVs: revenue, payments, items, peak hours, staff, inventory
- [x] Vitest config (`tests/integration/vitest.config.ts`) — 30s timeout, node env
- [x] Exclude integration tests from CI unit test run (`packages/shared/vitest.config.ts` — exclude `tests/integration/**`)
- [ ] Run integration tests against live DB (requires adding `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` secrets to GitHub Actions)

---

## Remaining Roadmap (All Priorities Complete)

### Priority 1 — Offline & Resilience (Completed)

```text
- [x] Offline support — Service Worker + IndexedDB for POS reliability
- [x] Offline menu/table caching — useMenuCache/useTableCache hooks
- [x] Pending orders UI — /pos/pending page (view/retry/discard)
```

### Priority 2 — Quality & Compliance (Completed)

```text
- [x] RLS validation test suite — 252 tests (tests/rls/rls-policy-spec.test.ts)
- [x] API documentation — OpenAPI 3.1 spec (docs/openapi.yaml)
- [x] Admin reports page — date-range revenue, payment methods, top items
- [x] Admin settings page — tenant info, tax/service charge, branch management
```

### Priority 3 — Growth Features (Completed)

```text
- [x] Campaigns & notifications — admin CRUD, schedule/send, target segments
- [x] Customer ordering — cart, checkout, place order via PWA, order confirmation
- [x] Multi-branch analytics — branch comparison, peak hours heatmap, category mix
- [x] Inventory forecasting — demand prediction, days-until-stockout, urgency badges
- [x] Staff performance metrics — role-specific KPIs (waiter/cashier/chef), attendance rate
```

### Priority 4 — Operational Polish (Completed)

```text
- [x] Retention cron jobs — already implemented (process-deletions cron at 3 AM UTC, 30-day grace period)
- [x] Auto-tier upgrade triggers — inline upgrade in adjustLoyaltyPoints + daily batch cron at 4 AM UTC
- [--] VNPay — excluded, Momo QR sufficient for current operations
```

---

## Các vấn đề còn tồn đọng (Known Issues & Cleanup — 2026-03-13)

### Bug / Cần sửa

- [x] **Monolithic actions.ts đã xóa** — 5 file `actions.ts` cũ đã được xóa (2026-03-13). Barrel exports từ `actions/index.ts` hoạt động đúng.
- [x] **Integration tests đã thêm vào CI** — job `integration-test` trong `.github/workflows/ci.yml` (2026-03-13). Cần add secrets `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` trong GitHub repo Settings → Secrets.

### Cải thiện (Nice-to-have)

- [x] Composite UI components cho `@comtammatu/ui`: `DataTable`, `StatusBadge`, `ConfirmDialog`, `StatCard` (2026-03-13)
- [x] Shared `Database` type giữa các packages — `SupabaseClient<Database>` thay thế `any` (2026-03-13). Giảm từ 31 → 7 `as any` casts (còn lại: push_subscriptions chưa có trong DB, dynamic table helpers)
- [x] `getTaxSettings()` utility function thay vì hardcode system_settings keys (2026-03-13)
- [ ] Sentry integration thay thế error-reporter stub — **Deferred**: cần SENTRY_DSN + external setup

### Đã hoàn thành tất cả

- Tất cả 4 Priority roadmap items ✓
- Tất cả 6 Refactoring Waves ✓
- 9 Post-MVP Sprints ✓
- 40+ routes, 502 unit tests, 13 E2E specs, 8 integration tests
- Hệ thống sẵn sàng cho production pilot
