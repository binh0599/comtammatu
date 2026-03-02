# Prediction Log

> Before important decisions: write prediction.
> After completion: log Delta (deviation) + Lesson.
> Format: Prediction -> Actual -> Delta -> Lesson

## 2026-03-01: Week 3-4 Implementation Scope
**Prediction:** Full Week 3-4 scope (terminal, POS, orders, KDS, payments, offline) would be completed in one session.
**Actual:** Core flow delivered (waiter → KDS → cashier → cash payment). VNPay/Momo, offline support, receipt printing, rate limiting, and device fingerprinting were deferred.
**Delta:** ~60% of planned scope completed. The deferred items are enhancements, not blockers — the end-to-end order-to-payment flow works with cash.
**Lesson:** Scope estimation for 2-week sprints is optimistic. Prioritize the end-to-end happy path first, then layer enhancements. Cash-only MVP is a valid shipping milestone.

## 2026-03-02: Week 5-6 Implementation Scope
**Prediction:** All 6 modules (shared extensions, dashboard, inventory, suppliers, HR, security) plus navigation update would be delivered. Charts/graphs deferred, stock auto-deduction deferred, payroll deferred.
**Actual:** All 6 modules delivered — 31 files, +7,274 lines. Dashboard with real stats, inventory with 6 tabs (including supplier/PO integration), HR with 5 tabs, security with 2 tabs. Only 1 lint fix needed (Date.now() purity).
**Delta:** ~90% of planned scope completed. Deferred items (auto-deduction trigger, charts, payroll, clock-in mechanism) are enhancements, not blockers. All CRUD operations and workflows function.
**Lesson:** Applying the Week 3-4 lesson (prioritize working MVP, defer enhancements) improved scope completion from ~60% to ~90%. Parallel Task agents for independent modules saved significant time. The shared package → consumers dependency order is the right sequencing.

## 2026-03-02: Week 7-8 Implementation Scope
**Prediction:** Full CRM Admin (4 tabs), Customer PWA (6 pages), and GDPR Privacy (2 API routes) would be delivered in one session. Campaigns, notifications, auto-tier upgrades, retention cron, E2E testing, and documentation deferred.
**Actual:** All 3 modules delivered — 37 files, +4,963 lines. CRM Admin with 20 Server Actions across 4 tabs (customers, loyalty tiers, vouchers, feedback). Customer PWA with 8 Server Actions across 6 pages (home, menu, orders, loyalty, feedback, account). GDPR Privacy with 2 API routes (data export, deletion request). Only 2 lint warnings needed fixing (unused prop, img→Image).
**Delta:** ~95% of planned scope completed. 30 routes total (9 new). Deferred items (campaigns, notifications, auto-tier, retention cron, E2E tests, docs) are enhancements, not blockers. All CRUD operations, customer flows, and privacy endpoints function.
**Lesson:** The 5-phase dependency-ordered approach (shared → admin + PWA parallel → GDPR → middleware) maximized throughput. Running CRM Admin and Customer PWA as parallel Task agents saved significant time since they share schemas but not UI files. Scope estimation improved from ~60% (Week 3-4) → ~90% (Week 5-6) → ~95% (Week 7-8) by progressively applying lessons about deferring enhancements and parallelizing independent modules.
