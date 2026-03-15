# Todo — V4.1 Migration Plan & Progress

> Aligned with Master Plan V4.1 (March 2026)
> Source of truth: `comtammatu_master_plan_v4.1.md` + `comtammatu_v4_synthesis.html`

---

## V2 → V4.1 Completed Work (Archive)

Tất cả MVP + 9 Post-MVP Sprints + 6 Refactoring Waves đã hoàn thành.
Chi tiết: xem git log từ Feb → Mar 2026.

**Tóm tắt V2 deliverables:**
- 57 pages + 20 API routes, 4 role-based UIs (Admin, POS, KDS, Employee)
- 87 database tables, 36 migrations, 8 materialized views, 9 RPC functions
- 502 unit tests, 13 E2E specs, 8 integration tests
- POS offline (Service Worker + IndexedDB), KDS realtime, ESC/POS printing
- CRM, Loyalty, Campaigns, Payroll, Inventory with food cost
- Rate limiting, account lockout, CSP hardening, WCAG accessibility
- React Query + Zustand state management, CQRS materialized views

---

## V4.1 Migration — Pre-Sprint (Tuần 1–2)

> **Mục tiêu:** Foundation vững. Không feature mới cho đến khi xong.
> **Timeline:** 2026-03-16 → 2026-03-29

### A6 — CI/QA (GATEKEEPER)

- [ ] Fix tất cả lint errors (root cause, KHÔNG `// eslint-disable`)
- [ ] Bật branch protection rules trên `main`
- [ ] Thiết lập 8 required status checks: `typecheck`, `unit-tests`, `lint`, `security-scan`, `build`
- [ ] Auto-cancel outdated workflow runs
- [ ] Khôi phục Flutter CI

### A1 — Architect (TIEBREAKER)

- [ ] ADR-001: URL structure & scope rules (`/b/[brandId]/br/[branchId]/...`)
- [ ] ADR-002: Query strategy (supabase-js primary, Prisma chỉ migrations)
- [ ] ADR-003: Schema-per-module plan (11 schemas)

### A3 — Database

- [ ] Migration M001: rename `tenant_id` → `brand_id` toàn schema
- [ ] Alias view `brand_tenants` cho backward compat
- [ ] Update `database.types.ts` sau migration

### A4 — Auth & RBAC

- [ ] Tạo `packages/auth/nav-config.ts` với full type definitions
- [ ] Xóa 3 bản duplicate nav mapping hiện có
- [ ] Export `UserRole`, `ScopeIds` types

### Done Condition

- [ ] CI xanh trên `main`
- [ ] `brand_id` migration chạy thành công trên staging
- [ ] `nav-config.ts` tạo xong, tất cả nav imports trỏ về 1 file

---

## V4.1 Migration — Sprint 0 (Tuần 3–4)

> **Mục tiêu:** Scope System hoạt động end-to-end
> **Timeline:** 2026-03-30 → 2026-04-12

### A2 — Frontend

- [ ] Route groups `(brand)` + `(branch)` trong Next.js App Router
- [ ] Build `ScopeContextBar` component
- [ ] Integrate `useScope()` hook
- [ ] Update `layout.tsx` với ScopeContextBar mandatory

### A3 — Database

- [ ] Custom access token hook: inject `brand_id + user_role` vào JWT
- [ ] RLS policies dùng `auth.jwt()` trực tiếp (không subquery join)
- [ ] Test isolation: 2 brand accounts không đọc được data nhau

### A4 — Auth & RBAC

- [ ] `BrandScopeProvider` + `BranchScopeProvider` components
- [ ] `getNavItems(role, scope)` function
- [ ] Login redirect logic theo role
- [ ] `has_role()` SECURITY DEFINER function

### A5 — Integration

- [ ] Provision Supabase Vault: secret slots cho PayOS, VNPay, Zalo OA, GrabFood, MISA
- [ ] SECURITY DEFINER functions cho Edge Functions đọc secrets

### A6 — CI/QA

- [ ] Playwright test: login → ScopeContextBar hiển thị đúng
- [ ] Test scope switching URL
- [ ] Secrets scan codebase

### Done Condition

- [ ] ScopeContextBar hiển thị brand/branch name chính xác trên mọi trang
- [ ] URL thay đổi khi user switch brand/branch
- [ ] JWT custom claims hook hoạt động — `brand_id` có trong token
- [ ] RLS test: user brand A không đọc được data brand B

---

## V4.1 Migration — Sprint 1 (Tuần 5–6)

> **Mục tiêu:** 8 modules đúng scope + PayOS live
> **Timeline:** 2026-04-13 → 2026-04-26

### A2 — Frontend

- [ ] Move brand pages vào `/b/[brandId]/`
- [ ] Move branch pages vào `/b/[brandId]/br/[branchId]/`
- [ ] Tách Settings thành 2 route: `/settings/brand` + `/settings/branch`

### A3 — Database

- [ ] Bảng mới: `refunds`, `settlement_batches`, `payment_webhooks`
- [ ] UNIQUE constraint `customers(brand_id, phone)`
- [ ] Junction table `menu_branch_assignments` thay thế `menus.branches UUID[]`

### A4 — Auth & RBAC

- [ ] Route middleware guards cho 8 modules
- [ ] Settings route permissions
- [ ] Test RBAC matrix 4 roles

### A5 — Integration

- [ ] Edge Function `create-payment-link`: tạo PayOS QR
- [ ] Edge Function `payos-webhook`: HMAC + idempotency + update payments
- [ ] Test full payment flow staging

### A6 — CI/QA

- [ ] E2E: không còn flat routes
- [ ] Payment flow integration test

### Done Condition

- [ ] Không còn route thiếu `brand_id` prefix
- [ ] PayOS QR hoạt động end-to-end

---

## V4.1 Migration — Sprint 2 (Tuần 7–8)

> **Mục tiêu:** E-invoicing live + Schema-per-module
> **Timeline:** 2026-04-27 → 2026-05-10

- [ ] Schema migration: tạo 11 module schemas, move tables theo batch
- [ ] E-invoicing Edge Function: `einvoice-submit` → Viettel S-Invoice
- [ ] VNPay HMAC webhook integration
- [ ] Settings/brand UI: payment config, HĐĐT provider, Zalo OA
- [ ] Settings/branch UI: POS devices, giờ mở cửa

### Done Condition

- [ ] E-invoice tự động submit sau payment `completed`
- [ ] Schema migration 0 downtime

---

## V4.1 Migration — Sprint 3 (Tuần 9–10)

> **Mục tiêu:** GrabFood + ShopeeFood live
> **Timeline:** 2026-05-11 → 2026-05-24

- [ ] `grabfood-webhook` Edge Function: normalize order → internal schema, ACK 5s
- [ ] `shopeefood-webhook` Edge Function: HMAC SHA256
- [ ] `menu-sync` scheduled Edge Function (daily 3AM)
- [ ] Delivery module UI: incoming orders feed, accept/reject, platform toggle
- [ ] Thêm `source ENUM`, `external_order_id`, `commission_amount` vào orders

### Done Condition

- [ ] GrabFood webhook nhận và tạo đơn trong < 5s
- [ ] Menu sync daily hoạt động

---

## V4.1 Migration — Sprint 4 (Tuần 11–12)

> **Mục tiêu:** Zalo OA + SaaS onboarding + Flutter app launch
> **Timeline:** 2026-05-25 → 2026-06-07

- [ ] Zalo OA OAuth2 flow + `send-zalo-notification` Edge Function
- [ ] ZNS templates P0: `order_confirm`, `loyalty_update`
- [ ] SaaS brand onboarding: invite link, brand creation, setup wizard
- [ ] Materialized views: `customer_rfm_scores` (hourly), `daily_branch_financials` (15min)
- [ ] Analytics dashboard UI: RFM segments, daily financial charts
- [ ] Flutter app TestFlight submission

### Done Condition

- [ ] ZNS `order_confirm` gửi sau mỗi payment completed
- [ ] Flutter app CI green + submit TestFlight
- [ ] SaaS brand onboarding flow hoạt động end-to-end

---

## Tier 2 — Competitive Parity (Tháng 4–6, 2026)

- [ ] Reservation + waitlist system
- [ ] RFM segmentation + automated Zalo campaign triggers
- [ ] Financial reporting materialized views
- [ ] Inter-branch stock transfer workflow
- [ ] MoMo + ZaloPay e-wallet integration
- [ ] Payroll SI breakdown + part-time compliance
- [ ] Multi-brand platform dashboard

## Tier 3 — Differentiation (Tháng 7–12, 2026)

- [ ] BCG menu matrix
- [ ] AI demand forecasting
- [ ] Dynamic pricing (ingredient-cost-driven)
- [ ] Staff analytics (SPLH, upsell tracking)
- [ ] Zalo Mini App ordering
- [ ] VNPAY SmartPOS hardware integration

---

## Known Issues & Deferred Items

- [ ] Sentry integration thay thế error-reporter stub — cần SENTRY_DSN + external setup
- [ ] Integration tests in CI — cần add GitHub Secrets: `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] MFA (TOTP) cho admin/manager/owner roles
