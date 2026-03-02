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

## Next Phase: Week 5-6 — Operations

### Inventory Management
- [ ] Stock levels per branch with optimistic concurrency (`version` column)
- [ ] Stock movements (in, out, transfer, waste, adjust)
- [ ] Recipes linked to menu items
- [ ] Auto-deduction on order completion
- [ ] Low stock alerts

### Suppliers
- [ ] Supplier management (CRUD)
- [ ] Purchase orders (create, receive)

### HR Basic
- [ ] Employee profiles linked to user accounts
- [ ] Shift scheduling and assignment
- [ ] Attendance records
- [ ] Leave requests

### Admin Dashboard
- [ ] Revenue reports (daily, weekly, monthly)
- [ ] Daily summary (orders, payments, top items)
- [ ] Branch comparison charts

### Security Monitoring
- [ ] Security events dashboard
- [ ] Failed login monitoring
- [ ] Terminal heartbeat / last-seen tracking

## Future: Week 7-8 — CRM, Privacy & Polish

- [ ] Customer profiles, loyalty points, loyalty tiers
- [ ] Vouchers & promotions
- [ ] Customer PWA (menu browsing, order tracking, feedback)
- [ ] GDPR — deletion requests, DSAR export, retention cron jobs
- [ ] Testing — E2E for critical flows, RLS validation suite
- [ ] Documentation — API docs, user guide, deployment runbook
