# CLAUDE.md — Cơm tấm Má Tư F&B SaaS Platform

> Boot file. Loaded every session. Keep under 150 lines.
> Deep-dive: `docs/REFERENCE.md` | Templates: `docs/TASK_TEMPLATES.md` | Session rules: `docs/SESSION_PROTOCOL.md`

---

## I. CORE PRINCIPLES

1. **Simplicity First** — Every change as simple as possible. Find root cause, not patches. If it feels hacky → stop and rethink.
2. **Plan Before Build** — Any task ≥3 steps → write Task Contract (Section V) before coding. Off-track → STOP and re-plan.
3. **Verify Before Done** — Never mark complete without proving it works. Run tests, check build, demo correctness.
4. **Learning Compounds** — Every failure → rule in `tasks/regressions.md`. Every lesson → `tasks/lessons.md`. Optimize across sessions.

---

## II. STACK

| Layer     | Choice                                                                   |
| --------- | ------------------------------------------------------------------------ |
| Framework | Next.js 16.1 App Router + React 19.1 + TypeScript 5.9 strict            |
| Database  | Supabase (`zrlriuednoaqrsvnjjyo`) + Prisma 7.5 (migrations only) + supabase-js (queries) |
| Auth      | Supabase Auth + `@supabase/ssr@0.9.0` — cookie-based sessions + JWT custom claims (V4.1) |
| UI        | shadcn/ui (new-york) + Tailwind CSS v4.2 + Lucide React                 |
| Monorepo  | Turborepo 2.8 + pnpm 9.15.0                                             |
| Hosting   | Vercel (`comtammatu.vercel.app`) + GitHub Actions CI                     |
| State     | React Query + Zustand                                                    |
| Mobile    | Flutter 3.x — 3 flavors (manager / staff / customer) + Riverpod         |
| Packages  | `@comtammatu/database`, `@comtammatu/shared`, `@comtammatu/security`, `@comtammatu/ui` |

**Phase:** V4.1 Migration — Multi-brand SaaS. ~300+ source files, 57 pages, `main` branch.
**Master Plan:** `comtammatu_master_plan_v4.1.md` | **V4 Synthesis:** `comtammatu_v4_synthesis.html`

---

## III. HARD BOUNDARIES

> Violation = `git checkout .` + diagnose root cause.

1. **CLIENT_IMPORT** — `"use client"` → import from `@comtammatu/database/src/supabase/client`. Middleware/Edge → `@comtammatu/database/src/supabase`. RSC/Actions → `@comtammatu/database` (barrel).
2. **RLS_EVERYWHERE** — Every new table needs RLS policies. No exceptions.
3. **MONEY_TYPE** — `NUMERIC(14,2)` totals, `NUMERIC(12,2)` prices. Never `FLOAT`.
4. **TIME_TYPE** — `TIMESTAMPTZ` always. Never `TIMESTAMP`.
5. **PK_TYPE** — `BIGINT GENERATED ALWAYS AS IDENTITY`. Never `SERIAL`/`UUID` for internal PKs.
6. **TEXT_TYPE** — `TEXT` always. Never `VARCHAR`.
7. **PAYMENT_TERMINAL** — Only `cashier_station` terminals process payments. Verify server-side.
8. **AUDIT_APPEND_ONLY** — Never `UPDATE`/`DELETE` on `audit_logs` or `security_events`.
9. **NO_CARD_DATA** — Card/payment data never stored in our DB. PCI DSS SAQ A.
10. **VALIDATE_CLIENT_IDS** — Every Server Action must verify branch + brand ownership before use.
11. **REGEN_TYPES** — After migration adding/modifying SQL functions → `supabase gen types typescript`.
12. **ZOD_SCHEMAS** — Every Server Action/API route validates input with Zod from `@comtammatu/shared`.
13. **VIETNAMESE_DIACRITICS** — Toàn bộ text tiếng Việt phải viết có dấu đầy đủ. Tuyệt đối không viết không dấu.

---

## IV. BOOT SEQUENCE

```text
1. Read tasks/regressions.md → any rule that applies?
2. Read tasks/lessons.md → any relevant pattern?
3. Read tasks/friction.md → any unresolved contradictions?
4. Assess complexity → Simple (execute) | Complex (Task Contract → confirm → build)
5. git checkpoint commit BEFORE starting work
6. After task: typecheck + lint + build → commit
```

---

## V. TASK CONTRACT (Use for ≥3 steps)

```
## Task: [name]
Goal: [one sentence — what changes and why]
Adjacent Code:
- path/file.ts — [what it does, how it connects]
Constraints:
- Hard boundaries: [from Section III]
- Do NOT touch: [out of scope files]
- Scope lock: only modify listed files
Output: [e.g., "Server Action + Component + Zod schema"]
Failure: If touching auth/payment/RLS → stop and surface to user
```

---

## VI. V4.1 SCOPE & ROLES

**Hierarchy:** Platform (L0) > Brand (L1, SaaS tenant) > Chain (L2, optional) > Branch (L3)
**URL Pattern:** Brand-scoped: `/b/[brandId]/menu` | Branch-scoped: `/b/[brandId]/br/[branchId]/orders`
**CRM Roles:** `super_admin > owner > manager > cashier > chef > waiter > inventory > hr`
**Customer:** ⛔ BLOCKED from CRM — uses Flutter App + Zalo Mini App only via `/api/mobile/*`
**Order flow:** Waiter → KDS (realtime) → Chef bumps → Cashier pays → completed
**Terminals:** `mobile_order` (waiter) | `cashier_station` (payment only)
**Query Strategy:** supabase-js (PostgREST) primary. Prisma CHỈ cho migrations.

---

## VII. ANTI-PATTERNS

1. Don't build without planning — complex task → Task Contract first
2. Don't silently swallow contradictions → log in `tasks/friction.md`
3. Don't mark done without verifying → prove it works
4. Don't repeat past mistakes → always check `tasks/regressions.md`
5. Don't over-engineer simple fixes — simplicity > cleverness
6. Don't patch the surface → find root cause
7. Don't ask user what you can self-fix → self-investigate → self-fix
8. Don't confuse RAG with learning → rules must live in boot file

---

## VIII. SKILLS & TOOLS

### gstack (Development Workflow)

| Skill                  | Role              | When to use                                       |
| ---------------------- | ----------------- | ------------------------------------------------- |
| `/plan-ceo-review`     | Founder/CEO       | Product-level plan review, 10-star product vision  |
| `/plan-eng-review`     | Engineering Mgr   | Architecture, data flow, edge cases, test plans    |
| `/review`              | Staff Engineer    | Find bugs that pass CI but blow up in production   |
| `/ship`                | Release Engineer  | Sync main, run tests, push changes, open PRs       |
| `/browse`              | QA Engineer       | Headless browser for UI testing, screenshots        |
| `/qa`                  | QA Lead           | Analyze diffs, identify affected pages, auto-test   |
| `/setup-browser-cookies` | Session Manager | Import cookies for authenticated page testing      |
| `/retro`               | Engineering Mgr   | Retrospective with per-contributor metrics          |

**Rule:** Always use `/browse` for web browsing. Never use `mcp__Claude_in_Chrome__*` tools.

### Domain Skills (Invoke before coding)

| Task involves              | Invoke first                                        |
| -------------------------- | --------------------------------------------------- |
| SQL / migration / RLS      | `database-design:postgresql`                        |
| Next.js routes / RSC       | `frontend-mobile-development:nextjs-app-router-patterns` |
| Complex types / Zod        | `javascript-typescript:typescript-advanced-types`   |
| Bug investigation          | `engineering:code-review`                           |
| Architecture decision      | `engineering:system-design`                         |
| Flutter mobile app         | `frontend-mobile-development:react-native-architecture` |
| API design                 | `backend-development:api-design-principles`         |
| Testing strategy           | `engineering:testing-strategy`                      |
| Security audit             | `security-compliance:compliance-check`              |

### Connected Services (MCP)

| Service  | Use case                 |
| -------- | ------------------------ |
| Supabase | Database, Auth, Realtime |
| Vercel   | Deploy & hosting         |
| Figma    | Design files             |

---

## IX. META-LEARNING FILES

| File                    | Purpose                             | When to update                  |
| ----------------------- | ----------------------------------- | ------------------------------- |
| `tasks/regressions.md`  | Named failure rules (1-line each)  | Every serious failure           |
| `tasks/lessons.md`      | Pattern → Rule → Prevention         | Every correction from user      |
| `tasks/friction.md`     | Contradiction log                   | New instruction contradicts old |
| `tasks/predictions.md`  | Prediction → Delta → Lesson         | Before/after important decisions |
| `tasks/todo.md`         | Current task progress               | During work                     |

---

## X. QUALITY GATES (Before Delivery)

- [ ] Does it run? (test / demo)
- [ ] As simple as possible? (no over-engineering)
- [ ] Violates any rule in `tasks/regressions.md`?
- [ ] Would a staff engineer approve?
- [ ] `pnpm typecheck && pnpm lint && pnpm build` pass?

---

_Full reference: `docs/REFERENCE.md` — dependencies, DB conventions, file tree, migration history._
_Session management: `docs/SESSION_PROTOCOL.md` — lifecycle, error recovery, parallel sessions._
