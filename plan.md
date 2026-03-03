# Refactoring & Optimization Plan — Com Tấm Mã Tú CRM

> Branch: `claude/analyze-repository-XeHok`
> Date: 2026-03-03
> Scope: Clean code refactoring — no new features, no schema changes

---

## Phase 1: Extract Shared Server Utilities (HIGH — Security & DRY)

### 1.1 Consolidate Auth Context Helpers

**Problem:** `getAdminContext()`, `getAdminProfile()`, `getKdsProfile()`, `getCustomerAuth()` are copy-pasted in 6+ action files with near-identical logic (fetch user → fetch profile → check role → return context).

**Files to create/modify:**
- **Create:** `packages/shared/src/server/admin-helpers.ts`
  - Extract `getAdminContext()` (used by orders, payments)
  - Extract `getAdminProfile()` (used by terminals, kds-stations)
- **Modify:** Remove duplicate implementations from:
  - `apps/web/app/(admin)/admin/orders/actions.ts`
  - `apps/web/app/(admin)/admin/payments/actions.ts`
  - `apps/web/app/(admin)/admin/terminals/actions.ts`
  - `apps/web/app/(admin)/admin/kds-stations/actions.ts`
  - `apps/web/app/(kds)/kds/[stationId]/actions.ts`
  - `apps/web/app/(customer)/customer/actions.ts`
- **Modify:** `packages/shared/src/server/auth-helpers.ts`
  - Extract shared `_getProfile()` internal helper used by both `getAuthenticatedProfile()` and `getActionContext()`

### 1.2 Consolidate Ownership Verification

**Problem:** `verifyTerminalOwnership()` and `verifyStationOwnership()` in terminals/kds-stations are nearly identical.

**Action:**
- Extract generic `verifyEntityOwnership(supabase, table, id, tenantId)` to `packages/shared/src/server/auth-helpers.ts`
- Replace both usages

### 1.3 Extract Common Branch-Fetching Utility

**Problem:** `getBranches` pattern (select id,name from branches where tenant_id = X) repeated in 6+ files.

**Action:**
- Add `getBranchesForTenant(supabase, tenantId)` to `packages/shared/src/server/admin-helpers.ts`
- Replace all inline branch queries

---

## Phase 2: Standardize Error Handling (HIGH — Consistency)

### 2.1 Migrate Raw Actions to `withServerAction()` Wrapper

**Problem:** 4 action files use manual try/catch + raw throws instead of the standard `withServerAction()` pattern.

**Files to modify:**
- `apps/web/app/(admin)/admin/orders/actions.ts` — wrap all functions
- `apps/web/app/(admin)/admin/payments/actions.ts` — wrap all functions
- `apps/web/app/(admin)/admin/terminals/actions.ts` — wrap mutation functions
- `apps/web/app/(admin)/admin/kds-stations/actions.ts` — wrap mutation functions

### 2.2 Fix Error Message Quality

**Problem:** `payments/actions.ts` uses ASCII Vietnamese (missing diacritics).

**Action:** Fix all error strings to proper Vietnamese in `payments/actions.ts`.

### 2.3 Strengthen `withServerAction` Return Type

**Problem:** Return type uses `{ error: string; code: string }` instead of typed `ActionErrorCode`.

**File:** `packages/shared/src/server/with-server-action.ts` line 25
**Action:** Change `code: string` to `code: ActionErrorCode`

---

## Phase 3: Add Missing Zod Validation (HIGH — Data Integrity)

### 3.1 Move Inline Schemas to `@comtammatu/shared`

**Problem:** `menu/actions.ts` defines 3 Zod schemas inline — violates Hard Boundary #12 (ZOD_SCHEMAS).

**Action:**
- **Create:** `packages/shared/src/schemas/menu.ts` with `menuSchema`, `categorySchema`, `menuItemSchema`
- **Modify:** `apps/web/app/(admin)/admin/menu/actions.ts` — import from shared
- **Modify:** `packages/shared/src/index.ts` — add menu schema exports

### 3.2 Add Missing Input Validation

**Problem:** Several Server Actions accept raw IDs without Zod validation.

**Files to fix:**
- `terminals/actions.ts`: `approveTerminal(id)`, `toggleTerminal(id)`, `deleteTerminal(id)`
- `kds-stations/actions.ts`: `toggleKdsStation(id)`, `deleteKdsStation(id)`
- `notifications/actions.ts`: `markNotificationRead(id)`, `markAllRead()`

**Action:** Add `z.number().int().positive()` validation schema for entity ID params.

---

## Phase 4: Split Large Components (MEDIUM — Maintainability)

### 4.1 Split Components Over 500 Lines

| File | Lines | Refactor Into |
|------|-------|---------------|
| `inventory/purchase-orders-tab.tsx` | 733 | `create-po-form.tsx`, `receive-dialog.tsx`, `purchase-orders-tab.tsx` |
| `crm/customers-tab.tsx` | 723 | `customer-form.tsx`, `loyalty-history-dialog.tsx`, `adjust-points-dialog.tsx`, `customers-tab.tsx` |
| `orders/orders-history.tsx` | 618 | `order-filters.tsx`, `order-detail-dialog.tsx`, `orders-history.tsx` |
| `cashier/payment-panel.tsx` | 544 | `cash-payment-section.tsx`, `momo-payment-section.tsx`, `voucher-section.tsx`, `payment-panel.tsx` |
| `menu/[menuId]/menu-detail.tsx` | 526 | `menu-item-form.tsx`, `category-section.tsx`, `menu-detail.tsx` |

### 4.2 Extract Duplicated Interface Definitions

**Problem:** `QueueOrder` interface defined in 3 cashier files.

**Action:**
- **Create:** `apps/web/app/(pos)/pos/cashier/types.ts`
- Move `QueueOrder` and `SelectedOrder` interfaces there
- Update imports in `cashier-client.tsx`, `order-queue.tsx`, `payment-panel.tsx`

### 4.3 Extract Duplicated Status Variant Maps

**Problem:** `statusVariant` maps duplicated across order-queue.tsx and orders-list.tsx.

**Action:** Add to `packages/shared/src/constants.ts` or create `apps/web/lib/ui-constants.ts`.

---

## Phase 5: Clean Up Layout Auth Guards (MEDIUM — DRY)

### 5.1 Consolidate Layout Auth Patterns

**Problem:** POS, KDS, Customer, Admin layouts all have near-identical auth guard logic.

**Action:**
- **Create:** `apps/web/lib/layout-auth.ts` with `requireLayoutAuth(allowedRoles)` helper
- **Modify:** All 4 layout files to use the shared helper
- Keep redirect behavior per-layout (different redirect targets)

---

## Phase 6: Split Large Action Files (MEDIUM — Maintainability)

### 6.1 Split Action Files Over 600 Lines

| File | Lines | Refactor Into |
|------|-------|---------------|
| `(admin)/admin/inventory/actions.ts` | 788 | `ingredients-actions.ts`, `stock-actions.ts`, `purchase-order-actions.ts` |
| `(pos)/pos/orders/actions.ts` | 712 | `order-create-actions.ts`, `order-update-actions.ts` |
| `(pos)/pos/cashier/actions.ts` | 680 | `payment-actions.ts`, `voucher-actions.ts` |
| `(admin)/admin/crm/actions.ts` | 599 | `customer-actions.ts`, `loyalty-actions.ts`, `voucher-actions.ts` |

---

## Phase 7: Add Missing Error Boundaries & Loading States (MEDIUM — UX)

### 7.1 Add Missing `error.tsx` Files

- `apps/web/app/(pos)/pos/order/[orderId]/error.tsx`
- `apps/web/app/(admin)/admin/menu/[menuId]/error.tsx`

### 7.2 Add Missing `loading.tsx` Files

- `apps/web/app/(admin)/admin/orders/loading.tsx`
- `apps/web/app/(pos)/pos/order/[orderId]/loading.tsx`

### 7.3 Standardize Error Boundary UI

**Problem:** Error boundaries differ across route groups (admin has Card + two buttons, POS has single button).

**Action:** Create reusable `apps/web/components/error-fallback.tsx` and use in all error.tsx files.

---

## Phase 8: Fix Vietnamese i18n & Minor Polish (LOW)

### 8.1 Fix ASCII Vietnamese (Missing Diacritics)

- `payments/actions.ts` — "Khong tim thay" → "Không tìm thấy"
- `customer/actions.ts` — "Ban phai dang nhap" → "Bạn phải đăng nhập", "Khach hang khong ton tai" → "Khách hàng không tồn tại"

### 8.2 Remove Hardcoded Fallback Values
- `customer/actions.ts:50` — remove `?? 3` tenant fallback, throw error instead

### 8.3 Schema Consistency
- Standardize `.optional().or(z.literal(""))` pattern across 5 schema files to `.transform(v => v?.trim() || undefined)`

### 8.4 Safe JSON Serialization
- `audit-helpers.ts` — add BigInt handler to `JSON.stringify`

### 8.5 Cache Rate Limiter Config Check
- `packages/security/src/index.ts` — cache `isUpstashConfigured()` result

### 8.6 Reuse Existing `LogoutButton` Component
- `components/pos/bottom-nav.tsx` and `components/admin/nav-user.tsx` duplicate logout form inline instead of using `components/logout-button.tsx`

---

## Execution Order

```
Phase 1 (Auth utilities)         → Commit 1
Phase 2 (Error handling)         → Commit 2
Phase 3 (Zod validation)         → Commit 3
Phase 4 (Component splitting)    → Commit 4
Phase 5 (Layout guards)          → Commit 5
Phase 6 (Action file splitting)  → Commit 6
Phase 7 (Error/loading states)   → Commit 7
Phase 8 (i18n & polish)          → Commit 8
Final: typecheck + lint + build verification
```

## Issue Summary

| # | Issue | Severity | Files Affected | Phase |
|---|-------|----------|----------------|-------|
| 1 | Duplicate auth context helpers (6+ files) | HIGH | 6 action files | 1 |
| 2 | Duplicate ownership verification | HIGH | 2 action files | 1 |
| 3 | Duplicate branch-fetching pattern | MEDIUM | 6+ action files | 1 |
| 4 | Inconsistent error handling (raw vs wrapper) | HIGH | 4 action files | 2 |
| 5 | ASCII Vietnamese in error strings | MEDIUM | 2 action files | 2 |
| 6 | `withServerAction` untyped error code | LOW | 1 file | 2 |
| 7 | Inline Zod schemas (CLAUDE.md violation) | HIGH | 1 action file | 3 |
| 8 | Missing Zod validation on ID params | HIGH | 3 action files | 3 |
| 9 | Components over 500 lines | MEDIUM | 5 components | 4 |
| 10 | Duplicate `QueueOrder` interface (3 files) | MEDIUM | 3 components | 4 |
| 11 | Duplicate status variant maps | LOW | 2 components | 4 |
| 12 | Duplicate layout auth guard logic | MEDIUM | 4 layouts | 5 |
| 13 | Action files over 600 lines | MEDIUM | 4 action files | 6 |
| 14 | Missing error.tsx on dynamic routes | MEDIUM | 2 routes | 7 |
| 15 | Missing loading.tsx on async pages | LOW | 2 routes | 7 |
| 16 | Inconsistent error boundary UI | LOW | 4 error files | 7 |
| 17 | Hardcoded tenant fallback | MEDIUM | 1 file | 8 |
| 18 | Unused LogoutButton component | LOW | 2 components | 8 |

**Total: 18 issues across ~40 files, 8 phases**

## Out of Scope
- No database migrations or schema changes
- No new features or routes
- No dependency upgrades
- No changes to auth flow logic
- No modifications to RLS policies
