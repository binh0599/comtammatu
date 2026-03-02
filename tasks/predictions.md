# Prediction Log

> Before important decisions: write prediction.
> After completion: log Delta (deviation) + Lesson.
> Format: Prediction -> Actual -> Delta -> Lesson

## 2026-03-01: Week 3-4 Implementation Scope
**Prediction:** Full Week 3-4 scope (terminal, POS, orders, KDS, payments, offline) would be completed in one session.
**Actual:** Core flow delivered (waiter → KDS → cashier → cash payment). VNPay/Momo, offline support, receipt printing, rate limiting, and device fingerprinting were deferred.
**Delta:** ~60% of planned scope completed. The deferred items are enhancements, not blockers — the end-to-end order-to-payment flow works with cash.
**Lesson:** Scope estimation for 2-week sprints is optimistic. Prioritize the end-to-end happy path first, then layer enhancements. Cash-only MVP is a valid shipping milestone.
