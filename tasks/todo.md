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

## Next Phase: Week 3-4 — Split POS & Orders

- [ ] Terminal Management (mobile_order + cashier_station)
- [ ] Mobile Order (Waiter) — create/edit orders, select tables
- [ ] Cashier Station — view orders, process payments, shifts
- [ ] Payment: Cash + VNPay/Momo
- [ ] Order Lifecycle (order status flow)
- [ ] KDS — kitchen display, ticket routing
- [ ] Offline support (basic)
