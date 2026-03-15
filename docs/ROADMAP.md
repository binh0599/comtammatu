# Cơm Tấm Má Tư — Development Roadmap

**Version 4.1 — Multi-brand SaaS Platform**
March 2026

> Source of truth: `comtammatu_master_plan_v4.1.md`
> Task tracking: `tasks/todo.md`

---

## Roadmap Overview

| Phase | Duration | Focus | Status |
|---|---|---|---|
| V2 MVP (Week 1–8) | 8 tuần | Single-brand CRM + POS + KDS | **COMPLETE** |
| V2 Post-MVP (Sprint 1–9) | 9 sprints | Payment, offline, campaigns, analytics | **COMPLETE** |
| V2 Refactoring (Wave 1–6) | 6 waves | Code quality, testing, CQRS, accessibility | **COMPLETE** |
| **V4.1 Pre-Sprint** | **2 tuần** | **Fix CI, brand_id migration, nav-config** | **NEXT** |
| V4.1 Sprint 0 | 2 tuần | Scope System (JWT claims, ScopeContextBar) | Planned |
| V4.1 Sprint 1 | 2 tuần | 8 modules scoped + PayOS live | Planned |
| V4.1 Sprint 2 | 2 tuần | E-invoicing + Schema-per-module | Planned |
| V4.1 Sprint 3 | 2 tuần | GrabFood + ShopeeFood live | Planned |
| V4.1 Sprint 4 | 2 tuần | Zalo OA + SaaS billing + Flutter | Planned |

---

## V2 Completed Summary

**Đã hoàn thành tất cả:**
- 57 pages, 20 API routes, 4 role-based UIs
- 87 DB tables, 36 migrations, 8 materialized views
- POS offline, KDS realtime, ESC/POS printing, Web Push
- CRM, Loyalty, Campaigns, Payroll, Inventory + food cost
- 502 unit tests, 13 E2E specs, 8 integration tests
- 6 refactoring waves (code splitting, React Query/Zustand, security, WCAG, CQRS)

---

## V4.1 Migration Roadmap

### 3 Vấn đề ưu tiên cao nhất

| # | Vấn đề | Mức độ | Giải pháp |
|---|---|---|---|
| 1 | CI/CD broken — lint errors, merge không có gate | CRITICAL | Branch protection, fix root cause |
| 2 | Scope confusion — không biết đang quản lý Brand/Branch nào | HIGH | URL as source of truth + ScopeContextBar |
| 3 | Compliance gap — E-invoicing Decree 70/2025 + VietQR | HIGH | PayOS + Viettel S-Invoice Edge Functions |

### Tier 1 — Compliance & Revenue (0–3 tháng)

| # | Feature | Sprint | Tại sao |
|---|---|---|---|
| 1 | PayOS / VietQR | Sprint 1 | Revenue — zero-fee payment |
| 2 | E-invoicing Decree 70/2025 | Sprint 2 | Yêu cầu pháp lý |
| 3 | Refunds + settlement_batches | Sprint 1 | Payment reconciliation |
| 4 | VNPay card aggregator | Sprint 2 | Card payment acceptance |
| 5 | GrabFood webhook | Sprint 3 | 36% delivery volume VN |
| 6 | ShopeeFood webhook | Sprint 3 | 56% delivery volume VN |
| 7 | Zalo OA / ZNS | Sprint 4 | Primary customer channel (77M MAU) |
| 8 | Schema-per-module migration | Sprint 2 | Microservice extraction path |
| 9 | Flutter app TestFlight | Sprint 4 | Customer access gap |
| 10 | SaaS brand onboarding + billing | Sprint 4 | First external SaaS customer |

### Tier 2 — Competitive Parity (3–6 tháng)

- Reservation + waitlist system
- RFM segmentation + Zalo campaigns
- Financial reporting materialized views
- Inter-branch stock transfer
- MoMo + ZaloPay e-wallets
- Payroll SI compliance (Luật BHXH 2024)
- Multi-brand platform dashboard

### Tier 3 — Differentiation (6–24 tháng)

- BCG menu matrix
- AI demand forecasting
- Dynamic pricing (ingredient-cost-driven)
- Staff analytics (SPLH, upsell tracking)
- Zalo Mini App ordering
- VNPAY SmartPOS hardware
- SevenRooms-style guest CRM

---

## Architecture Decisions (V4.1)

| Decision | Resolution |
|---|---|
| Platform identity | Multi-brand SaaS — comtammatu là platform, brands là tenants |
| Tenant model | Platform > Brand > Chain > Branch (4-level) |
| Query strategy | supabase-js primary; Prisma chỉ cho migrations |
| Auth pattern | JWT custom claims: `brand_id + user_role` trong mọi token |
| CI/CD | Fix trước bất kỳ feature — branch protection enforced |
| Payment | PayOS (VietQR, zero fee) + VNPay (cards) trong Phase 0 |
| E-invoicing | Viettel S-Invoice — Edge Function, 10yr archive |
| Delivery | Direct GrabFood + ShopeeFood webhooks |
| Customer channel | Zalo OA + ZNS primary (77M MAU); Flutter secondary |
| Analytics | PostgreSQL materialized views + pg_cron |
| Offline | POS offline-first; KDS không cần offline |
| Scope fix | URL là nguồn sự thật + ScopeContextBar mandatory |
| Nav config | Single file `nav-config.ts` — xóa 3 duplicates |

---

## Migration Path — When Scaling

| Trigger | Action | Effort |
|---|---|---|
| > 500 orders/day | Extract Payment Service | 2–3 tuần |
| > 1000 concurrent users | Extract Auth Service | 2–3 tuần |
| > 50 branches | Extract Orders + KDS Service | 3–4 tuần |
| > 10 brands (SaaS) | Separate DB per brand | 4–6 tuần |

---

_Cập nhật lần cuối: 2026-03-15 — Bình_
