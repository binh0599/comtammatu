# Plan: Admin Orders History Page

## Goal
Create an admin orders history page at `/admin/orders` where admin users can view all orders across branches with filtering by date range, branch, status, order type, and search.

## Files to Create/Modify

### 1. Install shadcn components (popover + calendar)
- Need `popover` and `calendar` for date range picker
- Run: `npx shadcn@latest add popover calendar`

### 2. `packages/shared/src/utils/format.ts` — Add `getOrderTypeLabel()`
- New utility function for Vietnamese order type labels (Tại chỗ, Mang đi, Giao hàng)

### 3. `packages/shared/src/index.ts` — Export `getOrderTypeLabel`

### 4. `apps/web/app/(admin)/admin/orders/actions.ts` — Server actions
- `getAdminContext()` helper (same pattern as payments/actions.ts)
- `getBranches()` — fetch tenant branches
- `getAdminOrders()` — fetch all orders across tenant branches with:
  - Supabase query joining: `orders` → `branches(name)`, `order_items(count)`, `payments(method, status)`
  - Tenant-scoped via branch IDs
  - Limit 500, ordered by created_at desc
  - Select: id, order_number, branch_id, type, status, subtotal, tax, service_charge, discount_total, total, notes, customer_id, created_at, created_by, table_id
  - Joined: branches(id, name), order_items(id, menu_item_id, quantity, unit_price, item_total, status, menu_items(name)), payments(method, status, amount)

### 5. `apps/web/app/(admin)/admin/orders/page.tsx` — Server component (page)
- Pattern: fetch data → render Header + client component
- Fetch: `getAdminOrders()` + `getBranches()`

### 6. `apps/web/app/(admin)/admin/orders/orders-history.tsx` — Client component
- **Filters (client-side using useMemo):**
  - Date range: preset buttons (Hôm nay, Tuần này, Tháng này, Tháng trước) + custom date range via Calendar popover
  - Branch: Select dropdown ("Tất cả chi nhánh" + list)
  - Status: Select dropdown ("Tất cả trạng thái" + ORDER_STATUSES)
  - Order type: Select dropdown ("Tất cả loại" + ORDER_TYPES)
  - Search: Input for order number search
- **Summary stats bar:** total orders count, total revenue (formatPrice)
- **Table columns:** Mã đơn, Chi nhánh, Loại, Trạng thái, Số món, Tổng tiền, Thanh toán, Thời gian
- **Detail dialog:** Click eye icon → Dialog showing full order info (items list, payment info, timestamps)
- **Badge styles:** Color-coded by order status (green=completed, yellow=preparing, blue=confirmed, red=cancelled, etc.)

## Architecture Decisions
- **Client-side filtering** (consistent with payments page pattern) — data fetched server-side, filtered in useMemo
- **No pagination** (consistent with existing pages) — limit 500 orders from server
- **Date filtering is client-side** — compare created_at against selected date range in useMemo
- **Read-only** — no status changes or mutations from admin orders page
- **shadcn Calendar + Popover** for custom date range picker (new components to install)

## Constraints
- SERVER imports from `@comtammatu/database` (barrel) ✓
- CLIENT imports from `@comtammatu/database/src/supabase/client` — N/A (no client Supabase needed, read-only)
- Tenant-scoped queries via branch IDs ✓
- Vietnamese UI labels ✓
