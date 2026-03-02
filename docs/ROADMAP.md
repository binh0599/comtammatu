# F&B CRM System — Development Roadmap

**Version 2.1 — Aligned with Lightweight Architecture v2.1**
February 2026

> This document is the development roadmap extracted from the Architecture spec.
> For technical architecture, database schema, and security details, see `F&B_CRM_Lightweight_Architecture_v2.1.md`.

---

## Table of Contents

1. [Roadmap Overview](#1-roadmap-overview)
2. [Week 1-2: Foundation + Security Baseline](#2-week-1-2-foundation--security-baseline)
3. [Week 3-4: Split POS & Orders](#3-week-3-4-split-pos--orders)
4. [Week 5-6: Operations](#4-week-5-6-operations)
5. [Week 7-8: CRM, Privacy & Polish](#5-week-7-8-crm-privacy--polish)
6. [Post-MVP Enhancements](#6-post-mvp-enhancements)
7. [Migration Path to Enterprise](#7-migration-path-to-enterprise)
8. [Current Progress](#8-current-progress)

---

## 1. Roadmap Overview

Condensed **8-week roadmap** for MVP, followed by iterative improvements.

| Phase      | Duration | Focus                                    |
| ---------- | -------- | ---------------------------------------- |
| Week 1-2   | 2 weeks  | Foundation + Security Baseline           |
| Week 3-4   | 2 weeks  | Split POS & Orders                       |
| Week 5-6   | 2 weeks  | Operations (Inventory, HR, Admin)        |
| Week 7-8   | 2 weeks  | CRM, Privacy & Polish                    |
| Post-MVP   | Ongoing  | Advanced features, integrations, scaling |

**Team:** 2-3 developers
**Time to MVP:** 4-6 weeks (8-week roadmap includes testing & docs)
**Cost target:** $45-120/month

---

## 2. Week 1-2: Foundation + Security Baseline ✅ COMPLETE

### Infrastructure Setup

- [x] GitHub repo with branch protection, CODEOWNERS
- [x] Turborepo + pnpm workspace configuration
- [x] Vercel project linked, auto-deploy configured
- [x] Supabase project linked (project: `zrlriuednoaqrsvnjjyo`)
- [x] Environment variables configured (Vercel + .env.local)

### Database

- [x] Corrected schema (v2.1 → v2.2 DDL) — all ~35 tables
- [x] RLS policies on every table
- [x] Seed data for development
- [ ] RLS validation test suite *(deferred to Week 7-8)*

### Authentication & Security

- [x] Supabase Auth configuration
- [x] RBAC via custom claims + RLS
- [ ] MFA (TOTP) for admin/manager/owner roles *(deferred)*
- [x] Login pages
- [x] Pre-commit hooks (detect-secrets)
- [x] CI pipeline (secrets scan, dependency scan, typecheck, lint, Prisma generate)

### Core UI

- [x] shadcn/ui installation and configuration (24 components)
- [x] App layout (admin, POS, KDS, customer route groups)
- [x] Navigation components (admin sidebar, POS bottom nav)
- [x] Theme setup (dark mode support)

### Menu Management

- [x] CRUD menu items
- [x] Menu categories
- [x] Item modifiers and variants
- [x] Menu assignment to branches

---

## 3. Week 3-4: Split POS & Orders ✅ COMPLETE (Cash-Only MVP)

### Terminal Management

- [x] Device registration with manager approval
- [ ] Device fingerprinting *(deferred — enhancement)*
- [ ] Peripheral config (printers, cash drawers) *(deferred)*
- [x] Terminal type enforcement (`mobile_order` vs `cashier_station`)

### Mobile Order (Waiter — `mobile_order`)

- [x] Mobile-first UI (table grid, menu selector, cart drawer)
- [x] Select table → choose items → modifiers → submit order
- [x] Order tracking (status updates via Realtime)
- [x] Cannot process payments (enforced by role checks)

### Cashier Station (`cashier_station`)

- [x] Cashier screen — view orders by status (60/40 split layout)
- [x] Process payment (cash only — MVP)
- [x] Open/close cash shifts (POS sessions)
- [ ] Print receipt *(deferred)*
- [x] Shift reconciliation (opening vs closing amount + difference tracking)

### Payment Integration

- [x] Cash payment flow (with change calculator, quick amounts)
- [ ] VNPay integration with webhook signature verification *(deferred)*
- [ ] Momo integration with webhook signature verification *(deferred)*
- [x] Idempotency enforcement on all payments (`idempotency_key UUID`)
- [x] Cashier-station-only restriction enforced

### Order Lifecycle

- [x] Order state machine: draft → confirmed → preparing → ready → served → completed
- [x] Status history tracking (DB trigger: `record_order_status_change`)
- [ ] Order discounts and voucher application *(deferred to Week 7-8)*
- [x] Split POS flow (waiter creates, cashier pays)

### KDS (Kitchen Display System)

- [x] Realtime order display (Supabase postgres_changes)
- [x] Per-station routing (by menu category via junction table)
- [x] Bump system (mark items as preparing → ready)
- [x] Timing rules and alerts (warning, critical thresholds with color coding)
- [x] DB triggers: `create_kds_tickets`, `update_order_from_kds`

### POS Offline Support *(DEFERRED)*

- [ ] Service Worker + PWA setup for both terminal types
- [ ] IndexedDB for pending orders (waiter) and pending payments (cashier)
- [ ] AES-256-GCM encryption with PBKDF2 600K iterations
- [ ] Background Sync API for auto-sync when online
- [ ] Cash-only restriction when offline (code enforced)
- [ ] Idempotency key deduplication on server

### API Protection *(DEFERRED)*

- [ ] Upstash Redis rate limiting middleware
- [ ] Rate limits per endpoint category (auth, GET, mutation, webhook, export, customer)

---

## 4. Week 5-6: Operations

### Inventory Management

- [ ] Stock levels per branch with optimistic concurrency (`version` column)
- [ ] Stock movements (in, out, transfer, waste, adjust)
- [ ] Recipes linked to menu items
- [ ] Auto-deduction on order completion
- [ ] Low stock alerts

### Suppliers

- [ ] Supplier management (CRUD)
- [ ] Purchase orders (create, send, receive)
- [ ] Receiving with quantity verification

### HR Basic

- [ ] Employee profiles linked to user accounts
- [ ] Shift scheduling and assignment
- [ ] Attendance records (QR, manual, POS session, terminal login)
- [ ] Leave requests (apply, approve/reject)

### Admin Dashboard

- [ ] Revenue reports (daily, weekly, monthly)
- [ ] Daily summary (orders, payments, top items)
- [ ] Branch comparison

### Security Monitoring

- [ ] Security events dashboard
- [ ] Anomaly detection for terminals (unusual activity)
- [ ] Failed login monitoring and alerting
- [ ] Terminal heartbeat / last-seen tracking

---

## 5. Week 7-8: CRM, Privacy & Polish

### CRM

- [ ] Customer profiles (phone, email, visit history)
- [ ] Loyalty points earn/redeem
- [ ] Loyalty tiers with automatic tier upgrades
- [ ] Customer feedback collection and response

### Vouchers & Promotions

- [ ] Voucher creation (percent, fixed, free item)
- [ ] Branch-scoped vouchers
- [ ] Usage tracking and limits
- [ ] Campaign management (email, SMS, push)

### Customer PWA

- [ ] Menu browsing (public)
- [ ] Order tracking (authenticated)
- [ ] Loyalty balance and history
- [ ] Feedback submission

### Privacy (GDPR)

- [ ] Deletion request flow (30-day grace period)
- [ ] DSAR export (JSON/CSV via `/api/privacy/data-export`)
- [ ] Data retention cron jobs (Supabase Edge Function)
- [ ] Audit log pseudonymization (SHA-256 hashing of PII)

### Testing & Quality

- [ ] E2E tests for critical flows (order, payment, auth)
- [ ] RLS validation test suite in CI
- [ ] Security review (OWASP top 10 checklist)
- [ ] Performance tuning (query optimization, index verification)

### Documentation

- [ ] API docs (OpenAPI/Swagger)
- [ ] User guide for staff
- [ ] Deployment runbook
- [ ] Incident response playbook

---

## 6. Post-MVP Enhancements

These features are planned for iterative development after MVP launch:

- [ ] Payroll module completion (pay calculation, tax, disbursement)
- [ ] Marketing automation (email/SMS campaigns with scheduling)
- [ ] Advanced reports & analytics (trends, forecasting)
- [ ] Multi-branch stock transfer workflow
- [ ] Delivery integration (GrabFood, ShopeeFood)
- [ ] AI features: demand forecasting, menu optimization
- [ ] Argon2id migration for offline encryption (GPU-attack resistance)
- [ ] Annual PCI DSS SAQ A self-assessment
- [ ] Customer app → native wrapper (if needed)
- [ ] Multi-language support (Vietnamese, English)

---

## 7. Migration Path to Enterprise

When scaling beyond 10 branches, extract modules into standalone services:

| Trigger             | Action                                     | Effort    |
| ------------------- | ------------------------------------------ | --------- |
| > 10 branches       | Extract POS module into standalone service | 2-3 weeks |
| > 50 concurrent POS | Migrate to dedicated POS backend (Fastify) | 3-4 weeks |
| > 100K customers    | Extract CRM + Elasticsearch                | 2-3 weeks |
| Complex payroll     | Extract HR/Payroll service                 | 2-3 weeks |
| > 10K orders/day    | Implement CQRS + read replicas             | 3-4 weeks |
| Multi-region        | Migrate to K8s + multi-region Supabase     | 6-8 weeks |

The Modular Monolith architecture is designed for easy module extraction — each domain module has clear boundaries, making it straightforward to split into standalone services when needed.

---

## 8. Current Progress

**Phase: Week 3-4 COMPLETE — Ready for Week 5-6 Operations**

### Completed

- [x] Architecture specification (v2.2) — complete
- [x] Project Operating System — complete
- [x] AI boot file (CLAUDE.md) — complete
- [x] Git repository (6 commits on `main`)
- [x] Monorepo scaffolding (Turborepo + pnpm)
- [x] CI/CD pipeline (GitHub Actions + Prisma generate step)
- [x] Next.js app — 18 routes, 114 source files
- [x] Database — 5 migrations, v2.2 schema + POS/KDS triggers, RLS on all tables
- [x] Auth — login, middleware, role-based routing, RBAC
- [x] Admin — menu CRUD, terminal CRUD, KDS station CRUD
- [x] POS — waiter mobile order, cashier cash payment, session management
- [x] KDS — realtime board with bump system and timing
- [x] Realtime — 4 hooks (orders, tables, KDS tickets, broadcast)
- [x] Shared package — Zod schemas, constants, Vietnamese formatters
- [x] Deployed to Vercel (`comtammatu.vercel.app`)

### Next Steps

- [ ] **Week 5-6:** Inventory management, suppliers, HR basic, admin dashboard, security monitoring
- [ ] **Week 7-8:** CRM + loyalty, vouchers, customer PWA, GDPR, testing, documentation

---

_This roadmap is a living document. Update as development progresses, priorities shift, or new requirements emerge._
