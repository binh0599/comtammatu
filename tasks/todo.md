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

## Next Phase: Week 7-8 — CRM, Privacy & Polish

- [ ] Customer profiles, loyalty points, loyalty tiers
- [ ] Vouchers & promotions (percent/fixed/free item, branch-scoped)
- [ ] Customer PWA (menu browsing, order tracking, feedback)
- [ ] GDPR — deletion requests, DSAR export, retention cron jobs
- [ ] Testing — E2E for critical flows, RLS validation suite
- [ ] Documentation — API docs, user guide, deployment runbook
