# Cơm Tấm Má Tư — Master Architecture & Product Plan

> **Version:** 4.1 — Flutter + Zalo Mini App + SaaS Billing Edition
> **Date:** March 2026 | **Author:** Bình
> **Status:** Living Document — cập nhật sau mỗi Sprint Retrospective
>
> Tài liệu này hợp nhất: **Architecture V3.0** + **CRM Restructure Plan** + **API Plan** + **Flutter Component Tree** + **Zalo Mini App Architecture** + **SaaS Billing Flow** thành một nguồn sự thật duy nhất cho toàn dự án.

---

## Mục lục

**Phần I — Tổng quan & Tầm nhìn**
1. [Executive Summary](#1-executive-summary)
2. [Lịch sử phiên bản](#2-lịch-sử-phiên-bản)
3. [SaaS Platform Vision](#3-saas-platform-vision)

**Phần II — Engineering Health (Làm trước tất cả)**
4. [Baseline kỹ thuật hiện tại](#4-baseline-kỹ-thuật-hiện-tại)

**Phần III — Kiến trúc hệ thống**
5. [Stack & Infrastructure](#5-stack--infrastructure)
6. [Cấu trúc phân cấp: Platform → Brand → Branch](#6-cấu-trúc-phân-cấp)
7. [Multi-tenancy & Authentication](#7-multi-tenancy--authentication)
8. [Schema — Thiết kế cơ sở dữ liệu](#8-schema--thiết-kế-cơ-sở-dữ-liệu)

**Phần IV — CRM Restructure Plan (Scope Confusion Fix)**
9. [Root Causes & 3 Quyết định kiến trúc cốt lõi](#9-root-causes--3-quyết-định-kiến-trúc-cốt-lõi)
10. [URL & Route Structure](#10-url--route-structure)
11. [Scope System](#11-scope-system)
12. [8 Modules — Domain Grouping](#12-8-modules--domain-grouping)
13. [Navigation Architecture](#13-navigation-architecture)

**Phần V — API Plan**
14. [7 App Surfaces](#14-7-app-surfaces)
15. [API Architecture — 3 tầng](#15-api-architecture--3-tầng)
16. [Endpoints theo từng Role](#16-endpoints-theo-từng-role)
17. [Auth Flow theo Platform](#17-auth-flow-theo-platform)
18. [Realtime & Offline Architecture](#18-realtime--offline-architecture)

**Phần VI — Compliance & Tích hợp**
19. [Payment Architecture](#19-payment-architecture)
20. [E-invoicing — Decree 70/2025](#20-e-invoicing--decree-702025)
21. [Delivery Platform Integration](#21-delivery-platform-integration)
22. [Zalo OA / ZNS Integration](#22-zalo-oa--zns-integration)
23. [Analytics Layer](#23-analytics-layer)
24. [Compliance — Tax & Payroll](#24-compliance--tax--payroll)

**Phần VII — Team & Execution**
25. [6 Agent Roles](#25-6-agent-roles)
26. [Timeline Song Song — 12 tuần](#26-timeline-song-song--12-tuần)
27. [Chi tiết từng Sprint](#27-chi-tiết-từng-sprint)
28. [Dependencies Matrix](#28-dependencies-matrix)
29. [Handoff Protocol](#29-handoff-protocol)

**Phần VIII — Roadmap & Migration**
30. [Scope Checklist — Feature Gate](#30-scope-checklist--feature-gate)
31. [Roadmap 3 Tier](#31-roadmap-3-tier)
32. [Migration Path từ V2](#32-migration-path-từ-v2)
33. [Microservice Extraction Triggers](#33-microservice-extraction-triggers)

**Phần IX — Flutter App (V4.1)**
34. [Flutter App — Tổng quan & Repos](#34-flutter-app--tổng-quan--repos)
35. [Flutter Component Tree — Brand Manager](#35-flutter-component-tree--brand-manager)
36. [Flutter Component Tree — Staff App](#36-flutter-component-tree--staff-app)
37. [Flutter Component Tree — Customer Loyalty](#37-flutter-component-tree--customer-loyalty)
38. [Flutter State Management & Data Layer](#38-flutter-state-management--data-layer)
39. [Flutter Navigation Architecture](#39-flutter-navigation-architecture)
40. [Flutter Offline & Sync](#40-flutter-offline--sync)

**Phần X — Zalo Mini App (V4.1)**
41. [Zalo Mini App — Tổng quan & Scope](#41-zalo-mini-app--tổng-quan--scope)
42. [Zalo Mini App Component Tree](#42-zalo-mini-app-component-tree)
43. [Zalo Mini App — API & Auth Flow](#43-zalo-mini-app--api--auth-flow)
44. [Zalo Mini App — Loyalty & Ordering Flow](#44-zalo-mini-app--loyalty--ordering-flow)

**Phần XI — SaaS Billing (V4.1)**
45. [Billing Architecture — Tổng quan](#45-billing-architecture--tổng-quan)
46. [Subscription Lifecycle Flow](#46-subscription-lifecycle-flow)
47. [Billing Schema](#47-billing-schema)
48. [Payment Gateway cho SaaS Billing](#48-payment-gateway-cho-saas-billing)
49. [Usage Metering & Enforcement](#49-usage-metering--enforcement)
50. [Billing Edge Functions & Webhooks](#50-billing-edge-functions--webhooks)

**Phụ lục**
- [RBAC Role Matrix](#rbac-role-matrix)
- [Schema-per-Module Reference](#schema-per-module-reference)
- [Definition of Done per Sprint](#definition-of-done-per-sprint)
- [Decision Summary](#decision-summary)

---

# Phần I — Tổng quan & Tầm nhìn

## 1. Executive Summary

Cơm Tấm Má Tư là một **nền tảng F&B SaaS đa thương hiệu** được xây dựng cho thị trường Việt Nam, có khả năng phục vụ từ chuỗi nhỏ (5–10 chi nhánh) đến triển khai lớn (50–100 chi nhánh). Hệ thống bao gồm POS terminal, KDS, quản lý khách hàng, thanh toán, và tuân thủ các yêu cầu pháp lý Việt Nam (hóa đơn điện tử theo Nghị định 70/2025).

**V4.0 hợp nhất ba tài liệu riêng biệt thành một nguồn sự thật duy nhất:**

| Tài liệu gốc | Nội dung | Trạng thái trong V4.0 |
|---|---|---|
| Architecture V3.0 | Stack, schema, compliance, roadmap | Tích hợp toàn bộ |
| CRM Restructure Plan | Scope confusion fix, URL, navigation, 6 Agents | Tích hợp toàn bộ |
| API Plan | 7 surfaces, endpoints, auth, realtime | Bổ sung mới — chưa có trước đây |

**Ba vấn đề ưu tiên cao nhất hiện tại (theo thứ tự):**

1. **CI/CD broken** — 13 lint errors, test failures đang merge không có gate từ đầu tháng 3/2026
2. **Scope confusion** — người dùng không biết đang quản lý Thương hiệu nào hay Chi nhánh nào
3. **Compliance gap** — Decree 70/2025 e-invoicing và VietQR chưa có → rủi ro pháp lý

> **Nguyên tắc cốt lõi:** Thị trường F&B Việt Nam là compliance-first, feature-second. Fix CI. Ship e-invoicing. Sau đó mới build intelligence layer mà không có đối thủ nào có.

---

## 2. Lịch sử phiên bản

| Version | Mô tả | Trạng thái |
|---|---|---|
| V1 | Microservices — quá phức tạp cho giai đoạn đầu | Deprecated |
| V2 | Modular Monolith — single-brand CRM | Current state (broken CI) |
| V3.0 | Multi-brand SaaS Platform | Target architecture |
| **V4.0** | **V3.0 + CRM Restructure + API Plan — tài liệu này** | **Living Document** |

### V2 → V3.0: Những thay đổi cơ bản

| Dimension | V2 (hiện tại) | V3.0 (mục tiêu) |
|---|---|---|
| Identity | Single-brand CRM | Multi-brand SaaS Platform |
| Tenant model | Tenant = restaurant chain | Tenant = brand; brands → chains → branches |
| Revenue model | Internal tool | SaaS subscription (Starter / Growth / Enterprise) |
| Compliance | **MISSING** e-invoicing, VietQR, GrabFood | **BUILT-IN** tất cả Tier 1 gaps resolved |
| CI/CD | **BROKEN** — merge không có gate từ Mar 2026 | **ENFORCED** — branch protection bắt buộc |
| Query strategy | **DRIFTING** — Prisma + PostgREST dual pattern | **DECIDED** — supabase-js primary, Prisma cho migrations |
| App surfaces | 1 web admin + broken Flutter | 7 surfaces: Web Admin, POS, KDS, Brand Mgr, Branch Mgr, Staff, Customer |

---

## 3. SaaS Platform Vision

### 3.1 Hierarchy Model

```
Nền tảng SaaS: comtammatu.vn  (L0 — Platform)
│
├── Thương hiệu: Cơm Tấm Má Tư    (L1 — Brand = SaaS tenant)
│   ├── [Optional] Chuỗi HCM       (L2 — Chain/Region)
│   │   ├── Chi nhánh: Đất Đỏ      (L3 — Branch = operational unit)
│   │   ├── Chi nhánh: Phước Hải
│   │   └── Chi nhánh: Vũng Tàu
│   └── Chi nhánh: TP. HCM
│
├── Thương hiệu: Phở Má Tư         (L1 — Brand)
│   ├── Chi nhánh: Hà Nội
│   ├── Chi nhánh: Đà Nẵng
│   └── Chi nhánh: TP. HCM
│
└── Thương hiệu: Bún Bò Má Tư      (L1 — Brand)
    ├── Chi nhánh: Vũng Tàu
    └── Chi nhánh: Huế
```

> **KEY CHANGE từ V2:** Mọi bảng có `tenant_id` nay đổi thành `brand_id` (L1). Bảng `brands` chính là bảng tenant. Branch-level queries không thay đổi — chỉ thay `branches.tenant_id` thành `branches.brand_id`.

### 3.2 SaaS Pricing Tiers

| Feature | Starter | Growth | Enterprise |
|---|---|---|---|
| Giá/tháng | 299K–499K VND | 999K–1.499M VND | Custom |
| Chi nhánh | 1–3 | 4–20 | Unlimited |
| POS terminals | 2 per branch | Unlimited | Unlimited |
| E-invoicing | Included | Included | Included + dedicated provider |
| Delivery integration | 1 platform | GrabFood + ShopeeFood | All + Xanh SM Ngon |
| Analytics | Basic reports | RFM + Food cost AvT | BCG + AI forecasting |
| SLA | 99.5% | 99.9% | 99.99% + dedicated support |

### 3.3 White-Label Capability

Mỗi brand có thể cấu hình domain riêng, logo, màu sắc, và notification identity:

- **Custom domain:** `brand.pos.vn` via Vercel custom domains API
- **Zalo OA:** mỗi brand đăng ký Official Account riêng — credentials lưu trong Vault theo `brand_id`
- **E-invoicing:** mỗi brand có tài khoản provider riêng (MISA/Viettel/VNPT) với chứng chỉ số riêng
- **Receipts & KDS tickets:** brand logo + color scheme từ `brands.theme_config JSONB`

---

# Phần II — Engineering Health

## 4. Baseline Kỹ Thuật Hiện Tại

> **ƯU TIÊN TUYỆT ĐỐI:** Phần này phải được giải quyết TRƯỚC KHI bắt đầu bất kỳ feature mới nào. Đây không phải tech debt — đây là blockers.

### 4.1 CI/CD Pipeline — Fix Ngay

> **CRITICAL:** CI đã bị broken từ đầu tháng 3/2026. 13 lint annotations và test failures đang được merge vào main không có gate. Bundle analysis, build, và Playwright E2E stages không bao giờ chạy.

**Hành động bắt buộc:**

- Bật branch protection rules trên `main`: yêu cầu tất cả 8 CI stages pass trước khi merge
- Fix toàn bộ 13 lint errors — tìm root cause, **không dùng `// eslint-disable`**
- Khôi phục Flutter CI và đưa về green
- Thiết lập required status checks trên GitHub: `typecheck`, `unit-tests`, `lint`, `security-scan`, `build`
- Thêm auto-cancel on outdated workflow runs để giảm queue time

### 4.2 Query Strategy — Đã quyết định

> **DECIDED:** Supabase PostgREST (via `supabase-js`) là primary query client. Prisma chỉ dùng cho schema migrations (`prisma migrate`). Không có Prisma Client query code mới.

**Rationale:**
- PostgREST đã dominant trong codebase (PR evidence: `branches!inner` syntax khắp nơi)
- PostgREST + RLS = security enforce tại DB layer, không phải application layer
- Prisma Client trong serverless = connection pool issues nếu không có Supavisor config
- Prisma schema (`.prisma`) vẫn là source of truth cho DB structure; chạy `prisma migrate` cho mọi DDL changes

### 4.3 Bus-Factor Risk

Tất cả commits và PRs đều từ một developer duy nhất. Với scope của platform này, đây là rủi ro vận hành nghiêm trọng.

- Document architecture decisions trong folder `ADR/` (Architecture Decision Records)
- Mỗi module phải có `README.md` giải thích domain logic, không chỉ setup steps
- Onboarding guide phải cho phép developer mới chạy full stack local trong 30 phút

### 4.4 Customer Access Gap

> **INTERIM STATE:** Customer PWA đã bị xóa trong PR #60. Flutter app là replacement nhưng CI đang failing. Không có production customer-facing interface nào tồn tại hiện tại.

- **Mitigation tạm thời:** QR code ordering qua table-scoped URL trỏ đến simplified web ordering flow
- Flutter app CI phải green trước khi bất kỳ customer-facing feature nào được test
- Target: Flutter app trong TestFlight/Play Store internal track trong vòng 6 tuần sau khi CI được fix

---

# Phần III — Kiến trúc Hệ Thống

## 5. Stack & Infrastructure

### 5.1 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Monorepo | Turborepo | Shared packages: `@repo/ui`, `@repo/types`, `@repo/auth` |
| Web apps | Next.js 15 App Router | Separate apps: admin, pos, kds, employee, platform |
| Mobile | Flutter 3.x | `comtammatu-app` repo — customer + staff |
| Database | Supabase PostgreSQL 15 | Schema-per-module isolation |
| Auth | Supabase Auth + JWT claims | Custom access token hook cho `brand_id + role` |
| Query client | supabase-js (PostgREST) | Prisma CHỈ cho migrations |
| Realtime | Supabase Realtime | KDS, waitlist, order status, payment confirm |
| Edge Functions | Supabase Edge Functions (Deno) | Tất cả external webhooks + heavy operations |
| Hosting | Vercel (per app) | Independent deployments theo Turborepo app |
| Secrets | Supabase Vault | TẤT CẢ 3rd-party credentials — không bao giờ trong env vars |
| Scheduled jobs | pg_cron + pg_net | Analytics refresh, loyalty expiry, alerts |
| POS offline | Serwist + IndexedDB (idb) | Background sync queue, conflict resolution |

### 5.2 Monorepo Structure

```
apps/
├── admin/          → admin.pos.vn      Brand-scoped dashboard, RFM, analytics, financial reports
├── pos/            → pos.pos.vn        PWA + Serwist offline, terminal-scoped, printer config
├── kds/            → kds.pos.vn        Realtime WebSocket, station routing, sound alerts
├── employee/       → staff.pos.vn      Shift management, payroll view, schedule
└── platform/       → platform.pos.vn   NEW — SaaS brand management, billing, usage metrics

packages/
├── ui/             Shared component library, brand theme tokens
├── auth/           JWT helpers, role guards, has_role() wrappers, nav-config.ts
└── types/          Generated từ Supabase schema via `supabase gen types`

mobile/             → comtammatu-app (Flutter — customer + staff)
```

### 5.3 Connection Pooling

> **RULE:** Luôn dùng Supavisor transaction mode (port 6543) với `?pgbouncer=true` cho tất cả serverless/edge deployments. Set `connection_limit=1` trong Prisma connection string cho serverless. Direct connection (port 5432) CHỈ cho `prisma migrate`.

### 5.4 Cost Estimate (Realistic)

| Service | Plan | USD/month | Notes |
|---|---|---|---|
| Supabase Pro | Pro + Small Compute | $25 + $15 = $40 | 5–10 branches |
| Supabase (scale) | Pro + Medium Compute | $25 + $60 = $85 | 20+ branches |
| Vercel Pro | Pro (5 projects) | $60 | Per Turborepo app |
| Resend (email) | Starter | $0–$20 | 3K free/month |
| **Total (Phase 0)** | | **$100–$165/mo** | vs $25 trong V2 |

---

## 6. Cấu Trúc Phân Cấp

### Scope Mapping

| Level | Entity | JWT Claim | RLS Policy |
|---|---|---|---|
| L0 — Platform | comtammatu SaaS | `role = 'super_admin'` | Bypass RLS via SECURITY DEFINER |
| L1 — Thương hiệu | Brand | `brand_id` | `brand_id = (auth.jwt() ->> 'brand_id')::uuid` |
| L2 — Chuỗi/Vùng | Chain (optional) | `brand_id` | Inherit từ brand |
| L3 — Chi nhánh | Branch | `brand_id + branch_id` | Kết hợp cả hai claims |

### Phân loại Scope cho từng Domain

| Domain | Scope | Lý do |
|---|---|---|
| Thực đơn & định giá | **Thương hiệu** | Menu nhất quán toàn chuỗi |
| Khách hàng & CRM | **Thương hiệu** | Khách hàng không gắn với 1 chi nhánh |
| Chiến dịch marketing | **Thương hiệu** | Campaign chạy cho toàn brand |
| Hóa đơn điện tử (config) | **Thương hiệu** | Mã số thuế là của brand |
| Cổng thanh toán | **Thương hiệu** | API keys của brand |
| Đơn hàng & POS | **Chi nhánh** | Giao dịch xảy ra tại cơ sở cụ thể |
| Kho & Mua hàng | **Chi nhánh** | Tồn kho độc lập theo cơ sở |
| Nhân sự & lịch ca | **Chi nhánh** | Staff làm việc tại 1 cơ sở |
| Thiết bị POS & máy in | **Chi nhánh** | Hardware gắn với cơ sở vật lý |
| Giao hàng (Grab/Shopee) | **Chi nhánh** | Store ID là của từng chi nhánh |
| Báo cáo tài chính ngày/ca | **Chi nhánh** | P&L theo cơ sở |
| So sánh chi nhánh | **Thương hiệu** | Cross-branch analytics |
| Food cost AvT | **Cả hai** | Xem theo branch hoặc toàn chuỗi |

> **Quy tắc phân biệt nhanh:** Nếu tắt chi nhánh A mà không ảnh hưởng chi nhánh B → Branch scope. Nếu thay đổi lan ra toàn chuỗi → Brand scope.

---

## 7. Multi-tenancy & Authentication

### 7.1 JWT Custom Claims

**Trạng thái hiện tại:** Application-level tenant scoping via PostgREST inner joins trên branches. Mọi query phải join qua branches để verify brand ownership — overhead không cần thiết.

**Target pattern:** Lưu `brand_id + user_role (+ optional branch_id)` trực tiếp trong Supabase JWT via custom access token hook. RLS policies reference `auth.jwt()` trực tiếp — zero extra table lookups.

```sql
-- Supabase Dashboard > Auth > Hooks > Custom Access Token
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  claims jsonb;
  user_brand_id uuid;
  user_role text;
BEGIN
  claims := event -> 'claims';
  SELECT brand_id, role INTO user_brand_id, user_role
  FROM public.brand_members
  WHERE user_id = (event->>'user_id')::uuid;

  claims := jsonb_set(claims, '{brand_id}', to_jsonb(user_brand_id::text));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  RETURN jsonb_set(event, '{claims}', claims);
END; $$;
```

```sql
-- Brand-scope RLS — không cần subquery join
CREATE POLICY "brand_isolation" ON orders FOR ALL TO authenticated
USING (brand_id = (auth.jwt() ->> 'brand_id')::uuid);

-- Branch-scope RLS — kết hợp cả hai claims
CREATE POLICY "branch_isolation" ON orders FOR ALL TO authenticated
USING (
  brand_id  = (auth.jwt() ->> 'brand_id')::uuid AND
  branch_id = (auth.jwt() ->> 'branch_id')::uuid
);
```

### 7.2 RBAC Role Matrix

| Resource | super_admin | owner | manager | staff | customer |
|---|---|---|---|---|---|
| Brands | Full CRUD | Read own | Read own | — | — |
| Branches | Full CRUD | Full CRUD | Read + Update | Read only | — |
| Orders | Full CRUD | Full CRUD | Full CRUD | Create + Read own | Read own |
| Payments | Full CRUD | Full CRUD | Read + Refund | Read only | Read own |
| Staff / HR | Full CRUD | Full CRUD | Read + Schedule | Read own | — |
| Analytics | All brands | Own brand | Own branch | — | — |
| E-invoices | Full CRUD | Full CRUD | Read + Void | Read only | Read own |
| Brand Settings | Full | Full | — | — | — |
| Branch Settings | Full | Full | Full | — | — |
| Menu | Full CRUD | Full CRUD | Edit | View only | View only |

### 7.3 Auth Flow theo Platform

```typescript
// === WEB (Next.js) ===
const { data } = await supabase.auth.signInWithPassword({ email, password })
// JWT tự động inject brand_id + user_role qua custom access token hook
// Mọi request tự attach Bearer token — RLS tự enforce

// === FLUTTER (Mobile — Brand/Branch Manager, Staff, Customer) ===
await Supabase.instance.client.auth.signInWithPassword(
  email: email, password: password
)
// supabase_flutter tự manage token refresh

// === CUSTOMER — Zalo Mini App ===
// Zalo OAuth2 → lấy Zalo access token
// Map zalo_user_id → customer_id trong DB
// Issue Supabase custom token với role = 'customer' + brand_id

// === TOKEN REFRESH STRATEGY ===
// Supabase auto-refresh access token (expire 1h) dùng refresh token (expire 7d)
// POS offline: cache last valid JWT trong IndexedDB
// Khi reconnect: supabase.auth.refreshSession() → replay queued mutations
```

**Token strategy theo platform:**

| Platform | Auth method | Token storage | Refresh |
|---|---|---|---|
| Web (Next.js) | Email/password hoặc OTP | `@supabase/ssr` cookie | Middleware auto-refresh |
| Flutter (Staff) | Email/password | Secure storage | `supabase_flutter` auto |
| Flutter (Customer) | Phone OTP hoặc Zalo OAuth | Secure storage | Auto |
| POS (PWA) | Email/password | IndexedDB (khi offline) | Background sync on reconnect |
| KDS (Web) | Email/password | Browser session | Auto |

---

## 8. Schema — Thiết Kế Cơ Sở Dữ Liệu

### 8.1 Schema-per-Module

Thay thế `public` namespace phẳng bằng module schemas cho future microservice extraction:

| Schema | Tables |
|---|---|
| `core` | brands, branches, brand_members, profiles, audit_logs |
| `pos` | pos_terminals, pos_sessions, printers |
| `orders` | orders, order_items, order_status_history, delivery_orders |
| `payments` | payments, refunds, settlement_batches, payment_webhooks |
| `inventory` | ingredients, recipes, recipe_ingredients, stock_levels, stock_movements, stock_transfers, waste_logs, purchase_orders |
| `menu` | menus, menu_items, categories, menu_branch_assignments |
| `crm` | customers, loyalty_tiers, loyalty_transactions, campaigns, campaign_recipients, customer_segments, zalo_followers |
| `hr` | staff, shifts, payroll_periods, payroll_entries, payroll_si_breakdown |
| `einvoice` | einvoices, einvoice_configs, einvoice_providers |
| `delivery` | delivery_platforms, platform_menu_mappings, platform_orders |

### 8.2 Critical Schema Corrections (V2.1 Items)

**Bắt buộc trước production:**

- `menus.branches UUID[]` → replace bằng `menu.menu_branch_assignments` junction table (`brand_id, menu_id, branch_id, active_from, active_to`)
- `customers`: thêm `UNIQUE(brand_id, phone)` composite constraint
- `tables, branch_zones`: thêm denormalized `brand_id` column để RLS trực tiếp không cần JOIN
- `stock_movements`: thêm `from_branch_id UUID` và `to_branch_id UUID` — bắt buộc cho inter-branch transfers
- `orders`: thêm `source ENUM('pos','app','website','grabfood','shopeefood','xanh_sm')` và `external_order_id TEXT`
- `payments`: tách `method` vs `gateway` (xem Section 19)
- `payroll_entries.deductions`: replace bằng `hr.payroll_si_breakdown` table với breakdown đầy đủ

### 8.3 Materialized Views — Analytics

| View | Refresh | Tier | Mô tả |
|---|---|---|---|
| `daily_branch_financials` | 15 phút (peak), hourly (off-peak) | Tier 1 | Revenue, order count, avg ticket, payment mix per branch/day |
| `delivery_platform_perf` | Hourly | Tier 1 | Orders/GMV per platform, commission cost, net revenue |
| `customer_rfm_scores` | Hourly | Tier 2 | Recency / Frequency / Monetary scores 1–5, segment label |
| `food_cost_avt` | Daily 3AM | Tier 2 | Theoretical vs actual food cost per item + per branch |
| `labor_cost_metrics` | Daily 3AM | Tier 2 | Labor cost %, SPLH, prime cost per shift/branch |
| `menu_bcg_matrix` | Daily 5AM | Tier 3 | Stars/Plowhorses/Puzzles/Dogs classification by item |

> **RULE:** Luôn tạo `UNIQUE INDEX` trên materialized views để cho phép `REFRESH MATERIALIZED VIEW CONCURRENTLY` — cho phép đọc trong khi refresh mà không block dashboard.

---

# Phần IV — CRM Restructure Plan (Scope Confusion Fix)

## 9. Root Causes & 3 Quyết Định Kiến Trúc Cốt Lõi

### Root Causes của Scope Confusion

| Vấn đề | Biểu hiện | Giải pháp |
|---|---|---|
| **Không có scope context trong URL** | User edit menu không biết đang sửa Cơm Tấm hay Phở Má Tư | URL chứa `[brandId]` và `[branchId]` bắt buộc |
| **Navigation sprawl** | Feature mới nhét vào sidebar theo thứ tự build | 8 domain groups cố định, mỗi group có scope rõ ràng |
| **Settings fragmentation** | Brand config và branch config lẫn lộn 1 trang | Tách thành 2 route: `/settings/brand` và `/settings/branch` |
| **Role-to-route duplicated** | Logic điều hướng tồn tại ở 3+ nơi | Centralize vào `packages/auth/nav-config.ts` |
| **RLS dùng subquery join** | Mọi query phải join qua `branches` để verify tenant | JWT custom claims → RLS trực tiếp từ `auth.jwt()` |

### Quyết định 1 — URL là nguồn sự thật duy nhất

Không dùng React Context hay localStorage để lưu brand/branch hiện tại. URL tự giải thích đầy đủ scope.

```
# Brand-scoped page
/b/[brandId]/menu

# Branch-scoped page
/b/[brandId]/br/[branchId]/orders
```

### Quyết định 2 — `@repo/auth/nav-config.ts` là file nav duy nhất

Xóa 3 bản duplicate hiện có. Một export duy nhất cho toàn team dùng.

### Quyết định 3 — `ScopeContextBar` là mandatory layout component

Mọi `layout.tsx` đều render component này. User nhìn vào bất kỳ trang nào cũng biết đang ở đâu.

```
[ Đang quản lý: Cơm Tấm Má Tư ▾ ] › [ Chi nhánh: Đất Đỏ ▾ ]    [ Trang: Chi nhánh ]
```

---

## 10. URL & Route Structure

### Next.js App Router — Route Groups

```
apps/admin/app/
├── (platform)/                          ← super_admin only
│   └── platform/
│       ├── brands/page.tsx
│       └── billing/page.tsx
│
├── (brand)/                             ← brand-scoped pages
│   └── b/[brandId]/
│       ├── layout.tsx                   ← BrandScopeProvider
│       ├── dashboard/page.tsx
│       ├── menu/page.tsx
│       ├── crm/page.tsx
│       ├── finance/page.tsx
│       ├── analytics/page.tsx
│       └── settings/brand/page.tsx      ← owner only
│
└── (branch)/                            ← branch-scoped pages
    └── b/[brandId]/br/[branchId]/
        ├── layout.tsx                   ← BranchScopeProvider
        ├── orders/page.tsx
        ├── pos/page.tsx
        ├── kds/page.tsx
        ├── inventory/page.tsx
        ├── delivery/page.tsx
        ├── staff/page.tsx
        └── settings/branch/page.tsx     ← owner + manager
```

### Redirect Logic sau Login

```typescript
const { brandId, branchId, role } = getJwtClaims()

switch (role) {
  case 'super_admin': redirect('/platform/brands')
  case 'owner':       redirect(`/b/${brandId}/dashboard`)
  case 'manager':     redirect(`/b/${brandId}/br/${branchId}/orders`)
  case 'staff':       redirect(`/b/${brandId}/br/${branchId}/pos`)
  case 'customer':    redirect(`/app/loyalty`) // Flutter app
}
```

### Before / After

```
# BEFORE — flat, không có context
/dashboard    /orders    /menu    /inventory    /settings

# AFTER — scope rõ ràng trong URL
/b/[brandId]/dashboard
/b/[brandId]/menu
/b/[brandId]/br/[branchId]/orders
/b/[brandId]/br/[branchId]/inventory
/b/[brandId]/settings/brand
/b/[brandId]/br/[branchId]/settings/branch
```

---

## 11. Scope System

### ScopeProvider Implementation

```typescript
// packages/auth/src/scope-context.tsx

type ScopeContext = {
  brandId: string
  brandName: string
  branchId: string | null    // null = brand-level page
  branchName: string | null
  scope: 'brand' | 'branch'
}

// BrandScopeProvider  → reads [brandId] from URL params
// BranchScopeProvider → reads [brandId] + [branchId] from URL params
// useScope()          → hook dùng trong mọi component
```

---

## 12. 8 Modules — Domain Grouping

> Mỗi module = 1 domain nghiệp vụ, với scope cố định. Không module nào lẫn lộn brand và branch logic trong cùng 1 trang.

### Module 1: Tổng quan (Dashboard)
**Scope:** Cả hai | **Route:** `/b/[brandId]/dashboard` + `/b/[brandId]/br/[branchId]/dashboard`
- Doanh thu hôm nay (branch scope), so sánh chi nhánh (brand scope), KPI theo giờ/ca, cảnh báo tồn kho, đơn đang xử lý realtime

### Module 2: Bán hàng
**Scope:** Chi nhánh | **Route:** `/b/[brandId]/br/[branchId]/orders`
- Đơn hàng đang xử lý, lịch sử đơn, quản lý bàn, phiên POS (`pos_sessions`), KDS màn hình bếp

### Module 3: Thực đơn
**Scope:** Thương hiệu | **Route:** `/b/[brandId]/menu`
- Danh mục & món ăn (CRUD), định giá & combo, phân công chi nhánh (`menu_branch_assignments`), override giá theo chi nhánh, đồng bộ GrabFood/ShopeeFood

### Module 4: Kho & Mua hàng
**Scope:** Chi nhánh | **Route:** `/b/[brandId]/br/[branchId]/inventory`
- Tồn kho nguyên liệu, kiểm kê (`stock_counts`), đặt hàng NCC (PO với quality inspection), chuyển kho liên chi nhánh, nhật ký lãng phí

### Module 5: Giao hàng
**Scope:** Chi nhánh | **Route:** `/b/[brandId]/br/[branchId]/delivery`
- GrabFood/ShopeeFood đang chờ (accept/reject), toggle online/offline per platform, hiệu suất theo nền tảng

### Module 6: Khách hàng & CRM
**Scope:** Thương hiệu | **Route:** `/b/[brandId]/crm`
- Danh sách khách + RFM scores, loyalty tiers/earn rules/rewards, chiến dịch (email/SMS/Zalo/Push), phân khúc RFM, Zalo OA follower mapping, đặt bàn & waitlist (Phase 2)

### Module 7: Tài chính
**Scope:** Cả hai | **Route:** `/b/[brandId]/finance` + `/b/[brandId]/br/[branchId]/finance`
- Lịch sử thanh toán, hoàn tiền (approval workflow), đối soát settlement batches, HĐĐT (list/void/reissue), webhook log

### Module 8: Nhân sự
**Scope:** Chi nhánh | **Route:** `/b/[brandId]/br/[branchId]/staff`
- Danh sách nhân viên + hồ sơ, lịch ca, tính lương với BHXH breakdown (Luật BHXH 2024), hiệu suất (SPLH, avg ticket)

### Module 9: Báo cáo & Phân tích
**Scope:** Cả hai | **Route:** `/b/[brandId]/analytics`
- Báo cáo tài chính ngày/ca, food cost AvT (Theoretical vs Actual), labor cost % / prime cost, RFM segmentation, BCG menu matrix, hiệu suất giao hàng

---

## 13. Navigation Architecture

### Centralized Nav Config

```typescript
// packages/auth/src/nav-config.ts — MỘT file duy nhất

export type NavItem = {
  key: string
  label: string
  href: (ids: ScopeIds) => string
  scope: 'brand' | 'branch' | 'both'
  roles: UserRole[]
}

export const BRAND_NAV: NavItem[] = [
  { key:'dashboard', label:'Tổng quan',   href:({brandId})=>`/b/${brandId}/dashboard`,  scope:'brand', roles:['owner','manager'] },
  { key:'menu',      label:'Thực đơn',    href:({brandId})=>`/b/${brandId}/menu`,        scope:'brand', roles:['owner','manager','staff'] },
  { key:'crm',       label:'Khách hàng',  href:({brandId})=>`/b/${brandId}/crm`,         scope:'brand', roles:['owner','manager'] },
  { key:'finance',   label:'Tài chính',   href:({brandId})=>`/b/${brandId}/finance`,     scope:'brand', roles:['owner'] },
  { key:'analytics', label:'Báo cáo',     href:({brandId})=>`/b/${brandId}/analytics`,   scope:'brand', roles:['owner','manager'] },
]

export const BRANCH_NAV: NavItem[] = [
  { key:'orders',    label:'Bán hàng',       href:({brandId,branchId})=>`/b/${brandId}/br/${branchId}/orders`,    scope:'branch', roles:['owner','manager','staff'] },
  { key:'inventory', label:'Kho & Mua hàng', href:({brandId,branchId})=>`/b/${brandId}/br/${branchId}/inventory`, scope:'branch', roles:['owner','manager'] },
  { key:'delivery',  label:'Giao hàng',      href:({brandId,branchId})=>`/b/${brandId}/br/${branchId}/delivery`,  scope:'branch', roles:['owner','manager','staff'] },
  { key:'staff',     label:'Nhân sự',        href:({brandId,branchId})=>`/b/${brandId}/br/${branchId}/staff`,     scope:'branch', roles:['owner','manager'] },
]
```

---

# Phần V — API Plan

## 14. 7 App Surfaces

| # | Surface | Platform | Role | Scope | Notes |
|---|---|---|---|---|---|
| 1 | **Platform Admin** | Next.js Web | super_admin | Platform (all brands) | Bypass RLS via SECURITY DEFINER |
| 2 | **Brand Manager** | Next.js + Flutter | owner | Brand | Dashboard toàn chuỗi, analytics, menu, CRM |
| 3 | **Branch Manager** | Next.js + Flutter | manager | Branch | Vận hành chi nhánh cụ thể |
| 4 | **POS Terminal** | Next.js PWA | staff/cashier | Branch | Offline-first, IndexedDB + Serwist |
| 5 | **KDS Display** | Next.js | staff (read-only) | Branch | Realtime only, không cần offline |
| 6 | **Staff App** | Flutter | staff | Branch | Lịch ca, chấm công QR, xem lương |
| 7 | **Customer Loyalty** | Flutter + Zalo Mini App | customer | Brand | Điểm, đổi thưởng, lịch sử, đặt bàn |

### Surface → JWT Mapping

| Surface | JWT Role | brand_id | branch_id | RLS |
|---|---|---|---|---|
| Platform Admin | super_admin | — | — | SECURITY DEFINER |
| Brand Manager | owner | own brand | optional | Standard |
| Branch Manager | manager | own brand | own branch | Standard |
| POS Terminal | staff | own brand | own branch | Standard |
| KDS Display | staff (kds) | own brand | own branch | Standard |
| Staff App | staff | own brand | own branch | Standard |
| Customer Loyalty | customer | brand (từ QR/link) | — | Public + RLS |

---

## 15. API Architecture — 3 Tầng

### Tầng 1 — PostgREST (Tự động)

Tự động generate từ Supabase schema. CRUD operations, filter, join, pagination. RLS enforce tại DB layer.

```
GET  https://[project].supabase.co/rest/v1/orders?branch_id=eq.[id]&status=eq.confirmed
POST https://[project].supabase.co/rest/v1/orders
PATCH https://[project].supabase.co/rest/v1/orders?id=eq.[id]
```

### Tầng 2 — RPC Functions (Custom Business Logic)

PostgreSQL functions gọi qua `/rest/v1/rpc/[fn]`. Dùng cho business logic phức tạp.

```
POST https://[project].supabase.co/rest/v1/rpc/close_pos_session
POST https://[project].supabase.co/rest/v1/rpc/calculate_rfm_scores
POST https://[project].supabase.co/rest/v1/rpc/create_payos_link
POST https://[project].supabase.co/rest/v1/rpc/redeem_reward
POST https://[project].supabase.co/rest/v1/rpc/clock_in
```

### Tầng 3 — Edge Functions (External APIs — Server-only)

Deno serverless cho external APIs. Không expose trực tiếp từ client.

```
POST https://[project].supabase.co/functions/v1/payos-webhook
POST https://[project].supabase.co/functions/v1/einvoice-submit
POST https://[project].supabase.co/functions/v1/grabfood-webhook
POST https://[project].supabase.co/functions/v1/shopeefood-webhook
POST https://[project].supabase.co/functions/v1/send-zalo-notification
POST https://[project].supabase.co/functions/v1/zalo-webhook
```

### SDK theo Platform

```typescript
// Flutter (Mobile)
import 'package:supabase_flutter/supabase_flutter.dart';
final supabase = Supabase.instance.client;
final orders = await supabase.from('orders').select().eq('branch_id', branchId);

// Next.js (Web)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, anonKey) // + JWT tự động từ session

// Edge Functions (Server-side Deno)
const supabaseAdmin = createClient(url, serviceRoleKey) // bypass RLS cho webhooks
```

---

## 16. Endpoints theo Từng Role

### POS Terminal (staff/cashier)

> **Offline-first:** Tất cả mutations phải queue vào IndexedDB khi mất mạng, sync lại khi có kết nối.

| Endpoint | Method | Mô tả | Offline? |
|---|---|---|---|
| `menu_items` | GET | Load menu — cache offline 24h | ✅ Cache |
| `tables` | GET | Sơ đồ bàn, trạng thái | ✅ Cache 1h |
| `orders` | POST | Tạo đơn mới | ✅ Queue |
| `order_items` | POST | Thêm món vào đơn | ✅ Queue |
| `order_items` | PATCH | Sửa số lượng, ghi chú, cancel món | ✅ Queue |
| `orders` | PATCH | Update status (pending→confirmed→ready→closed) | ✅ Queue |
| `payments` | POST | Tạo payment record (cash/VietQR) | Cash only |
| `rpc/create_payos_link` | RPC | Gọi PayOS tạo QR link | ❌ Cần mạng |
| `rpc/close_pos_session` | RPC | Đóng ca, đối soát tiền mặt | ❌ Cần mạng |
| `pos_sessions` | POST | Mở ca mới | ❌ Cần mạng |
| `customers` | GET | Lookup khách theo SĐT khi tích điểm | ✅ Cache 1000 gần nhất |
| `rpc/add_loyalty_points` | RPC | Cộng điểm sau thanh toán | ✅ Queue |

### KDS Display (staff — read-only + realtime)

| Endpoint | Method | Mô tả |
|---|---|---|
| `orders?status=eq.confirmed` | GET | Load đơn đang cần làm của station |
| `order_items?station_id=eq.[id]` | GET | Món thuộc station cụ thể |
| `order_items` | PATCH | Update: `pending→cooking→ready` |
| `orders` | PATCH | Update khi tất cả món ready |
| Realtime: `orders` | SUBSCRIBE | INSERT/UPDATE trên orders của branch |
| Realtime: `order_items` | SUBSCRIBE | Changes trên items của station |

### Brand Manager (owner)

| Endpoint | Method | Mô tả |
|---|---|---|
| `brands` | GET, PATCH | Brand profile, theme config, VAT rate |
| `branches` | GET, POST, PATCH | Quản lý danh sách chi nhánh |
| `menu_items` | GET, POST, PATCH, DELETE | CRUD full menu của brand |
| `menu_branch_assignments` | GET, POST, DELETE | Phân công menu → branch |
| `customers` | GET | Danh sách khách + RFM scores toàn brand |
| `customer_rfm_scores` (view) | GET | Materialized view — cập nhật hourly |
| `campaigns` | GET, POST, PATCH | Tạo và quản lý chiến dịch marketing |
| `daily_branch_financials` (view) | GET | Doanh thu, prime cost, avg ticket toàn chuỗi |
| `einvoice_configs` | GET, PATCH | Config e-invoice provider |
| `brand_members` | GET, POST, DELETE | Quản lý team members, assign roles |
| `rpc/get_bcg_matrix` | RPC | BCG menu classification |

### Branch Manager (manager)

| Endpoint | Method | Mô tả |
|---|---|---|
| `orders` | GET | Lịch sử đơn của branch — filter date/status/staff |
| `stock_levels` | GET, PATCH | Tồn kho nguyên liệu chi nhánh |
| `stock_counts` | POST | Tạo phiếu kiểm kê mới |
| `purchase_orders` | GET, POST, PATCH | Quản lý đặt hàng nhà cung cấp |
| `stock_transfers` | GET, POST | Tạo + approve chuyển kho liên chi nhánh |
| `delivery_platforms` | GET, PATCH | Toggle online/offline GrabFood/ShopeeFood |
| `staff` | GET, POST, PATCH | Danh sách nhân viên chi nhánh |
| `shifts` | GET, POST, PATCH | Lịch ca làm việc |
| `payroll_entries` | GET | Xem bảng lương chi nhánh |
| `refunds` | GET, POST | Tạo yêu cầu hoàn tiền — cần approval |
| `rpc/get_branch_report` | RPC | Báo cáo tài chính ca/ngày với food cost AvT |

### Staff App (Flutter)

| Endpoint | Method | Mô tả |
|---|---|---|
| `shifts?staff_id=eq.[me]` | GET | Xem lịch ca của bản thân |
| `payroll_entries?staff_id=eq.[me]` | GET | Xem lương của bản thân |
| `rpc/clock_in` | RPC | Chấm công vào ca — validate QR code |
| `rpc/clock_out` | RPC | Chấm công ra ca |
| `notifications?user_id=eq.[me]` | GET | Thông báo: lịch ca mới, thay ca |
| `menu_items` | GET | Xem thực đơn (read-only) |

### Customer Loyalty (Flutter + Zalo Mini App)

| Endpoint | Method | Mô tả |
|---|---|---|
| `menu_items?brand_id=eq.[id]` | GET | Xem menu công khai — không cần đăng nhập |
| `customers?id=eq.[me]` | GET | Profile, tổng điểm, tier hiện tại |
| `loyalty_transactions?customer_id=eq.[me]` | GET | Lịch sử điểm: cộng / trừ / expire |
| `rewards` | GET | Danh sách phần thưởng có thể đổi |
| `rpc/redeem_reward` | RPC | Đổi điểm lấy voucher / món miễn phí |
| `orders?customer_id=eq.[me]` | GET | Lịch sử đơn của bản thân |
| `reservations` | POST | Đặt bàn (Phase 2) |
| `rpc/get_branch_menu_public` | RPC | Menu + giá + giờ mở cửa theo chi nhánh |
| Realtime: `waitlist` | SUBSCRIBE | Cập nhật vị trí hàng chờ realtime |

---

## 17. Auth Flow theo Platform

*(Xem chi tiết tại Section 7.3)*

### Rate Limits cần biết

| Service | Limit |
|---|---|
| Auth API | 30 req/hour per IP |
| PostgREST | Theo Supabase plan |
| Edge Functions | 500K invocations/month (free) |
| Realtime | 200 concurrent connections (Pro) |

### Security Rules bắt buộc

- Không expose `service_role` key ra client — chỉ dùng trong Edge Functions
- Supabase Vault cho tất cả 3rd-party credentials (PayOS, VNPay, Zalo OA, GrabFood)
- HMAC verify mọi inbound webhooks
- Idempotency key cho mọi payment mutations (check `payment_webhooks.event_id` trước khi update)

---

## 18. Realtime & Offline Architecture

### Realtime Channels

| Channel | Event | Ai nhận | Dùng cho |
|---|---|---|---|
| `kitchen:[branchId]:[stationId]` | INSERT order_items | KDS station | Đơn mới cần làm |
| `orders:[branchId]` | UPDATE status | POS terminal | Biết khi bếp đã xong |
| `payments:[orderId]` | UPDATE status | POS cashier | Xác nhận PayOS thanh toán |
| `tables:[branchId]` | UPDATE status | Host / manager app | Cập nhật sơ đồ bàn |
| `delivery:[branchId]` | INSERT orders | Branch manager | Đơn mới từ GrabFood/ShopeeFood |
| `waitlist:[branchId]` | UPDATE position | Customer app | Hàng chờ realtime (Phase 2) |
| `stock_alerts:[branchId]` | pg_cron trigger | Branch manager | Cảnh báo tồn kho thấp |

```typescript
// Realtime channel pattern cho KDS
supabase
  .channel(`kitchen:${branchId}:${stationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'orders',
    table: 'order_items',
    filter: `branch_id=eq.${branchId}`
  }, handleNewItem)
  .subscribe()
```

### POS Offline Architecture

```
Serwist (service worker) + IndexedDB via idb library

Offline data cached:
- menu_items: 24h TTL, refresh khi có mạng
- tables: 1h TTL
- customers: tìm kiếm local trong 1000 khách gần nhất

Sync queue schema trong IndexedDB:
{ id, operation, payload, created_at, attempts, status }

Flow:
1. Offline → write vào sync_queue thay vì gọi API
2. Reconnect → Background Sync API: navigator.serviceWorker.sync.register('process-queue')
3. Server nhận → kiểm tra version conflict → apply hoặc reject 409

Conflict resolution:
- last-write-wins theo modified_at timestamp
- version column trên orders detect multi-terminal conflict
- Cash payment offline: flag reconciled=false → POS session close confirm
```

### Offline capability theo Terminal Type

| Feature | mobile_order (waiter) | cashier_station (cashier) |
|---|---|---|
| View menu | ✅ Cached, offline available | ✅ Cached, offline available |
| Create order | ✅ Queued locally, syncs on reconnect | ✅ Queued locally |
| Process payment | ❌ NOT ALLOWED | Cash only while offline |
| Print receipt | — | ✅ Local printer |
| View past orders | Last 24h cached | Last 48h cached |
| E-invoice | — | Queued, submitted on reconnect |

---

# Phần VI — Compliance & Tích Hợp

## 19. Payment Architecture

### Gateway Strategy

| Phase | Gateway | Methods | Notes |
|---|---|---|---|
| Phase 0 | Cash (built-in) | Cash | Always available, offline |
| Phase 0 | PayOS | VietQR bank transfer | Zero merchant fee, `@payos/node` SDK, T+0 settlement |
| Phase 0 | VNPay | Domestic card, VNPAY-QR | `vnpay` npm library, HMAC webhook |
| Phase 3 | MoMo | MoMo e-wallet | 40M+ users, direct SDK |
| Phase 3 | ZaloPay | ZaloPay e-wallet | Leverages 76M Zalo users |
| Phase 3 | VNPAY SmartPOS | Physical card terminal | Stripe Terminal equivalent cho VN |

### Payment Schema

```
payments:
  id, brand_id, order_id,
  gateway ENUM(cash | payos | vnpay | momo | zalopay),
  method  ENUM(cash | vietqr | vnpay_qr | domestic_card | intl_card | momo_wallet | zalopay_wallet),
  amount, tip, status,
  gateway_tx_id, gateway_payment_link_id,
  created_at, settled_at

refunds (NEW):
  payment_id FK, brand_id, amount, reason,
  approved_by FK, gateway_refund_id,
  status ENUM(pending | processing | completed | failed),
  created_at, completed_at

settlement_batches (NEW):
  brand_id, gateway, period_start, period_end,
  expected_amount, actual_amount, variance,
  status ENUM(pending | reconciled | disputed),
  gateway_batch_id, notes

payment_webhooks (NEW — idempotency):
  gateway, event_id (idempotency key),
  payload JSONB, processed BOOLEAN,
  processed_at, error TEXT
```

### PayOS Edge Function Pattern

```typescript
// Edge Function: create-payment-link
// Input: order_id, amount, description
// Output: { qrUrl, paymentLinkId, expiresAt }

// Edge Function: payos-webhook
// 1. Validate HMAC checksum (checksumKey từ Vault)
// 2. Check payment_webhooks.event_id (idempotency)
// 3. Update payments.status = 'completed'
// 4. Trigger einvoice-submit via pg_net
// 5. Trigger add_loyalty_points via pg_net

// Tất cả PayOS credentials (clientId, apiKey, checksumKey)
// lưu per brand_id trong Supabase Vault
```

---

## 20. E-invoicing — Decree 70/2025

> **LEGAL REQUIREMENT:** Decree 70/2025 effective June 1, 2025. Mọi F&B business với doanh thu ≥ VND 1 tỷ (~$38,400) phải phát hành e-invoices từ POS kết nối đến Tổng cục Thuế (GDT) theo thời gian thực. **Đây không phải tính năng — đây là yêu cầu pháp lý.**

### Schema

```
einvoice.einvoice_configs:
  brand_id, provider ENUM(misa | viettel | vnpt | fpt),
  api_endpoint, vault_secret_ref, digital_cert_ref,
  tax_code, template_code, active

einvoice.einvoices:
  id, brand_id, branch_id, order_id, payment_id,
  invoice_number, invoice_series, xml_data TEXT,
  status ENUM(draft | submitted | issued | cancelled | error),
  gdt_submission_id, buyer_tax_code, buyer_name, buyer_email,
  issued_at, archived_until (10-year retention required)
```

### Architecture Flow

```
Payment completed
    ↓ (DB trigger via pg_net)
Edge Function: einvoice-submit
    ↓
Pull brand's einvoice_config
    ↓
Retrieve API credentials từ Vault
    ↓
Generate XML theo GDT format
    ↓
POST to provider REST API (Viettel S-Invoice / VNPT)
    ↓
Store response in einvoice.einvoices
    ↓
Deliver QR code via receipt + email (Resend)
```

**Provider recommendation:** Viettel S-Invoice hoặc VNPT cho API quality tốt nhất. MISA nếu brand đã dùng MISA accounting.

**VAT rate:** Hiện tại 8% (giảm từ 10%) cho dịch vụ nhà hàng — valid đến 31/12/2026. Lưu trong `brands.vat_rate DECIMAL(4,2)` để configurable per brand không cần deploy. Kế hoạch revert về 10% từ 1/1/2027.

> **Archive rule:** `einvoices.xml_data` phải lưu 10 năm — không xóa, chỉ soft-cancel.

---

## 21. Delivery Platform Integration

GrabFood (36%) + ShopeeFood (56%) = 92% thị trường delivery Việt Nam với GMV $2.8B. **Đây là Tier 1 — không optional cho bất kỳ chuỗi nhà hàng nào.**

### Schema Additions

```
delivery.delivery_platforms:
  platform ENUM(grabfood | shopeefood | xanh_sm),
  brand_id, branch_id, platform_store_id,
  platform_menu_id, active, credentials_vault_ref

delivery.platform_menu_mappings:
  internal menu_item_id ↔ platform_item_id
  (required vì platform item IDs khác internal IDs)

orders.orders:
  thêm: source ENUM, external_order_id,
        platform_fee, commission_amount, commission_pct
```

### Architecture

| Component | Trách nhiệm |
|---|---|
| `grabfood-webhook` (Edge Function) | Nhận GrabFood order push, validate signature, normalize → internal schema, tạo order + order_items + delivery_orders, **return 200 ACK trong 5s** (GrabFood yêu cầu) |
| `shopeefood-webhook` (Edge Function) | Same pattern — separate function vì APIs khác nhau (HMAC SHA256 vs GrabFood JWT) |
| `menu-sync` (Scheduled Edge Function) | pg_cron daily 3AM: đọc active menu items, transform → platform format, PUT to GrabFood/ShopeeFood menu API. Manual trigger có sẵn từ admin UI |
| `order-status-push` (DB trigger) | Khi `orders.status` changes → pg_net gọi Edge Function push status update về platform (ví dụ READY_FOR_PICKUP signal cho GrabFood driver app) |

> **IMPORTANT:** Không có Vietnamese middleware aggregator. Sapo FnB's model của direct integration với từng platform là proven approach. Hai separate webhook handlers + shared order normalization layer là kiến trúc đúng.

---

## 22. Zalo OA / ZNS Integration

77 triệu MAU — 87% smartphone users Việt Nam. Zalo OA messages có near-100% visibility rate. ZNS (Zalo Notification Service) deliver transactional messages trong dưới 1 giây.

### Schema

```
crm.zalo_oa_configs:
  brand_id, oa_id, vault_secret_ref (access_token),
  webhook_secret, active

crm.zalo_message_templates:
  brand_id, template_id (Zalo-assigned), template_name,
  template_type ENUM(order_confirm | loyalty_update | promo | win_back | birthday),
  params_schema JSONB, pre_approved BOOLEAN
  (Templates phải pre-approved bởi Zalo trước khi dùng)

crm.zalo_followers:
  brand_id, customer_id FK, zalo_user_id,
  followed_at, unfollow_at

crm.campaigns: thêm 'zalo' vào channel ENUM
```

### ZNS Use Cases theo Priority

| Priority | Use Case | Template Type |
|---|---|---|
| P0 — Now | Order confirmation | `order_confirm` — sent post-payment via ZNS |
| P0 — Now | Loyalty points earned | `loyalty_update` — sent after order closed |
| P1 — 3 months | Win-back campaign | `win_back` — customers không thấy trong 30/60/90 ngày |
| P1 — 3 months | Birthday offer | `birthday` — triggered by pg_cron daily |
| P2 — 6 months | Promotional campaigns | `promo` — manual send từ admin campaign builder |

---

## 23. Analytics Layer

Tất cả analytics được implement như PostgreSQL materialized views được refresh bởi pg_cron. **Không cần separate analytics service.**

### RFM Segmentation

- Scores 1–5 trên Recency (days since last order), Frequency (orders per 90 days), Monetary (total spend)
- Segments: Champions (R5+F5+M5), Loyal (R3+), Promising (new, high frequency), At Risk (R1–2), Lost (R1+F1+M1)
- Automated campaign triggers: win-back cho At Risk (30 ngày không visit) → Zalo ZNS template `win_back`
- Research benchmark: RFM-targeted campaigns yield up to 77% ROI improvement vs blanket promotions

### Theoretical vs Actual Food Cost

- **Theoretical** = SUM(recipe_ingredients.quantity × ingredients.cost_price) per order_item × units_sold
- **Actual** = beginning_inventory + purchases − ending_inventory (from stock_counts)
- **Variance** = actual − theoretical. Positive variance = waste/theft/over-portioning
- Restaurant365 benchmark: identifying AvT variance cut COGS 4–5% per store, saving $600K per restaurant group

### BCG Menu Matrix (Tier 3)

- **Popularity axis:** order_items count per menu_item over trailing 30 days vs category median
- **Profitability axis:** (selling_price − theoretical_food_cost) / selling_price = contribution margin %
- **Classification:** Stars (promote) → Plowhorses (optimize cost) → Puzzles (reposition) → Dogs (retire)
- Cornell research: up to 15% profit improvement through menu engineering. **Không có đối thủ Việt Nam nào có tính năng này.**

---

## 24. Compliance — Tax & Payroll

### Social Insurance (Luật BHXH 2024 — Effective July 2025)

| Contribution | Employer % | Employee % |
|---|---|---|
| Social Insurance (SI) | 17.5% | 8% |
| Health Insurance (HI) | 3% | 1.5% |
| Unemployment Insurance (UI) | 1% | 1% |
| Trade Union | 2% | — |
| **TOTAL** | **23.5%** | **10.5%** |

> **2024 LAW CHANGE:** Luật BHXH 2024 (effective July 1, 2025) mở rộng BHXH cho part-time workers và short-term contracts. F&B businesses với nhiều nhân viên part-time phải track và đóng BHXH cho staff làm ≥ 14 giờ/tuần.

**Schema update cần thiết:**
```
hr.payroll_si_breakdown table:
  payroll_entry_id, si_employer, si_employee,
  hi_employer, hi_employee, ui_employer, ui_employee,
  trade_union, gross_salary, net_salary

staff table: thêm part_time BOOLEAN
```

---

# Phần VII — Team & Execution

## 25. 6 Agent Roles

> Mỗi Agent sở hữu một domain riêng biệt, không overlap. Cross-domain changes → dùng Handoff Protocol.

### A1 — Architect Agent
**Domain:** System Design & IA Authority
- Sở hữu toàn bộ quyết định IA: URL structure, scope rules, route group layout
- Viết ADR (Architecture Decision Records) cho mọi quyết định kỹ thuật lớn
- Review và approve mọi thay đổi schema trước khi A3 migrate
- **Tiebreaker** — unblock conflict giữa các Agent khi có overlap
- **Không làm:** Viết component code, migration scripts

### A2 — Frontend Agent
**Domain:** UI / UX & Component System
- Xây dựng `ScopeContextBar` — component cốt lõi fix Scope Confusion
- Implement route groups trong Next.js App Router, layout files
- Build `@repo/ui` shared components: nav, breadcrumb, scope switcher
- Sidebar navigation dùng centralized nav-config từ A4
- **Dependencies nhận:** `useScope()` hook từ A4, TypeScript types từ A3

### A3 — Database Agent
**Domain:** Schema, RLS & Migrations
- Migration `tenant_id` → `brand_id` toàn schema (zero downtime)
- Implement JWT custom claims hook (`brand_id + user_role`)
- Viết tất cả RLS policies dùng `auth.jwt()` claims trực tiếp
- Schema-per-module: tạo 10 module schemas
- Materialized views: `customer_rfm_scores`, `food_cost_avt`, `daily_branch_financials`
- **Output cho team:** Generated TypeScript types sau mỗi migration

### A4 — Auth & RBAC Agent
**Domain:** Permissions, Roles & Nav Config
- Viết `packages/auth/nav-config.ts` — nguồn duy nhất cho navigation
- Implement `BrandScopeProvider` và `BranchScopeProvider`
- Xây `has_role()` SECURITY DEFINER function + middleware guards
- **Xóa 3 bản duplicate** role-to-route mapping hiện có
- **Output priority:** Deliver `useScope()` hook trước tuần 3

### A5 — Integration Agent
**Domain:** External APIs & Edge Functions
- PayOS + VietQR: `create-payment-link` + `payos-webhook` Edge Functions
- E-invoicing Decree 70/2025: `einvoice-submit` + GDT XML format
- GrabFood + ShopeeFood webhook handlers, order normalization layer
- Zalo OA OAuth2 flow + ZNS notification Edge Functions
- **Supabase Vault setup** cho toàn bộ 3rd-party credentials
- **Nguyên tắc:** Tất cả secrets trong Vault — không key nào trong env vars hay code

### A6 — CI/CD & QA Agent
**Domain:** Pipeline, Testing & Quality Gates
- Fix 13 lint errors — root cause, **không dùng `// eslint-disable`**
- Bật branch protection rules, 8 required status checks
- Khôi phục Flutter CI về green
- Viết E2E Playwright tests cho scope switching flow
- Security scan: secrets scanning, dependency vulnerability audit
- **Quyền hạn đặc biệt:** **Gatekeeper** — không code nào được merge khi CI đỏ

### Nguyên tắc vận hành

1. Mỗi Agent **sở hữu domain** — không cần xin phép để làm việc trong domain của mình
2. Cross-domain changes → phải tạo **Handoff ticket** với input/output rõ ràng
3. A1 là **tiebreaker** — mọi conflict về architecture đều do A1 quyết định
4. A6 là **gatekeeper** — không có code nào được merge nếu CI chưa xanh
5. **Daily sync 15 phút:** mỗi Agent báo blocker, không báo progress

---

## 26. Timeline Song Song — 12 Tuần

| Agent | Tuần 1–2 (Pre) | Tuần 3–4 (S0) | Tuần 5–6 (S1) | Tuần 7–8 (S2) | Tuần 9–10 (S3) | Tuần 11–12 (S4) |
|---|---|---|---|---|---|---|
| **A1 Architect** | IA Design + ADR | ADR + Review | Review migrations | Schema review | Integration design | Analytics arch. |
| **A2 Frontend** | Đọc ADR từ A1 | ScopeContextBar | 8 Module pages | Settings pages | Delivery UI | Analytics UI |
| **A3 Database** | brand_id migration | JWT hook + RLS | Chờ A4 scope types | Schema-per-module | Refunds + payment | Mat. views |
| **A4 Auth** | nav-config.ts | ScopeProviders | Role guards | Review A3 RLS | Stand-by | SaaS onboarding |
| **A5 Integration** | Vault setup plan | Vault provisioning | PayOS + VietQR | E-invoicing HĐĐT | GrabFood + Shopee | Zalo OA + ZNS |
| **A6 CI/QA** | Fix lint + CI gates | Branch protection | E2E scope tests | Security audit | Integration tests | Load testing |

### Critical Path

```
Tuần 1: A6 fix CI ──────────────────────► A3 được merge migration
Tuần 3: A4 output ScopeProviders ───────► A2 build ScopeContextBar
                                        ► A3 viết RLS đúng
Tuần 5: A3 xong schema-per-module ──────► A5 build Edge Functions
Tuần 7: A5 xong Vault + PayOS ──────────► A3 thêm payment tables production-ready
```

---

## 27. Chi Tiết Từng Sprint

### Pre-Sprint — Tuần 1–2
> **Mục tiêu:** Foundation vững. Không feature mới cho đến khi xong.

| Agent | Tasks |
|---|---|
| **A6** | Fix 13 lint errors (root cause) · Bật 8 required status checks · Auto-cancel outdated workflow runs · Restore Flutter CI |
| **A1** | ADR-001: URL structure & scope rules · ADR-002: Query strategy · ADR-003: Schema-per-module plan |
| **A3** | Migration M001: rename `tenant_id` → `brand_id` · Alias view `brand_tenants` cho backward compat |
| **A4** | `packages/auth/nav-config.ts` với full type definitions · Xóa 3 bản duplicate nav mapping |

**Done:** CI xanh, brand_id migration chạy thành công trên staging

---

### Sprint 0 — Tuần 3–4
> **Mục tiêu:** Scope System hoạt động end-to-end

| Agent | Tasks |
|---|---|
| **A2** | Route groups `(brand)` + `(branch)` · Build `ScopeContextBar` · Integrate `useScope()` · Update `layout.tsx` |
| **A3** | Custom access token hook: inject `brand_id + user_role` vào JWT · RLS policies dùng `auth.jwt()` · Test isolation 2 brand accounts |
| **A4** | `BrandScopeProvider` + `BranchScopeProvider` · `getNavItems(role, scope)` · Login redirect logic · `has_role()` function |
| **A5** | Provision Vault: secret slots cho PayOS, VNPay, Zalo OA, GrabFood, MISA · SECURITY DEFINER functions cho Edge Functions đọc secrets |
| **A6** | Playwright test: login → ScopeContextBar đúng · Test scope switching URL · Secrets scan codebase |

**Done:** ScopeContextBar hiển thị brand/branch name chính xác trên mọi trang

---

### Sprint 1 — Tuần 5–6
> **Mục tiêu:** 8 modules đúng scope + PayOS live

| Agent | Tasks |
|---|---|
| **A2** | Move brand pages vào `/b/[brandId]/` · Move branch pages vào `/b/[brandId]/br/[branchId]/` · Tách Settings thành 2 route |
| **A3** | Thêm bảng mới: `refunds`, `settlement_batches`, `payment_webhooks` · UNIQUE constraint `customers(brand_id, phone)` · Junction table `menu_branch_assignments` |
| **A4** | Route middleware guards cho 8 modules · Settings route permissions · Test RBAC matrix 4 roles |
| **A5** | Edge Function `create-payment-link`: tạo PayOS QR · Edge Function `payos-webhook`: HMAC + idempotency + update payments · Test full payment flow staging |
| **A6** | E2E: không còn flat routes · Payment flow integration test · Vulnerability scan |

**Done:** Không còn route thiếu `brand_id` prefix · PayOS QR hoạt động end-to-end

---

### Sprint 2 — Tuần 7–8
> **Mục tiêu:** E-invoicing live + Schema-per-module

| Agent | Tasks |
|---|---|
| **A2** | Settings/brand UI: payment config, HĐĐT provider, Zalo OA · Settings/branch UI: POS devices, giờ mở cửa · VNPay QR UI |
| **A3** | Schema migration: tạo 10 module schemas · Move tables theo batch với `search_path` · Bảng `einvoice.einvoices` + `einvoice_configs` |
| **A4** | Review RLS sau schema migration · Verify JWT claims · Update `@repo/auth` types |
| **A5** | Edge Function `einvoice-submit`: XML per GDT → Viettel S-Invoice · Invoice QR qua Resend · VNPay HMAC webhook |
| **A6** | Security audit Edge Functions · E-invoice XML validation · Zero-downtime migration runbook |

**Done:** E-invoice tự động submit sau payment `completed` · Schema migration 0 downtime

---

### Sprint 3 — Tuần 9–10
> **Mục tiêu:** GrabFood + ShopeeFood live

| Agent | Tasks |
|---|---|
| **A5** | `grabfood-webhook`: normalize order → internal schema, ACK 5s · `shopeefood-webhook`: HMAC SHA256 · `menu-sync` scheduled (daily 3AM) |
| **A2** | Delivery module UI: incoming orders feed, accept/reject, platform toggle |
| **A3** | Thêm `source ENUM`, `external_order_id`, `commission_amount` · `delivery_platforms` config table per branch |
| **A6** | Integration tests webhooks với test payloads · Performance test: response time < 5s |

---

### Sprint 4 — Tuần 11–12
> **Mục tiêu:** Zalo OA + SaaS onboarding + Flutter app launch

| Agent | Tasks |
|---|---|
| **A5** | Zalo OA OAuth2 flow · `send-zalo-notification` · ZNS templates P0: `order_confirm`, `loyalty_update` |
| **A4** | SaaS brand onboarding: invite link, brand creation, setup wizard |
| **A3** | Materialized views: `customer_rfm_scores` (hourly), `daily_branch_financials` (15min) với CONCURRENT refresh |
| **A2** | Analytics dashboard UI: RFM segments, daily financial charts |
| **A6** | Load testing: 50 concurrent branches, Realtime KDS connections · Flutter app TestFlight submission |

---

## 28. Dependencies Matrix

### A4 → các Agent

| Handoff | Từ | Đến | Output | Deadline |
|---|---|---|---|---|
| H-03 | A4 | A2 | `useScope()` hook, `ScopeProviders` | Cuối tuần 3 |
| H-04 | A4 | A3 | `UserRole` enum, `ScopeContext` types | Cuối tuần 2 |
| H-04b | A4 | A6 | Nav config export cho E2E tests | Cuối tuần 4 |

### A3 → các Agent

| Handoff | Từ | Đến | Output | Deadline |
|---|---|---|---|---|
| H-05 | A3 | A2 | Generated TypeScript types | Auto sau mỗi migration |
| H-06 | A3 | A5 | Schema docs: `payments`, `refunds`, `payment_webhooks` | Cuối tuần 6 |
| H-06b | A3 | A5 | Schema: `einvoice.einvoices` | Cuối tuần 7 |

### A6 → toàn team

| Handoff | Từ | Đến | Output | Deadline |
|---|---|---|---|---|
| H-01 | A6 | ALL | CI xanh + branch protection | **Cuối tuần 2** |
| H-01b | A6 | A3 | Migration test framework | Cuối tuần 5 |

### A5 → A2

| Handoff | Từ | Đến | Output | Deadline |
|---|---|---|---|---|
| H-07 | A5 | A2 | PayOS response interface: `{ qrUrl, orderId, expiresAt }` | Cuối tuần 6 |
| H-07b | A5 | A2 | E-invoice status event interface | Cuối tuần 8 |

**Quy tắc xử lý dependency trễ:**
1. Agent nhận phát hiện trễ → báo ngay A1 trong daily sync
2. Agent cho tạo **mock interface** (TypeScript type stub) để unblock
3. A1 quyết định: resequence sprint, pair agents, hoặc giảm scope
4. Không Agent nào tự ý thay đổi interface contract mà không notify

---

## 29. Handoff Protocol

### Format Handoff Ticket (đặt trong PR description)

```markdown
## Handoff H-[ID]: [Tên output]
**From:** A[N] [Role] Agent
**To:** A[N] [Role] Agent
**Sprint:** Sprint [X], Tuần [N]

**Output file:** [path/to/file.ts]
**Exports:** [function/type names]
**Types:** [TypeScript interface definition]

**Agent nhận cần làm sau khi nhận:**
1. [Bước cụ thể]
2. [Bước cụ thể]

**Done condition:** [Tiêu chí kiểm tra rõ ràng]
```

### Ví dụ — H-03

```markdown
## Handoff H-03: useScope() hook
**From:** A4 Auth Agent → **To:** A2 Frontend Agent
**Sprint:** Sprint 0, Tuần 3

**Output file:** packages/auth/src/scope-context.tsx
**Exports:** useScope(), BrandScopeProvider, BranchScopeProvider
**Types:** ScopeContext { brandId, brandName, branchId?, branchName?, scope }

**A2 cần làm:**
1. Import useScope() vào ScopeContextBar
2. Wrap brand layout.tsx với BrandScopeProvider
3. Wrap branch layout.tsx với BranchScopeProvider

**Done condition:** A2 PR compile OK + ScopeContextBar render đúng brand/branch name
```

### 4 Quy Tắc Handoff không được vi phạm

1. **Không verbal handoff** — mọi output phải ở dạng code/type definition có thể review
2. **Agent nhận ack trong 4 giờ** — nếu không rõ thì hỏi ngay
3. **Interface contract không đổi ngầm** — thay đổi type → tạo H-ticket mới cho tất cả dependents
4. **A6 gate mọi Handoff** — artifact phải pass CI trước khi được coi là done

---

# Phần VIII — Roadmap & Migration

## 30. Scope Checklist — Feature Gate

> Mọi feature mới **bắt buộc** trả lời 4 câu hỏi này trước khi viết 1 dòng code.

```
Feature: [Tên tính năng]
PR: #[number]

□ 1. SCOPE
   Thương hiệu (ảnh hưởng cả chuỗi)  → route: /b/[brandId]/...
   Chi nhánh (chỉ 1 cơ sở)            → route: /b/[brandId]/br/[branchId]/...
   Cả hai (có thể filter)             → cần 2 views

□ 2. MODULE
   Thuộc module nào trong 9 domain?
   [ ] Tổng quan  [ ] Bán hàng   [ ] Thực đơn    [ ] Kho & Mua hàng
   [ ] Giao hàng  [ ] CRM        [ ] Tài chính   [ ] Nhân sự
   [ ] Báo cáo    [ ] API/Integration
   Nếu không fit → STOP, review IA với A1 trước

□ 3. RLS POLICY
   Đã viết policy cho scope đã xác định ở câu 1?
   Brand scope:  brand_id = (auth.jwt() ->> 'brand_id')::uuid
   Branch scope: brand_id = ... AND branch_id = ...

□ 4. API SURFACE
   Endpoint này được gọi từ surface nào? (POS / KDS / Brand Mgr / Branch Mgr / Staff / Customer)
   Đã thêm vào endpoints table trong Section 16?
   Offline behavior nếu là POS mutation?
```

---

## 31. Roadmap 3 Tier

### Tier 1 — Compliance & Revenue Gates (0–3 tháng)

| # | Feature | Sprint | Blocks |
|---|---|---|---|
| 1 | PayOS / VietQR integration | Sprint 1 (Tuần 3–4) | Revenue — zero-fee payment |
| 2 | E-invoicing Decree 70/2025 | Sprint 1 | Legal operation in Vietnam |
| 3 | Refunds + settlement_batches | Sprint 1 | Payment reconciliation |
| 4 | VNPay card aggregator | Sprint 2 (Tuần 5–6) | Card payment acceptance |
| 5 | GrabFood webhook | Sprint 2 | 36% Vietnam delivery volume |
| 6 | ShopeeFood webhook | Sprint 3 (Tuần 7–8) | 56% Vietnam delivery volume |
| 7 | Zalo OA / ZNS order notifications | Sprint 3 | Primary customer channel (77M MAU) |
| 8 | POS offline-first (Serwist + IndexedDB) | Sprint 4 (Tuần 9–10) | Unstable internet resilience |
| 9 | Schema-per-module migration | Sprint 4 | Microservice extraction path |
| 10 | Flutter app CI green + TestFlight | Sprint 4 | Customer access gap closure |
| 11 | SaaS: Brand onboarding + billing | Sprint 5 (Tuần 11–12) | First external SaaS customer |

### Tier 2 — Competitive Parity (3–6 tháng)

- Reservation + waitlist system (`reservations`, `waitlist_entries` + Realtime)
- RFM segmentation materialized view + automated Zalo campaign triggers
- Financial reporting: `daily_branch_financials`, `labor_cost_metrics`, `food_cost_avt`
- Inter-branch stock transfer workflow (`stock_transfers` + approval flow)
- MoMo + ZaloPay e-wallet integration (Phase 3 gateways)
- Payroll SI breakdown restructure + part-time SI compliance
- Multi-brand admin: platform dashboard cho SaaS brand management

### Tier 3 — Differentiation (6–24 tháng)

- BCG menu matrix (materialized view + interactive admin dashboard)
- AI demand forecasting (Edge Function → ML inference, `demand_forecasts` table)
- Dynamic pricing: ingredient-cost-driven + daypart promotions (subtle, không phải surge)
- Staff analytics: SPLH, upsell tracking, avg ticket per server, scheduling optimization
- Zalo Mini App: in-app ordering + loyalty (separate Zalo Mini App SDK project)
- VNPAY SmartPOS hardware integration
- SevenRooms-style guest CRM: auto-tagging, preference tracking, AI-assisted seating

---

## 32. Migration Path từ V2

### Non-Breaking First (chạy trước)

- Tất cả schema additions (bảng mới, cột mới) là backward-compatible
- Thêm `brand_id` làm alias: `CREATE VIEW brand_tenants AS SELECT id AS brand_id, * FROM tenants`
- Bảng mới (`refunds`, `settlement_batches`, `einvoices`) có thể thêm bất kỳ sprint nào

### Breaking Changes — Cẩn thận

- `tenant_id → brand_id` rename: single migration, chạy off-peak, update toàn bộ app code trong cùng PR
- `menus.branches UUID[]` → junction table: cần data migration script convert array values thành rows
- `public` → schema-per-module: move tables theo batch, dùng `search_path` cho backward compat trong transition

---

## 33. Microservice Extraction Triggers

| Trigger | Extract Service | Notes |
|---|---|---|
| > 500 orders/day | Payment Service | First extraction — PCI scope isolation |
| > 1000 concurrent users | Auth Service | JWT validation bottleneck |
| > 50 branches | Orders + KDS Service | Realtime WebSocket scaling |
| > 10 brands (SaaS) | Separate DB per brand | Từ shared DB → per-brand Supabase projects |

---

# Phụ Lục

## RBAC Role Matrix

| Resource | super_admin | owner | manager | staff | customer |
|---|---|---|---|---|---|
| Brands | Full CRUD | Read own | Read own | — | — |
| Branches | Full CRUD | Full CRUD | Read + Update | Read only | — |
| Orders | Full CRUD | Full CRUD | Full CRUD | Create + Read own | Read own |
| Payments | Full CRUD | Full CRUD | Read + Refund | Read only | Read own |
| Staff / HR | Full CRUD | Full CRUD | Read + Schedule | Read own | — |
| Analytics | All brands | Own brand | Own branch | — | — |
| E-invoices | Full CRUD | Full CRUD | Read + Void | Read only | Read own |
| Brand Settings | Full | Full | — | — | — |
| Branch Settings | Full | Full | Full | — | — |
| Menu | Full CRUD | Full CRUD | Edit | View only | View only |
| Delivery platforms | Full | Full | Toggle on/off | Accept/reject orders | — |

---

## Schema-per-Module Reference

| Schema | Tables |
|---|---|
| `core` | brands, branches, brand_members, profiles, audit_logs |
| `pos` | pos_terminals, pos_sessions, printers |
| `orders` | orders, order_items, order_status_history, delivery_orders |
| `payments` | payments, refunds, settlement_batches, payment_webhooks |
| `inventory` | ingredients, recipes, recipe_ingredients, stock_levels, stock_movements, stock_transfers, waste_logs, purchase_orders |
| `menu` | menus, menu_items, categories, menu_branch_assignments |
| `crm` | customers, loyalty_tiers, loyalty_transactions, campaigns, campaign_recipients, customer_segments, zalo_followers, zalo_oa_configs, zalo_message_templates |
| `hr` | staff, shifts, payroll_periods, payroll_entries, payroll_si_breakdown |
| `einvoice` | einvoices, einvoice_configs, einvoice_providers |
| `delivery` | delivery_platforms, platform_menu_mappings, platform_orders |

---

## Definition of Done per Sprint

### Pre-Sprint (Tuần 1–2)
- [ ] CI pipeline xanh — tất cả 8 stages pass
- [ ] Branch protection rules enabled trên `main`
- [ ] `tenant_id → brand_id` migration chạy thành công trên staging
- [ ] `nav-config.ts` tạo xong với TypeScript types đầy đủ
- [ ] ADR-001, ADR-002, ADR-003 đã được viết và acknowledged bởi toàn team

### Sprint 0 (Tuần 3–4)
- [ ] `ScopeContextBar` hiển thị brand/branch name chính xác trên mọi trang
- [ ] URL thay đổi khi user switch brand/branch
- [ ] JWT custom claims hook hoạt động — `brand_id` có trong token
- [ ] RLS test: user brand A không đọc được data brand B
- [ ] Vault provisioned với secret slots cho tất cả providers

### Sprint 1 (Tuần 5–6)
- [ ] Không còn flat route nào như `/orders`, `/menu` — tất cả có `brand_id` prefix
- [ ] Settings tách thành 2 route: `/settings/brand` và `/settings/branch`
- [ ] PayOS QR payment hoạt động end-to-end trong staging
- [ ] Bảng `refunds` và `settlement_batches` tồn tại và có RLS

### Sprint 2 (Tuần 7–8)
- [ ] E-invoice tự động submit sau payment `completed`
- [ ] Schema-per-module migration 0 downtime (runbook verified)
- [ ] VAT rate 8% emit đúng trong XML
- [ ] `einvoices.xml_data` với retention policy 10 năm

### Sprint 3 (Tuần 9–10)
- [ ] GrabFood webhook nhận và tạo đơn trong < 5s
- [ ] ShopeeFood webhook hoạt động với HMAC SHA256 auth
- [ ] Menu sync GrabFood/ShopeeFood daily 3AM hoạt động
- [ ] Order source badge hiển thị đúng trong orders list

### Sprint 4 (Tuần 11–12)
- [ ] ZNS `order_confirm` gửi sau mỗi payment completed
- [ ] Flutter app CI green
- [ ] Flutter app submit TestFlight / Play Store internal track
- [ ] RFM materialized view refresh hourly không blocking
- [ ] SaaS brand onboarding flow hoạt động từ đầu đến cuối

---

## Decision Summary

| Decision | Resolution |
|---|---|
| Platform identity | Multi-brand SaaS — comtammatu là platform, brands là tenants |
| Tenant model | Platform > Brand > Chain > Branch (4-level hierarchy) |
| Query strategy | supabase-js primary; Prisma cho migrations only |
| Auth pattern | JWT custom claims: `brand_id + user_role` trong mọi token |
| CI/CD | Fix trước bất kỳ feature work — branch protection enforced |
| Primary payment | PayOS (VietQR, zero fee) + VNPay (cards) trong Phase 0 |
| E-invoicing | Viettel S-Invoice hoặc VNPT — Edge Function pattern, 10yr archive |
| Delivery | Direct GrabFood + ShopeeFood webhooks — không dùng middleware aggregator |
| Customer channel | Zalo OA + ZNS là primary (77M MAU); Flutter app là secondary |
| Analytics | PostgreSQL materialized views + pg_cron — không cần separate analytics service |
| Mobile strategy | Flutter cho Customer + Staff; Next.js PWA cho POS + KDS |
| Offline scope | POS (cashier_station) offline-first; KDS không cần offline |
| Scope confusion fix | URL là nguồn sự thật duy nhất + `ScopeContextBar` mandatory |
| Nav config | `packages/auth/nav-config.ts` là file duy nhất — xóa 3 duplicates |
| Differentiation | BCG matrix + food cost AvT + RFM — không đối thủ Việt Nam nào có |

---

*Cập nhật lần cuối: March 2026 — Bình*
*Tài liệu này là living document, cập nhật sau mỗi Sprint Retrospective.*

---

# Phần IX — Flutter App

## 34. Flutter App Overview & Repo Structure

Flutter app (`comtammatu-app`) là **một codebase duy nhất** phục vụ 3 user types khác nhau: Brand/Branch Manager (quản lý), Staff (nhân viên), và Customer (khách hàng loyalty). Flavor-based build system tạo ra 3 app binaries riêng biệt với icon, tên, và feature set khác nhau.

### Repo Structure

```
comtammatu-app/
├── lib/
│   ├── main.dart                     ← Entry point, flavor detection
│   ├── app/
│   │   ├── app.dart                  ← MaterialApp + GoRouter setup
│   │   ├── router.dart               ← Route definitions per flavor
│   │   └── theme.dart                ← Brand theme tokens
│   ├── core/
│   │   ├── supabase/
│   │   │   ├── supabase_client.dart  ← Singleton init
│   │   │   ├── auth_provider.dart    ← Riverpod auth state
│   │   │   └── realtime_service.dart ← WebSocket subscriptions
│   │   ├── storage/
│   │   │   ├── secure_storage.dart   ← flutter_secure_storage cho tokens
│   │   │   └── hive_service.dart     ← Offline cache (shifts, menu)
│   │   ├── models/                   ← Generated từ Supabase types
│   │   └── utils/
│   │       ├── currency.dart         ← VND formatting
│   │       ├── date_vn.dart          ← Vietnamese date/time helpers
│   │       └── validators.dart       ← Phone, tax code, etc.
│   ├── features/
│   │   ├── auth/                     ← Login, OTP, Zalo OAuth
│   │   ├── manager/                  ← Brand & Branch Manager screens
│   │   ├── staff/                    ← Staff screens
│   │   └── customer/                 ← Customer loyalty screens
│   └── shared/
│       ├── widgets/                  ← Reusable UI components
│       └── constants/
├── flavors/
│   ├── manager/                      ← google-services, icons, config
│   ├── staff/
│   └── customer/
├── test/
│   ├── unit/
│   ├── widget/
│   └── integration/
└── pubspec.yaml
```

### Build Flavors

| Flavor | App Name | Bundle ID | Users | Features |
|---|---|---|---|---|
| `manager` | CTM Manager | vn.comtammatu.manager | owner, manager | Full brand/branch dashboard |
| `staff` | CTM Staff | vn.comtammatu.staff | staff | Lịch ca, chấm công, menu view |
| `customer` | Cơm Tấm Má Tư | vn.comtammatu.app | customer | Loyalty, menu, đặt bàn |

```bash
# Build commands
flutter run --flavor manager -t lib/main_manager.dart
flutter run --flavor staff -t lib/main_staff.dart
flutter run --flavor customer -t lib/main_customer.dart
```

### Core Dependencies

```yaml
dependencies:
  # Supabase
  supabase_flutter: ^2.x
  
  # State Management
  flutter_riverpod: ^2.x
  riverpod_annotation: ^2.x
  
  # Navigation
  go_router: ^13.x
  
  # Local Storage
  flutter_secure_storage: ^9.x
  hive_flutter: ^1.x
  
  # UI
  cached_network_image: ^3.x
  shimmer: ^3.x
  fl_chart: ^0.x          # Charts cho manager dashboard
  
  # Utilities
  intl: ^0.19.x           # VND formatting, Vietnamese locale
  qr_flutter: ^4.x        # QR code display (loyalty, chấm công)
  mobile_scanner: ^4.x    # QR scan (chấm công, đổi thưởng)
  
  # Notifications
  firebase_messaging: ^14.x
  flutter_local_notifications: ^17.x

dev_dependencies:
  build_runner: ^2.x
  riverpod_generator: ^2.x
  json_serializable: ^6.x
```

---

## 35. Flutter Component Tree — Brand & Branch Manager

> **Flavor:** `manager` | **Roles:** owner, manager | **Auth:** Email/password

### Navigation Structure

```
MainApp (MaterialApp)
└── GoRouter
    ├── /auth → AuthWrapper
    │   ├── LoginScreen
    │   └── OtpScreen
    │
    └── /home → HomeShell (BottomNavigationBar)
        ├── Tab 0: /dashboard → DashboardScreen
        ├── Tab 1: /analytics → AnalyticsScreen
        ├── Tab 2: /orders → OrdersScreen     (branch manager only)
        ├── Tab 3: /crm → CrmScreen           (owner only)
        └── Tab 4: /more → MoreScreen
```

### Screen Inventory — Manager App

```
features/manager/
├── auth/
│   ├── login_screen.dart
│   │   ├── BrandLogoHeader
│   │   ├── EmailTextField
│   │   ├── PasswordTextField
│   │   └── LoginButton (+ loading state)
│   └── otp_screen.dart
│       ├── PhoneTextField
│       ├── OtpInputRow (6 digits)
│       └── ResendTimer
│
├── dashboard/
│   ├── dashboard_screen.dart
│   │   ├── ScopeSwitcher             ← Brand ↔ Branch switcher (header)
│   │   ├── DateRangeSelector         ← Today / Week / Month
│   │   ├── RevenueCard               ← Doanh thu + vs previous period
│   │   ├── OrderCountCard
│   │   ├── AvgTicketCard
│   │   ├── BranchComparisonChart     ← fl_chart BarChart (owner only)
│   │   ├── TopMenuItemsList          ← Top 5 món bán chạy
│   │   └── LowStockAlertBanner       ← Cảnh báo tồn kho (nếu có)
│   └── widgets/
│       ├── kpi_card.dart
│       ├── branch_comparison_chart.dart
│       └── revenue_sparkline.dart
│
├── analytics/
│   ├── analytics_screen.dart
│   │   ├── AnalyticsTabBar           ← Financial / Food Cost / RFM / Delivery
│   │   ├── FinancialTab
│   │   │   ├── PrimeCostGauge        ← Target ≤60%
│   │   │   ├── FoodCostAvtTable      ← Theoretical vs Actual per item
│   │   │   └── LaborCostChart
│   │   ├── RfmTab
│   │   │   ├── RfmSegmentPieChart
│   │   │   ├── SegmentCard (x5)      ← Champions/Loyal/Promising/AtRisk/Lost
│   │   │   └── CampaignTriggerButton ← "Tạo chiến dịch Win-back"
│   │   ├── DeliveryTab
│   │   │   ├── PlatformSummaryRow (GrabFood / ShopeeFood)
│   │   │   └── CommissionBreakdown
│   │   └── BcgTab                    ← Tier 3 — owner only
│   │       ├── BcgMatrixChart        ← 4 quadrants
│   │       └── MenuItemBcgList
│   └── widgets/
│       ├── prime_cost_gauge.dart
│       ├── rfm_segment_card.dart
│       └── bcg_matrix_chart.dart
│
├── orders/                           ← Branch scope
│   ├── orders_screen.dart
│   │   ├── OrderFilterBar            ← Status / Date / Source (POS/Grab/Shopee)
│   │   ├── OrderListView
│   │   │   └── OrderListTile         ← Order ID, table, amount, source badge
│   │   └── OrderDetailSheet (modal)
│   │       ├── OrderItemsList
│   │       ├── PaymentSummary
│   │       └── EinvoiceStatusChip
│   └── widgets/
│       └── order_list_tile.dart
│
├── inventory/                        ← Branch scope
│   ├── inventory_screen.dart
│   │   ├── StockLevelList
│   │   │   └── StockItemTile         ← Ingredient, current/min stock, status
│   │   └── LowStockBadge
│   ├── stock_count_screen.dart
│   │   ├── StockCountHeader
│   │   ├── IngredientCountList
│   │   └── SubmitCountButton
│   └── purchase_order_screen.dart
│       ├── PoListView
│       └── CreatePoButton → CreatePoSheet
│           ├── SupplierPicker
│           ├── ItemQuantityList
│           └── SubmitPoButton
│
├── crm/                              ← Brand scope, owner only
│   ├── crm_screen.dart
│   │   ├── CustomerSearchBar
│   │   ├── RfmFilterChips            ← All / Champions / At Risk / Lost
│   │   └── CustomerListView
│   │       └── CustomerListTile      ← Name, tier badge, last visit, points
│   ├── customer_detail_screen.dart
│   │   ├── CustomerProfileHeader
│   │   ├── LoyaltyTierCard
│   │   ├── TransactionHistoryList
│   │   └── OrderHistoryList
│   └── campaign_screen.dart
│       ├── CampaignListView
│       ├── CreateCampaignFab
│       └── CreateCampaignSheet
│           ├── ChannelSelector       ← Email / SMS / Zalo
│           ├── SegmentPicker         ← Target RFM segment
│           ├── MessageTemplateField
│           └── ScheduleSelector
│
└── settings/
    ├── brand_settings_screen.dart    ← owner only
    │   ├── BrandProfileSection
    │   ├── PaymentGatewaySection     ← PayOS / VNPay config
    │   ├── EinvoiceSection           ← Provider, tax code
    │   ├── ZaloOaSection             ← OA ID, connect button
    │   └── TeamMembersSection        ← Invite, manage roles
    └── branch_settings_screen.dart   ← owner + manager
        ├── BranchInfoSection
        ├── OpeningHoursSection
        ├── DeliveryPlatformsSection  ← GrabFood/ShopeeFood toggle
        └── PosDevicesSection         ← Registered terminals
```

---

## 36. Flutter Component Tree — Staff App

> **Flavor:** `staff` | **Role:** staff | **Auth:** Email/password hoặc QR token từ manager

### Screen Inventory — Staff App

```
features/staff/
├── auth/
│   └── staff_login_screen.dart
│       ├── StaffCodeField           ← 6-digit staff code (alternative to email)
│       ├── QrLoginButton            ← Manager generates QR for first login
│       └── EmailLoginButton         ← Fallback
│
├── home/
│   └── staff_home_screen.dart       ← BottomNav: Schedule / Menu / Profile
│       ├── Tab 0: /schedule → ScheduleScreen
│       ├── Tab 1: /menu → MenuViewScreen
│       └── Tab 2: /profile → StaffProfileScreen
│
├── schedule/
│   ├── schedule_screen.dart
│   │   ├── WeekCalendarStrip        ← Horizontal week view, highlight today
│   │   ├── ShiftCard                ← Start/end time, position, location
│   │   ├── ClockInButton            ← Active when within 15min of shift start
│   │   └── ClockOutButton           ← Active when shift is active
│   ├── clock_in_screen.dart
│   │   ├── QrScannerView            ← Scan branch QR code để chấm công
│   │   ├── LocationCheckIndicator   ← Verify within branch geofence (optional)
│   │   └── ConfirmClockInButton
│   └── payslip_screen.dart
│       ├── PayPeriodSelector        ← Monthly picker
│       ├── GrossSalaryCard
│       ├── DeductionsBreakdown      ← BHXH/BHYT/BHTN breakdown
│       ├── NetSalaryCard
│       └── PayslipDownloadButton
│
├── menu/
│   └── menu_view_screen.dart        ← Read-only menu reference
│       ├── CategoryTabBar
│       ├── MenuItemGrid
│       │   └── MenuItemCard         ← Image, name, price, description
│       └── MenuItemDetailSheet
│
└── profile/
    └── staff_profile_screen.dart
        ├── AvatarSection
        ├── PersonalInfoSection
        ├── BranchInfoChip           ← Đang làm tại chi nhánh nào
        ├── NotificationsSection     ← Thông báo ca mới, thay ca
        └── LogoutButton
```

### Chấm Công Flow

```
ShiftCard → "Bắt đầu ca" button
    ↓
ClockInScreen
    ↓
QR Scanner (mobile_scanner)
    → Scan QR code được gen từ branch settings (rotate every 5 min)
    ↓
rpc/clock_in(staff_id, branch_id, qr_token, timestamp)
    → Server validate: QR còn valid, staff đúng branch, trong 15min của shift
    ↓
Success: ShiftCard cập nhật "Ca đang chạy" + timer
    ↓
"Kết thúc ca" → rpc/clock_out(shift_id, timestamp)
```

---

## 37. Flutter Component Tree — Customer Loyalty App

> **Flavor:** `customer` | **Role:** customer | **Auth:** Phone OTP hoặc Zalo OAuth

### Screen Inventory — Customer App

```
features/customer/
├── auth/
│   ├── welcome_screen.dart
│   │   ├── BrandLogoAnimation
│   │   ├── PhoneLoginButton
│   │   └── ZaloLoginButton          ← OAuth2 via Zalo SDK
│   ├── phone_otp_screen.dart
│   │   ├── PhoneInputField
│   │   ├── OtpInputRow
│   │   └── ResendTimer (60s)
│   └── profile_setup_screen.dart    ← First login only
│       ├── NameField
│       ├── BirthdayPicker           ← Cho birthday campaign
│       └── GenderSelector
│
├── home/ (BottomNav)
│   ├── Tab 0: /home → CustomerHomeScreen
│   ├── Tab 1: /menu → MenuBrowseScreen
│   ├── Tab 2: /loyalty → LoyaltyScreen
│   ├── Tab 3: /orders → OrderHistoryScreen
│   └── Tab 4: /profile → CustomerProfileScreen
│
├── home/
│   └── customer_home_screen.dart
│       ├── GreetingHeader           ← "Xin chào Bình! ☀️"
│       ├── LoyaltySummaryCard       ← Điểm hiện tại, tier badge, tiến trình lên tier
│       ├── ActiveVoucherBanner      ← Voucher sắp hết hạn (nếu có)
│       ├── NearbyBranchesMap        ← Map với markers chi nhánh gần nhất
│       ├── RecentOrdersPreview      ← 2 đơn gần nhất
│       └── FeaturedMenuSection      ← Món đang khuyến mãi
│
├── menu/
│   ├── menu_browse_screen.dart
│   │   ├── BranchSelectorChip       ← Xem menu theo chi nhánh
│   │   ├── SearchBar
│   │   ├── CategoryTabBar
│   │   └── MenuItemList
│   │       └── MenuItemCard
│   │           ├── ItemImage
│   │           ├── ItemName + Price
│   │           ├── AvailabilityChip ← Còn/Hết
│   │           └── CaloriesChip     ← Nếu có dữ liệu
│   └── menu_item_detail_screen.dart
│       ├── HeroItemImage
│       ├── ItemDescription
│       ├── NutritionInfo (nếu có)
│       └── OrderAtBranchButton      ← Deep link đến booking/table
│
├── loyalty/
│   ├── loyalty_screen.dart
│   │   ├── LoyaltyTierHeroCard
│   │   │   ├── TierBadge            ← Bronze / Silver / Gold / Platinum
│   │   │   ├── PointsDisplay        ← "1,250 điểm"
│   │   │   ├── TierProgressBar      ← X điểm nữa để lên hạng
│   │   │   └── NextTierBenefits
│   │   ├── EarnRulesSection         ← Cách tích điểm
│   │   ├── RewardsSection
│   │   │   └── RewardCard (x N)     ← Image, name, points cost, expiry
│   │   └── TransactionHistoryList
│   │       └── TransactionTile      ← Date, desc, +/- points
│   └── reward_detail_screen.dart
│       ├── RewardHeroImage
│       ├── RewardDescription
│       ├── PointsCostDisplay
│       ├── ExpiryDateInfo
│       └── RedeemButton → RedeemConfirmSheet
│           ├── PointsBalance
│           ├── ConfirmCta
│           └── QrCodeDisplay        ← QR voucher sau khi redeem
│
├── orders/
│   └── order_history_screen.dart
│       ├── OrderFilterBar           ← All / Dine-in / Delivery / Pickup
│       ├── OrderHistoryList
│       │   └── OrderHistoryTile
│       │       ├── OrderDate + Branch
│       │       ├── ItemsSummary     ← "Cơm sườn nướng + 2 món khác"
│       │       ├── TotalAmount
│       │       └── EinvoiceButton   ← Xem/tải HĐĐT
│       └── ReorderButton            ← Repeat order (Phase 2)
│
├── reservation/ (Phase 2)
│   └── reservation_screen.dart
│       ├── BranchSelector
│       ├── DateTimePicker
│       ├── PartySizeSelector
│       ├── SpecialRequestField
│       └── ConfirmBookingButton
│
└── profile/
    └── customer_profile_screen.dart
        ├── AvatarSection
        ├── PersonalInfoForm
        ├── LinkedAccountsSection    ← Zalo, Phone connected status
        ├── NotificationPrefsSection ← ZNS, push notification opt-in/out
        ├── FavoritesBranchSection
        └── LogoutButton
```

---

## 38. Flutter State Management & Shared Packages

### Riverpod Provider Architecture

```dart
// lib/core/supabase/auth_provider.dart
@riverpod
class AuthNotifier extends _$AuthNotifier {
  @override
  AuthState build() {
    // Listen to Supabase auth changes
    ref.onDispose(
      Supabase.instance.client.auth.onAuthStateChange.listen((event) {
        state = _mapEventToState(event);
      }).cancel,
    );
    return _getCurrentState();
  }
}

// lib/features/manager/dashboard/providers/dashboard_provider.dart
@riverpod
Future<DashboardData> dashboardData(
  DashboardDataRef ref,
  String branchId,
  DateRange range,
) async {
  final supabase = ref.watch(supabaseClientProvider);
  return supabase
    .from('daily_branch_financials')
    .select()
    .eq('branch_id', branchId)
    .gte('date', range.start.toIso8601String())
    .lte('date', range.end.toIso8601String());
}
```

### Provider Hierarchy

```
Providers (Riverpod)
├── authProvider              ← Auth state (logged in, role, brand/branch IDs)
├── supabaseClientProvider    ← Singleton Supabase client
├── scopeProvider             ← Current brandId + branchId + scope type
│
├── Manager Providers
│   ├── dashboardDataProvider(branchId, range)
│   ├── analyticsProvider(brandId, type)
│   ├── ordersProvider(branchId, filters)
│   ├── inventoryProvider(branchId)
│   └── crmProvider(brandId, segment)
│
├── Staff Providers
│   ├── schedulesProvider(staffId)
│   ├── currentShiftProvider(staffId)
│   └── payslipProvider(staffId, period)
│
└── Customer Providers
    ├── loyaltyProvider(customerId)
    ├── rewardsProvider(brandId)
    ├── menuProvider(brandId, branchId)
    └── orderHistoryProvider(customerId)
```

### Shared Widget Library (`lib/shared/widgets/`)

```
shared/widgets/
├── atoms/
│   ├── ctm_button.dart              ← Primary, secondary, ghost variants
│   ├── ctm_text_field.dart          ← Supabase-ready với validation
│   ├── ctm_badge.dart               ← Status, tier, source badges
│   ├── vnd_text.dart                ← Auto-format VND amounts
│   └── loading_shimmer.dart
│
├── molecules/
│   ├── kpi_card.dart                ← Metric + label + trend arrow
│   ├── scope_switcher.dart          ← Brand ↔ Branch dropdown header
│   ├── order_status_stepper.dart    ← Pending → Confirmed → Ready → Done
│   ├── loyalty_tier_card.dart       ← Tier + progress bar
│   └── branch_picker_sheet.dart     ← Bottom sheet chọn chi nhánh
│
└── organisms/
    ├── bottom_nav_shell.dart        ← Wrapper với GoRouter ShellRoute
    ├── pull_to_refresh_list.dart    ← Standardized refresh pattern
    └── error_state_widget.dart      ← Error + retry button
```

---

## 39. Flutter–Supabase Integration Patterns

### Pattern 1 — Query với RLS (đa số endpoints)

```dart
// Đơn giản — RLS tự filter theo JWT claims
final orders = await supabase
    .from('orders')
    .select('*, order_items(*), payments(*)')
    .eq('branch_id', currentBranchId)
    .order('created_at', ascending: false)
    .limit(50);
```

### Pattern 2 — RPC Call cho business logic

```dart
// Clock in với validation server-side
final result = await supabase.rpc('clock_in', params: {
  'p_staff_id': staffId,
  'p_branch_id': branchId,
  'p_qr_token': scannedToken,
  'p_timestamp': DateTime.now().toIso8601String(),
});
if (result['success'] == false) {
  throw ClockInException(result['error_code']);
}
```

### Pattern 3 — Realtime Subscription

```dart
// lib/core/supabase/realtime_service.dart
class RealtimeService {
  RealtimeChannel? _channel;

  void subscribeToDeliveryOrders(String branchId, Function(Map) onNew) {
    _channel = supabase
        .channel('delivery:$branchId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'orders',
          table: 'orders',
          filter: PostgresChangeFilter(
            type: FilterType.eq,
            column: 'branch_id',
            value: branchId,
          ),
          callback: (payload) => onNew(payload.newRecord),
        )
        .subscribe();
  }

  void unsubscribe() => _channel?.unsubscribe();
}
```

### Pattern 4 — Offline Cache (Staff schedule)

```dart
// lib/core/storage/hive_service.dart
class HiveService {
  static const shiftsBox = 'shifts_cache';

  Future<void> cacheShifts(String staffId, List<Shift> shifts) async {
    final box = await Hive.openBox(shiftsBox);
    await box.put(staffId, {
      'data': shifts.map((s) => s.toJson()).toList(),
      'cached_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Shift>?> getCachedShifts(String staffId) async {
    final box = await Hive.openBox(shiftsBox);
    final cached = box.get(staffId);
    if (cached == null) return null;
    final age = DateTime.now().difference(DateTime.parse(cached['cached_at']));
    if (age.inHours > 24) return null; // Stale after 24h
    return (cached['data'] as List).map((j) => Shift.fromJson(j)).toList();
  }
}
```

---

# Phần X — Zalo Mini App Architecture

## 40. Zalo Mini App Overview

Zalo Mini App chạy **trong native Zalo app** (77M MAU), không cần install riêng. Đây là kênh tiếp cận khách hàng có ROI cao nhất tại Việt Nam — gần 100% visibility rate so với push notification hay email.

### Scope của Zalo Mini App

| Tính năng | Zalo Mini App | Flutter App | Lý do phân chia |
|---|---|---|---|
| Xem menu + giá | ✅ Tier 1 | ✅ | Mini App tiếp cận cold users |
| Xem điểm loyalty | ✅ Tier 1 | ✅ | Mini App nhanh hơn — không cần install |
| Đổi thưởng (voucher) | ✅ Tier 1 | ✅ | Both channels |
| Nhận ZNS notifications | ✅ (tự động) | ⚠️ Push (opt-in) | ZNS không cần follow OA |
| Đặt bàn | ✅ Tier 2 | ✅ Tier 2 | Both channels |
| Order tại bàn | ✅ Tier 2 | ❌ | Mini App = scan QR tại bàn |
| Loyalty dashboard đầy đủ | ⚠️ Basic | ✅ Full | Flutter có more screen real estate |
| Lịch sử đơn chi tiết | ❌ | ✅ | Flutter app |
| Profile management | ✅ Basic | ✅ Full | Mini App chỉ read-only |

### Tech Stack Zalo Mini App

```
Zalo Mini App SDK (JavaScript/TypeScript)
├── Framework: Zalo Mini App Framework (ZMA Framework)
├── Language: TypeScript
├── UI: ZMA UI Components + Custom CSS
├── State: React-like hooks (ZMA built-in)
├── API: Zalo JS SDK + fetch() → Supabase
└── Build: ZMA CLI
```

---

## 41. Zalo Mini App Screen Tree

```
ZaloMiniApp (zma.config.js entry)
└── App (app.js)
    ├── AuthGuard                    ← Check Zalo auth token
    │
    ├── /home → HomePage
    │   ├── BrandBanner              ← Brand logo + tagline
    │   ├── LoyaltySummaryCard
    │   │   ├── PointsDisplay        ← "1,250 điểm"
    │   │   ├── TierBadge
    │   │   └── ExpiryWarning        ← "50 điểm hết hạn sau 7 ngày"
    │   ├── ActiveVouchersRow        ← Horizontal scroll
    │   ├── NearbyBranchesSection
    │   │   └── BranchCard (x N)    ← Name, distance, open status
    │   └── PromotionsSection        ← Đang khuyến mãi
    │
    ├── /menu → MenuPage
    │   ├── BranchSelector           ← Dropdown chọn chi nhánh
    │   ├── CategoryTabs
    │   ├── MenuItemList
    │   │   └── MenuItemRow
    │   │       ├── ItemImage (60x60)
    │   │       ├── ItemName + Price
    │   │       └── AvailabilityDot
    │   └── MenuItemDetailModal
    │       ├── ItemFullImage
    │       ├── Description
    │       └── OrderAtBranchButton
    │
    ├── /loyalty → LoyaltyPage
    │   ├── TierProgressCard
    │   │   ├── CurrentTierIcon
    │   │   ├── PointsBar            ← Progress to next tier
    │   │   └── TierBenefitsList
    │   ├── RedeemSection
    │   │   └── RewardCard (x N)
    │   │       ├── RewardImage
    │   │       ├── RewardName
    │   │       ├── PointsCost
    │   │       └── RedeemButton → RedeemConfirmPage
    │   │           ├── RewardSummary
    │   │           ├── PointsDeduction
    │   │           └── ConfirmButton → VoucherPage
    │   │               ├── QrCodeDisplay    ← Show to staff khi dùng
    │   │               ├── VoucherCode
    │   │               └── ExpiryCountdown
    │   └── EarnRulesSection
    │       └── EarnRuleCard (x N)   ← X điểm cho mỗi Y VND
    │
    ├── /order-at-table → TableOrderPage   ← Phase 2, QR từ bàn
    │   ├── TableInfo                ← Branch + table number (from QR params)
    │   ├── MenuBrowse (embedded)
    │   ├── CartSummary
    │   └── PlaceOrderButton → OrderConfirmPage
    │       ├── OrderSummary
    │       ├── PaymentSelector      ← VietQR / Cash
    │       └── ConfirmButton
    │
    └── /reservation → ReservationPage    ← Phase 2
        ├── BranchSelector
        ├── DateTimePicker
        ├── PartySizeInput
        ├── SpecialRequestInput
        └── BookButton → BookingConfirmPage
            ├── BookingDetails
            └── ZnsConfirmNote       ← "Bạn sẽ nhận xác nhận qua Zalo"
```

---

## 42. Zalo OAuth & Auth Flow

```
User mở Mini App lần đầu
    ↓
ZMA Framework auto-request Zalo user info
    ↓
getPhoneNumber() permission dialog  ← User phải đồng ý
    ↓
JS SDK: za.getPhoneNumber()
    → { token: "zalo_phone_token" }
    ↓
Gọi Edge Function: zalo-auth-exchange
    body: { zalo_phone_token, zalo_user_id, brand_id }
    ↓
Edge Function:
    1. Verify token với Zalo Access Token Validation API
    2. Extract phone number
    3. Lookup/create customer trong crm.customers(brand_id, phone)
    4. Create/update crm.zalo_followers(brand_id, customer_id, zalo_user_id)
    5. Issue Supabase custom JWT (role=customer, brand_id, customer_id)
    ↓
Mini App nhận JWT → lưu vào ZMA Storage
    ↓
Mọi API calls tiếp theo dùng JWT này → RLS enforce
```

```javascript
// zalo-auth-exchange Edge Function (Deno)
Deno.serve(async (req) => {
  const { zalo_phone_token, zalo_user_id, brand_id } = await req.json()

  // 1. Verify với Zalo
  const zaloRes = await fetch('https://oauth.zaloapp.com/v4/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      code: zalo_phone_token,
      app_id: Deno.env.get('ZALO_APP_ID'),
      grant_type: 'authorization_code',
    })
  })
  const { access_token } = await zaloRes.json()

  // 2. Lấy phone number từ Zalo Graph API
  const userRes = await fetch(
    `https://graph.zalo.me/v2.0/me?access_token=${access_token}&fields=id,name,picture,phone`
  )
  const { phone } = await userRes.json()

  // 3. Upsert customer trong Supabase
  const supabase = createClient(url, serviceRoleKey)
  const { data: customer } = await supabase
    .from('crm.customers')
    .upsert({ brand_id, phone, zalo_user_id }, { onConflict: 'brand_id,phone' })
    .select()
    .single()

  // 4. Update zalo_followers
  await supabase.from('crm.zalo_followers').upsert({
    brand_id, customer_id: customer.id, zalo_user_id, followed_at: new Date()
  }, { onConflict: 'brand_id,zalo_user_id' })

  // 5. Issue custom JWT
  const { data: { session } } = await supabase.auth.admin.createUser({
    user_metadata: { brand_id, customer_id: customer.id, role: 'customer' }
  })

  return new Response(JSON.stringify({ token: session.access_token }))
})
```

---

## 43. Zalo Mini App — API Integration

### Supabase calls từ Mini App

```javascript
// zalo-mini-app/src/services/supabase.js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Auth: set JWT từ zalo-auth-exchange
export function setSession(token) {
  supabase.auth.setSession({ access_token: token, refresh_token: '' })
}

// Lấy loyalty balance
export async function getLoyaltyBalance(customerId) {
  const { data } = await supabase
    .from('crm.customers')
    .select('total_points, loyalty_tier, tier_progress')
    .eq('id', customerId)
    .single()
  return data
}

// Lấy rewards available
export async function getAvailableRewards(brandId) {
  const { data } = await supabase
    .from('crm.rewards')
    .select('*')
    .eq('brand_id', brandId)
    .eq('active', true)
    .order('points_cost', { ascending: true })
  return data
}

// Redeem reward
export async function redeemReward(rewardId, customerId) {
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_reward_id: rewardId,
    p_customer_id: customerId,
  })
  if (error) throw new RedeemException(error.message)
  return data // { voucher_code, qr_data, expires_at }
}
```

---

## 44. ZNS Template Management

### Template Types và Approval Process

```
crm.zalo_message_templates (per brand)
    ├── order_confirm
    │   params: { customer_name, order_id, branch_name, total_amount, items_summary }
    │   sample: "Xin chào {customer_name}! Đơn #{order_id} tại {branch_name} đã được xác nhận.
    │            Tổng: {total_amount}. Dự kiến: 15-20 phút."
    │
    ├── loyalty_update
    │   params: { customer_name, points_earned, total_points, tier_name }
    │   sample: "Bạn vừa tích được {points_earned} điểm tại Cơm Tấm Má Tư!
    │            Tổng điểm: {total_points} | Hạng: {tier_name}"
    │
    ├── win_back
    │   params: { customer_name, days_absent, voucher_code, expiry_date }
    │   sample: "Nhớ bạn quá {customer_name}! Đã {days_absent} ngày rồi nhỉ?
    │            Dùng mã {voucher_code} để được giảm 20% (HSD: {expiry_date})"
    │
    ├── birthday
    │   params: { customer_name, gift_description, expiry_date }
    │   sample: "Chúc mừng sinh nhật {customer_name}! 🎂
    │            Món quà từ CTM: {gift_description} (HSD: {expiry_date})"
    │
    └── promo
        params: { customer_name, promo_title, promo_detail, cta_url }
        sample: Flexible — nhập từ admin campaign builder
```

### ZNS Send Flow

```
Trigger (pg_cron / payment webhook / manual)
    ↓
Edge Function: send-zalo-notification
    ↓
1. Fetch customer → get zalo_user_id từ zalo_followers
2. Fetch brand → get zalo_oa access_token từ Vault
3. Fetch template → get pre-approved template_id
4. Build ZNS payload với params
5. POST https://business.openapi.zalo.me/message/template
    body: { phone, template_id, template_data: { ...params }, tracking_id }
6. Log result trong crm.zns_send_log (success/failed, tracking_id)
```

### Access Token Refresh Strategy

```
pg_cron: every 12 hours
    ↓
Edge Function: zalo-token-refresh
    ↓
For each brand with active zalo_oa_config:
    1. Read refresh_token từ Vault (secret: zalo_refresh_[brand_id])
    2. POST https://oauth.zaloapp.com/v4/access_token
       { grant_type: 'refresh_token', refresh_token }
    3. Vault.update('zalo_access_[brand_id]', new_access_token)
    4. Update zalo_oa_configs.token_expires_at
```

---

## 45. Flutter App vs Zalo Mini App — Khi Nào Dùng Cái Nào

| Scenario | Recommended | Lý do |
|---|---|---|
| Khách hàng mới chưa install app | **Zalo Mini App** | Zero friction — trong Zalo sẵn có |
| Nhận thông báo đơn hàng | **ZNS** (qua Zalo) | 100% visibility, không cần open app |
| Kiểm tra điểm nhanh | **Zalo Mini App** | Nhanh hơn — không cần open app riêng |
| Xem lịch sử chi tiết, đổi thưởng phức tạp | **Flutter App** | More screen space, full features |
| Đặt bàn (Phase 2) | **Cả hai** | Sync booking data |
| Order tại bàn qua QR (Phase 2) | **Zalo Mini App** | Khách scan QR bàn → order ngay trong Zalo |
| Loyalty dashboard đầy đủ | **Flutter App** | Charts, tier benefits, full history |
| Campaign promo push | **ZNS** (không cần install) → deep link vào **Flutter App** | ZNS deliver, Flutter show detail |

**Deep link strategy:**

```
ZNS message → chứa link zma://comtammatu.com/loyalty?voucher_code=ABC
    ↓
User tap → opens Zalo Mini App tại /loyalty screen với voucher highlighted
    ↓
OR: link https://comtammatu.com/app/loyalty?code=ABC
    → Open in browser with install prompt cho Flutter app
```

---

# Phần XI — SaaS Billing Flow

## 46. Billing Architecture Overview

Billing system dùng **VNPay làm payment processor** cho thị trường Việt Nam (thay vì Stripe). Subscription management được build in-house trên Supabase — không dùng third-party billing SaaS để tránh phí và giữ control.

### Billing Flow Tổng Quan

```
Brand Owner (new customer)
    ↓
Trial signup (14 ngày free, không cần thẻ)
    ↓
Trial reminder (Day 7, Day 12, Day 13 — via ZNS)
    ↓
Trial expired → Upgrade prompt
    ↓
Select plan (Starter / Growth / Enterprise)
    ↓
VNPay payment (first month)
    ↓
Subscription active → Feature gates unlock
    ↓
Monthly auto-renewal via VNPay recurring
    ↓
Payment failure → Grace period (3 ngày)
    → Retry notification (ZNS)
    → Feature degradation sau 3 ngày
    → Account freeze sau 7 ngày
    ↓
Renewal success → Continue; Upgrade/Downgrade → Prorate
```

---

## 47. Trial & Onboarding Flow

### Step-by-Step Onboarding

```
Step 1: Brand Registration (Platform public page)
    → /signup
    → Fields: brand_name, owner_email, phone, password
    → Creates: brands record (status='trial'), brand_members record (role='owner')
    → Sends: Welcome ZNS + email via Resend

Step 2: Brand Setup Wizard (First login — /setup)
    → Page 1: Brand identity (logo, color scheme, cuisine type)
    → Page 2: First branch (name, address, opening hours)
    → Page 3: E-invoicing config (tax code, provider choice)
    → Page 4: Team invite (optional — invite managers)
    → Complete: brands.onboarding_completed = true

Step 3: Trial Period (14 ngày)
    → All Growth features unlocked for trial
    → Trial banner persistent in admin header
    → Day 7: ZNS "Bạn còn 7 ngày trial — khám phá tính năng X"
    → Day 12: ZNS "2 ngày nữa trial kết thúc — nâng cấp ngay"
    → Day 13: Email + ZNS với pricing comparison table
    → Day 14 00:00: brands.subscription_status = 'trial_expired'
        → Feature gating activates (Starter features only)
        → Upgrade modal shown on every page load

Step 4: Upgrade to Paid
    → User selects plan
    → VNPay payment page
    → On success: subscription created, features unlock immediately
```

---

## 48. Subscription Lifecycle

### States

```
trial          → Active trial (14 ngày, all Growth features)
trial_expired  → Trial ended, chưa upgrade (Starter features only)
active         → Paid subscription, features per plan
past_due       → Payment failed, trong grace period (3 ngày, full features)
suspended      → Grace period hết (7 ngày, read-only mode)
cancelled      → Brand owner cancelled, features until period end
churned        → Subscription ended, data retained 90 ngày
```

### State Transitions

```
trial ──────────────────────────────► trial_expired
  │                                         │
  │ upgrade                                 │ upgrade
  ▼                                         ▼
active ◄─────────────────────────── active
  │                                         ▲
  │ payment_failed                          │ payment_success (retry)
  ▼                                         │
past_due ────────────────────────────────── ┘
  │
  │ 3 days no payment
  ▼
suspended
  │
  │ 7 days no payment OR explicit cancel
  ▼
cancelled ──► (period_end) ──► churned
```

---

## 49. Payment Processing — VNPay Recurring

### Lý do chọn VNPay thay Stripe

| Criteria | VNPay | Stripe |
|---|---|---|
| Thẻ nội địa (Napas) | ✅ | ❌ |
| Chuyển khoản ngân hàng | ✅ | ❌ |
| Ví điện tử VN | ✅ | ❌ |
| Recurring billing | ✅ (Token-based) | ✅ |
| Phí giao dịch | ~1.1% + 3,300 VND | ~2.9% + $0.30 |
| Pháp lý VN | ✅ (licensed) | ⚠️ (offshore) |

### VNPay Recurring Token Flow

```
First payment (manual):
    ↓
User chọn plan → click "Thanh toán"
    ↓
Backend tạo VNPay payment URL với param tokenize=true
    ↓
User nhập thẻ / chọn ngân hàng trên VNPay page
    ↓
VNPay webhook: { order_id, token, card_last4, bank_code }
    ↓
Edge Function: vnpay-billing-webhook
    1. Verify HMAC signature
    2. Store token trong Supabase Vault: 'vnpay_token_[brand_id]'
    3. Update subscriptions record: status='active', payment_method='vnpay_token'
    4. Create billing_events record

Subsequent monthly renewals (automated):
    ↓
pg_cron: daily 09:00 → check subscriptions where next_billing_date = today
    ↓
Edge Function: process-renewal
    1. Read stored VNPay token từ Vault
    2. POST to VNPay recurring charge API
       { token, amount, order_id, description }
    3. On success: extend subscriptions.current_period_end +1 month
    4. On failure: set status='past_due', start grace period
    5. Send ZNS notification (success or failure)
```

### Renewal Edge Function

```typescript
// supabase/functions/process-renewal/index.ts
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Get all subscriptions due today
  const { data: dueSubs } = await supabase
    .from('billing.subscriptions')
    .select('*, brands(*)')
    .eq('next_billing_date', new Date().toISOString().split('T')[0])
    .eq('status', 'active')

  for (const sub of dueSubs) {
    const token = await getVaultSecret(`vnpay_token_${sub.brand_id}`)
    
    const result = await chargeVnPayToken({
      token,
      amount: sub.plan_price_vnd,
      orderId: `renewal_${sub.id}_${Date.now()}`,
    })

    if (result.success) {
      await supabase.from('billing.subscriptions').update({
        current_period_end: addMonths(sub.current_period_end, 1),
        next_billing_date: addMonths(sub.next_billing_date, 1),
      }).eq('id', sub.id)

      await sendZns(sub.brand_id, 'billing_success', {
        brand_name: sub.brands.name,
        amount: formatVnd(sub.plan_price_vnd),
        next_date: formatDate(addMonths(sub.next_billing_date, 1)),
      })
    } else {
      await supabase.from('billing.subscriptions').update({
        status: 'past_due',
        past_due_since: new Date().toISOString(),
      }).eq('id', sub.id)

      await sendZns(sub.brand_id, 'billing_failed', {
        brand_name: sub.brands.name,
        amount: formatVnd(sub.plan_price_vnd),
        retry_url: `https://platform.pos.vn/billing/retry`,
      })
    }

    // Log billing event
    await supabase.from('billing.billing_events').insert({
      brand_id: sub.brand_id,
      subscription_id: sub.id,
      event_type: result.success ? 'renewal_success' : 'renewal_failed',
      amount: sub.plan_price_vnd,
      gateway_tx_id: result.transaction_id,
    })
  }
})
```

---

## 50. Feature Gating by Tier

### Feature Gate Implementation

```typescript
// packages/auth/src/feature-gates.ts

export const FEATURE_GATES: Record<string, SubscriptionTier[]> = {
  // Core — tất cả tiers
  'pos.create_order':         ['starter', 'growth', 'enterprise'],
  'pos.cash_payment':         ['starter', 'growth', 'enterprise'],
  'einvoice.basic':           ['starter', 'growth', 'enterprise'],
  'menu.crud':                ['starter', 'growth', 'enterprise'],
  'kds.display':              ['starter', 'growth', 'enterprise'],
  'analytics.daily_report':   ['starter', 'growth', 'enterprise'],

  // Growth+
  'payment.vietqr':           ['growth', 'enterprise'],
  'payment.vnpay_card':       ['growth', 'enterprise'],
  'delivery.grabfood':        ['growth', 'enterprise'],
  'delivery.shopeefood':      ['growth', 'enterprise'],
  'analytics.rfm':            ['growth', 'enterprise'],
  'analytics.food_cost_avt':  ['growth', 'enterprise'],
  'crm.campaigns':            ['growth', 'enterprise'],
  'zalo.zns_notifications':   ['growth', 'enterprise'],
  'branches.max':             4, // growth = 20, starter = 3

  // Enterprise only
  'analytics.bcg_matrix':     ['enterprise'],
  'analytics.ai_forecasting': ['enterprise'],
  'delivery.xanh_sm':         ['enterprise'],
  'einvoice.dedicated':       ['enterprise'],
  'support.dedicated':        ['enterprise'],
}

// Middleware check (Next.js)
export function hasFeature(
  feature: string,
  subscription: Subscription
): boolean {
  const requiredTiers = FEATURE_GATES[feature]
  if (!requiredTiers) return false
  return requiredTiers.includes(subscription.tier)
}
```

### UI Feature Gate Components

```typescript
// apps/admin/components/FeatureGate.tsx
export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { subscription } = useSubscription()

  if (!hasFeature(feature, subscription)) {
    return fallback ?? <UpgradePromptBanner feature={feature} />
  }
  return <>{children}</>
}

// Usage in analytics page:
<FeatureGate feature="analytics.rfm">
  <RfmSegmentChart data={rfmData} />
</FeatureGate>

<FeatureGate
  feature="analytics.bcg_matrix"
  fallback={<EnterpriseBadgeWithCTA text="BCG Matrix — Enterprise only" />}
>
  <BcgMatrixChart data={bcgData} />
</FeatureGate>
```

### Branch Limit Enforcement

```sql
-- RLS policy: enforce branch limit per plan
CREATE POLICY "branch_limit_by_plan" ON core.branches
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT COUNT(*) FROM core.branches WHERE brand_id = auth.jwt()->>'brand_id')
  <
  (SELECT
    CASE subscription_tier
      WHEN 'starter'    THEN 3
      WHEN 'growth'     THEN 20
      WHEN 'enterprise' THEN 9999
    END
   FROM billing.subscriptions
   WHERE brand_id = (auth.jwt()->>'brand_id')::uuid
     AND status IN ('active', 'trial'))
);
```

---

## 51. Billing Schema

```sql
-- billing schema (new module)

CREATE TABLE billing.subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES core.brands(id),
  plan                 TEXT NOT NULL CHECK (plan IN ('starter','growth','enterprise')),
  status               TEXT NOT NULL CHECK (status IN (
                         'trial','trial_expired','active',
                         'past_due','suspended','cancelled','churned'
                       )),
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  next_billing_date    DATE,
  plan_price_vnd       INTEGER,                -- Giá VND mỗi tháng
  payment_method       TEXT,                  -- 'vnpay_token' | 'bank_transfer' | 'enterprise_invoice'
  past_due_since       TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancel_reason        TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing.billing_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL,
  subscription_id  UUID NOT NULL REFERENCES billing.subscriptions(id),
  event_type       TEXT NOT NULL,             -- 'trial_start','upgrade','renewal_success','renewal_failed','refund','cancel'
  amount           INTEGER,                  -- VND
  plan_from        TEXT,
  plan_to          TEXT,
  gateway_tx_id    TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing.invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL,
  subscription_id  UUID NOT NULL,
  invoice_number   TEXT UNIQUE,              -- INV-2026-001234
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,
  amount_vnd       INTEGER,
  tax_vnd          INTEGER,                  -- VAT 10% (platform services)
  total_vnd        INTEGER,
  status           TEXT DEFAULT 'paid',      -- 'draft' | 'paid' | 'void'
  pdf_url          TEXT,                     -- Stored in Supabase Storage
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing.promo_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,
  discount_pct INTEGER,
  discount_vnd INTEGER,
  valid_from   TIMESTAMPTZ,
  valid_until  TIMESTAMPTZ,
  max_uses     INTEGER,
  used_count   INTEGER DEFAULT 0,
  applies_to   TEXT DEFAULT 'all'           -- 'starter' | 'growth' | 'all'
);
```

---

## 52. Billing Edge Functions & Webhooks

### Edge Functions Inventory

| Function | Trigger | Responsibility |
|---|---|---|
| `process-renewal` | pg_cron daily 09:00 | Charge all subscriptions due today |
| `vnpay-billing-webhook` | VNPay POST | Receive payment confirmation, update subscription |
| `handle-trial-expiry` | pg_cron daily 00:00 | Expire trials, send ZNS warnings |
| `apply-grace-period` | pg_cron daily 09:05 | Downgrade past_due after 3 days |
| `generate-invoice` | After successful renewal | Create PDF invoice, store in Supabase Storage |
| `billing-webhook` | Internal | Unified handler cho upgrade/downgrade events |

### Prorate Logic (Upgrade Mid-Cycle)

```typescript
// Khi upgrade từ Starter → Growth vào giữa chu kỳ
function calculateProrate(
  currentPlan: Plan,
  newPlan: Plan,
  daysRemainingInCycle: number,
  totalDaysInCycle: number
): number {
  const dailyCurrentRate = currentPlan.priceVnd / totalDaysInCycle
  const dailyNewRate = newPlan.priceVnd / totalDaysInCycle
  const prorateAmount = (dailyNewRate - dailyCurrentRate) * daysRemainingInCycle
  return Math.round(prorateAmount)
}
// Charge prorate amount immediately via VNPay
// New plan features activate immediately after charge
```

---

## 53. Platform Admin Billing Dashboard

### Screens — Platform Admin (`apps/platform/`)

```
/platform/billing
├── Overview
│   ├── MRR Card                     ← Monthly Recurring Revenue
│   ├── ARR Card                     ← Annual Run Rate
│   ├── ActiveSubscribersCard
│   ├── ChurnRateCard                ← % churn this month
│   ├── TrialConversionCard          ← % trial → paid
│   └── RevenueByPlanChart           ← Starter/Growth/Enterprise breakdown
│
├── /platform/billing/subscriptions
│   ├── SubscriptionTable
│   │   └── Columns: Brand, Plan, Status, MRR, Next billing, Days in trial
│   ├── FilterBar: Status / Plan / Created date
│   └── ExportCsvButton
│
├── /platform/billing/invoices
│   ├── InvoiceTable
│   │   └── Columns: Invoice#, Brand, Amount, Date, Status, PDF
│   └── DownloadSelectedButton
│
└── /platform/billing/at-risk
    ├── PastDueBrandsTable           ← Brands in grace period
    ├── SuspendedBrandsTable
    └── ManualRetryButton            ← Admin trigger retry payment
```

### Key Metrics Query (Materialized View)

```sql
CREATE MATERIALIZED VIEW billing.platform_metrics AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active')                 AS active_subscriptions,
  COUNT(*) FILTER (WHERE status = 'trial')                  AS active_trials,
  COUNT(*) FILTER (WHERE status = 'past_due')               AS past_due_count,
  SUM(plan_price_vnd) FILTER (WHERE status = 'active')      AS mrr_vnd,
  SUM(plan_price_vnd) FILTER (WHERE status = 'active') * 12 AS arr_vnd,
  COUNT(*) FILTER (WHERE
    status = 'active' AND
    current_period_start >= now() - INTERVAL '30 days'
  ) AS new_subscribers_30d,
  COUNT(*) FILTER (WHERE
    status IN ('cancelled','churned') AND
    updated_at >= now() - INTERVAL '30 days'
  ) AS churned_30d
FROM billing.subscriptions;

-- Refresh every hour
SELECT cron.schedule('refresh-billing-metrics', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY billing.platform_metrics');
```

---

# Phụ Lục

## RBAC Role Matrix

| Resource | super_admin | owner | manager | staff | customer |
|---|---|---|---|---|---|
| Brands | Full CRUD | Read own | Read own | — | — |
| Branches | Full CRUD | Full CRUD | Read + Update | Read only | — |
| Orders | Full CRUD | Full CRUD | Full CRUD | Create + Read own | Read own |
| Payments | Full CRUD | Full CRUD | Read + Refund | Read only | Read own |
| Staff / HR | Full CRUD | Full CRUD | Read + Schedule | Read own | — |
| Analytics | All brands | Own brand | Own branch | — | — |
| E-invoices | Full CRUD | Full CRUD | Read + Void | Read only | Read own |
| Brand Settings | Full | Full | — | — | — |
| Branch Settings | Full | Full | Full | — | — |
| Menu | Full CRUD | Full CRUD | Edit | View only | View only |
| Delivery platforms | Full | Full | Toggle on/off | Accept/reject orders | — |
| Subscriptions | Full CRUD | Read own | — | — | — |
| Billing invoices | Full CRUD | Read own | — | — | — |

---

## Schema-per-Module Reference

| Schema | Tables |
|---|---|
| `core` | brands, branches, brand_members, profiles, audit_logs |
| `pos` | pos_terminals, pos_sessions, printers |
| `orders` | orders, order_items, order_status_history, delivery_orders |
| `payments` | payments, refunds, settlement_batches, payment_webhooks |
| `inventory` | ingredients, recipes, recipe_ingredients, stock_levels, stock_movements, stock_transfers, waste_logs, purchase_orders |
| `menu` | menus, menu_items, categories, menu_branch_assignments |
| `crm` | customers, loyalty_tiers, loyalty_transactions, campaigns, campaign_recipients, customer_segments, zalo_followers, zalo_oa_configs, zalo_message_templates, zns_send_log |
| `hr` | staff, shifts, payroll_periods, payroll_entries, payroll_si_breakdown |
| `einvoice` | einvoices, einvoice_configs, einvoice_providers |
| `delivery` | delivery_platforms, platform_menu_mappings, platform_orders |
| `billing` | **NEW** subscriptions, billing_events, invoices, promo_codes |

---

## Definition of Done per Sprint

### Pre-Sprint (Tuần 1–2)
- [ ] CI pipeline xanh — tất cả 8 stages pass
- [ ] Branch protection rules enabled trên `main`
- [ ] `tenant_id → brand_id` migration chạy thành công trên staging
- [ ] `nav-config.ts` tạo xong với TypeScript types đầy đủ
- [ ] ADR-001, ADR-002, ADR-003 đã được viết và acknowledged bởi toàn team

### Sprint 0 (Tuần 3–4)
- [ ] `ScopeContextBar` hiển thị brand/branch name chính xác trên mọi trang
- [ ] URL thay đổi khi user switch brand/branch
- [ ] JWT custom claims hook hoạt động — `brand_id` có trong token
- [ ] RLS test: user brand A không đọc được data brand B
- [ ] Vault provisioned với secret slots cho tất cả providers

### Sprint 1 (Tuần 5–6)
- [ ] Không còn flat route nào — tất cả có `brand_id` prefix
- [ ] Settings tách thành 2 route
- [ ] PayOS QR payment hoạt động end-to-end trong staging
- [ ] Bảng `refunds` và `settlement_batches` có RLS

### Sprint 2 (Tuần 7–8)
- [ ] E-invoice tự động submit sau payment `completed`
- [ ] Schema-per-module migration 0 downtime
- [ ] VAT rate 8% emit đúng trong XML
- [ ] `einvoices.xml_data` với retention 10 năm

### Sprint 3 (Tuần 9–10)
- [ ] GrabFood webhook nhận đơn trong < 5s
- [ ] ShopeeFood webhook với HMAC SHA256
- [ ] Menu sync daily 3AM hoạt động
- [ ] Order source badge đúng trong orders list

### Sprint 4 (Tuần 11–12)
- [ ] ZNS `order_confirm` gửi sau payment completed
- [ ] Flutter app CI green
- [ ] Flutter app submit TestFlight / Play Store internal
- [ ] RFM materialized view refresh hourly không blocking
- [ ] SaaS brand onboarding flow hoạt động end-to-end

---

## Decision Summary

| Decision | Resolution |
|---|---|
| Platform identity | Multi-brand SaaS — comtammatu là platform, brands là tenants |
| Tenant model | Platform > Brand > Chain > Branch (4-level hierarchy) |
| Query strategy | supabase-js primary; Prisma cho migrations only |
| Auth pattern | JWT custom claims: `brand_id + user_role` trong mọi token |
| CI/CD | Fix trước bất kỳ feature work — branch protection enforced |
| Primary payment | PayOS (VietQR, zero fee) + VNPay (cards) trong Phase 0 |
| E-invoicing | Viettel S-Invoice hoặc VNPT — Edge Function pattern, 10yr archive |
| Delivery | Direct GrabFood + ShopeeFood webhooks — không dùng middleware aggregator |
| Customer channel | Zalo OA + ZNS là primary (77M MAU); Flutter app là secondary |
| Analytics | PostgreSQL materialized views + pg_cron — không cần separate analytics service |
| Mobile strategy | Flutter cho Customer + Staff; Next.js PWA cho POS + KDS |
| Flutter flavors | 3 flavors: manager / staff / customer — một codebase, ba binaries |
| Offline scope | POS (cashier_station) offline-first; KDS không cần offline |
| Scope confusion fix | URL là nguồn sự thật duy nhất + `ScopeContextBar` mandatory |
| Nav config | `packages/auth/nav-config.ts` là file duy nhất — xóa 3 duplicates |
| Zalo Mini App | Customer ordering + loyalty trong Zalo ecosystem; Flutter cho full features |
| Billing processor | VNPay recurring (token-based) — không dùng Stripe cho thị trường VN |
| Billing management | In-house trên Supabase — billing schema tách biệt, pg_cron renewal |
| Differentiation | BCG matrix + food cost AvT + RFM — không đối thủ Việt Nam nào có |

---

*Cập nhật lần cuối: March 2026 — Bình*
*Tài liệu này là living document, cập nhật sau mỗi Sprint Retrospective.*
*V4.1: Bổ sung Flutter app component tree (3 flavors), Zalo Mini App architecture đầy đủ, và SaaS billing flow chi tiết với VNPay recurring.*
