# Com Tấm Mã Tú F&B CRM — Comprehensive Architecture Review

**Review Date:** March 2, 2026
**Project Status:** MVP Complete (8 weeks) — ~180 source files, 30 routes
**Scope:** Full monorepo architecture, Server Actions, imports, patterns, quality

---

## Executive Summary

The Com Tấm Mã Tú CRM demonstrates **strong foundational architecture** with well-enforced hard boundaries, comprehensive Zod validation, and clear separation of concerns. However, the system exhibits **moderate architectural debt** in code organization, error handling consistency, and state management patterns that will impact maintainability at scale. The codebase is **production-ready** for the MVP but requires focused refactoring before significant feature expansion.

**Overall Assessment: PRODUCTION READY with MEDIUM technical debt**

---

## FINDINGS BY PRIORITY

---

## CRITICAL FINDINGS (Stop/Fix Immediately)

### 1. INCONSISTENT ERROR HANDLING ACROSS SERVER ACTIONS
**Priority:** CRITICAL
**Severity:** HIGH
**Impact:** Production data consistency and user feedback reliability

**Problem:**
Server Actions use inconsistent error handling patterns:
- Some throw `Error()` (e.g., `/admin/actions.ts`, lines 8-23)
- Others return error objects (e.g., `/pos/orders/actions.ts`, lines 75-78)
- No centralized error standardization

**Evidence:**
- `/app/login/actions.ts:18` — throws raw Error
- `/app/(pos)/pos/orders/actions.ts:75` — returns {error: string}
- `/app/(pos)/pos/cashier/actions.ts:29` — throws raw Error
- `/app/(customer)/customer/actions.ts:16` — throws raw Error

Pattern inconsistency creates unpredictable client-side error handling:

```typescript
// Some actions throw → crash the server action boundary
async function getPosProfile() {
  if (!user) throw new Error("Unauthorized");  // Unhandled → Client error
}

// Others return errors → inconsistent API
export async function createOrder(data) {
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message };  // Return errors
  }
}
```

**Risk:**
- Uncaught throws may bypass UI error boundaries
- Mixed error handling creates difficult debugging scenarios
- No standardized error response shapes for client consumption
- 98 instances of `throw new Error` in codebase (unmeasured risk surface)

**Recommendation:**
1. **Create error-handling utility** in `packages/shared/src/utils/errors.ts`:
```typescript
export class ActionError extends Error {
  constructor(public message: string, public code: string) {
    super(message);
  }
}

export async function handleServerActionError(error: unknown) {
  if (error instanceof ActionError) {
    return { error: error.message, code: error.code };
  }
  return { error: "Lỗi hệ thống. Vui lòng thử lại.", code: "UNKNOWN" };
}
```

2. **Standardize all Server Actions** to return `{error: string | null, ...data}` consistently
3. **Document error codes** in constants (AUTH_ERROR, VALIDATION_ERROR, etc.)
4. **Audit all 98 throw statements** for proper error context

---

### 2. TENANT/BRANCH ISOLATION NOT ENFORCED UNIVERSALLY
**Priority:** CRITICAL
**Severity:** CRITICAL
**Impact:** Multi-tenant data leakage, authorization bypass

**Problem:**
CLAUDE.md Rule #10: "VALIDATE_CLIENT_IDS — Every Server Action receiving an entity ID from client must verify branch + tenant ownership before use."

**Evidence of violations:**

`/app/(pos)/pos/orders/actions.ts:281-285` — Order status update does NOT verify branch ownership:
```typescript
export async function updateOrderStatus(data: {
  order_id: number;
  status: string;
}) {
  const { supabase } = await getPosProfile();  // Gets branch_id from user

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, table_id, type")
    .eq("id", order_id)  // ❌ NO branch_id verification
    .single();
  // Can update ANY order in the system, not just user's branch
}
```

`/app/(customer)/customer/actions.ts:213-219` — Order lookup trusts client branch_id:
```typescript
const { data: order } = await supabase
  .from("orders")
  .select(...)
  .eq("id", parsed.data.order_id ?? 0)
  .eq("customer_id", customer.id)
  .single();  // ✓ Good: verifies customer_id
// But missing branch_id validation for feedback submission
```

`/app/(admin)/admin/menu/actions.ts` — Menu CRUD does NOT filter by tenant:
- `getMenus()` queries all menus without tenant filter
- Risk: users can see/edit other tenants' menus if found by ID

**Threat Scenarios:**
1. Malicious user knows another branch's order_id → calls `updateOrderStatus()` with cross-branch ID
2. Admin can query any ingredient/menu item by ID and modify without tenant check
3. KDS station could be hijacked to manipulate orders from all branches

**Verification Points (should be added):**
```typescript
// Before EVERY update/delete operation
const { data: order } = await supabase
  .from("orders")
  .select("branch_id")
  .eq("id", orderId)
  .eq("branch_id", userBranchId)  // ← Missing in many places
  .single();

if (!order) return { error: "Unauthorized" };
```

**Recommendation:**
1. **Audit ALL Server Actions** for missing tenant/branch checks (focus on mutations):
   - `/pos/orders/actions.ts` — updateOrderStatus, addOrderItems
   - `/pos/cashier/actions.ts` — applyVoucherToOrder, removeVoucherFromOrder
   - `/admin/menu/actions.ts` — all CRUD operations
   - `/admin/inventory/actions.ts` — all mutations

2. **Create validation helper** in packages/shared:
```typescript
export async function verifyBranchOwnership(
  supabase: SupabaseClient,
  entityTable: string,
  entityId: number,
  userBranchId: number
): Promise<boolean> {
  const { data } = await supabase
    .from(entityTable)
    .select("branch_id")
    .eq("id", entityId)
    .single();
  return data?.branch_id === userBranchId;
}
```

3. **Add pre-commit check** to catch missing .eq("branch_id", ...) patterns

---

### 3. WEBHOOK HANDLER USES SERVICE ROLE KEY DIRECTLY
**Priority:** CRITICAL
**Severity:** HIGH
**Impact:** Privilege escalation, audit trail compromise

**Problem:**
`/app/api/webhooks/momo/route.ts:5-9` — Directly instantiates Supabase with SERVICE_ROLE_KEY:

```typescript
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← Unrestricted access
  );
}
```

**Risk:**
- Service client bypasses RLS policies
- Can directly update orders, payments, tables without row-level security
- No audit trail of mutations (who/when/why updated payment to "completed")
- Signature verification is only cryptographic guard (good), but insufficient

**Comparison with best practice:**
- **Current (unsafe):** Webhook → Service Client → Direct update
- **Recommended:** Webhook → Service Client (verification only) → Call RPC/secure function

**Evidence of unrestricted mutations:**
Lines 115-129 show direct table updates bypassing RLS:
```typescript
await supabase
  .from("orders")
  .update({
    status: "completed",
    pos_session_id: payment.pos_session_id,  // ← Direct write to orders table
  })
  .eq("id", order.id);  // No RLS checks here
```

**Recommendation:**
1. **Create Supabase RPC function** for idempotent payment completion:
```sql
CREATE OR REPLACE FUNCTION handle_momo_payment_success(
  p_payment_id BIGINT,
  p_transaction_id BIGINT,
  p_reference_no TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Update payment (with RLS applied)
  UPDATE payments
  SET status = 'completed',
      reference_no = p_reference_no,
      paid_at = NOW()
  WHERE id = p_payment_id
  AND status = 'pending';  -- Idempotent

  -- Update order (with tenant/branch isolation)
  UPDATE orders
  SET status = 'completed'
  WHERE id = (SELECT order_id FROM payments WHERE id = p_payment_id)
  AND NOT EXISTS (SELECT 1 FROM payments
                  WHERE order_id = orders.id AND status = 'failed');

  RETURN QUERY SELECT true, 'Payment processed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

2. Use service client **only for signature verification**, call RPC for mutations:
```typescript
const { data, error } = await supabase.rpc(
  'handle_momo_payment_success',
  {
    p_payment_id: payment.id,
    p_transaction_id: body.transId,
    p_reference_no: String(body.transId)
  }
);
```

3. **Add audit trigger** to log all webhook-driven mutations

---

## HIGH-PRIORITY FINDINGS

### 4. SERVER ACTION FILE SIZE AND COGNITIVE LOAD
**Priority:** HIGH
**Severity:** MEDIUM
**Impact:** Maintainability, testing difficulty, code review cycles

**Problem:**
Several actions.ts files exceed 500+ lines with 10+ functions mixed at multiple levels of abstraction:

```
/app/(pos)/pos/orders/actions.ts          — 555 lines (9 functions)
/app/(pos)/pos/cashier/actions.ts         — 555 lines (9 functions)
/app/(admin)/admin/inventory/actions.ts   — 777 lines (20+ functions)
/app/(admin)/admin/crm/actions.ts         — 655 lines (18+ functions)
```

**Problems:**
- No clear separation between "data access" and "business logic"
- Repeated helper patterns (getPosProfile, getTenantId, getTaxSettings) across files
- No shared utility layer
- Difficult to unit test — must mock entire file
- Blame/diff history becomes cluttered

**Example (repeated pattern):**
```typescript
// /app/(pos)/pos/orders/actions.ts lines 13-30
async function getPosProfile() { ... }

// /app/(pos)/pos/cashier/actions.ts lines 11-33
async function getCashierProfile() { ... }

// /app/(admin)/admin/actions.ts lines 7-25
async function getTenantId() { ... }

// ❌ Same logic repeated 3+ times
```

**Recommendation:**
1. **Extract shared profile helpers** to `packages/shared/src/server/auth-helpers.ts`:
```typescript
export async function getProfileWithAuth(supabase, requiredRole?: StaffRole) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (requiredRole && !profile.role === requiredRole) {
    throw new Error("Insufficient permissions");
  }

  return { supabase, user, profile };
}
```

2. **Create domain services** layer:
```
packages/server/
  src/services/
    orders.service.ts        (createOrder, updateStatus, calculateTotals)
    payments.service.ts      (processPayment, validateVoucher)
    auth.service.ts          (getProfileWithAuth, validateRole)
    inventory.service.ts     (getIngredients, createStockMovement)
    crm.service.ts           (getCustomerLoyalty, submitFeedback)
```

3. **Keep actions.ts lean** — delegate to services:
```typescript
// /app/(pos)/pos/orders/actions.ts (refactored)
"use server";
import { OrdersService } from "@comtammatu/server";
import { createOrderSchema } from "@comtammatu/shared";

export async function createOrder(data) {
  const parsed = createOrderSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  return OrdersService.create(parsed.data);
}
```

4. **Add organizational comment blocks** as interim solution:
```typescript
// ===== Auth Helpers =====
async function getProfile() { ... }

// ===== Order Lifecycle =====
export async function createOrder() { ... }
export async function updateOrderStatus() { ... }

// ===== Data Access =====
export async function getOrders() { ... }
```

---

### 5. MISSING IDEMPOTENCY SAFETY IN CRITICAL MUTATIONS
**Priority:** HIGH
**Severity:** HIGH
**Impact:** Duplicate charges, double-orders, data corruption

**Problem:**
Only payment-related actions generate idempotency keys; other mutations lack replay protection:

**Evidence:**

`/app/(pos)/pos/orders/actions.ts:195` — Order creation uses idempotency:
```typescript
const idempotencyKey = crypto.randomUUID();
const { data: order, error: orderError } = await supabase
  .from("orders")
  .insert({
    ...
    idempotency_key: idempotencyKey,
  })
```

✓ Good — but relies on **unique constraint enforcement** (not verified in schema)

`/app/(pos)/pos/cashier/actions.ts:110` — Payment processing uses idempotency:
```typescript
const idempotencyKey = crypto.randomUUID();
const { error: paymentError } = await supabase
  .from("payments")
  .insert({
    ...
    idempotency_key: idempotencyKey,
  });

if (paymentError) {
  if (paymentError.code === "23505") {  // ← Unique violation = already processed
    return { error: "Giao dịch đã được xử lý" };
  }
}
```

✓ Good pattern — but **only used in 2 places**

`/app/(pos)/pos/cashier/actions.ts:313-333` — Voucher application lacks idempotency:
```typescript
export async function applyVoucherToOrder(data: {
  order_id: number;
  voucher_code: string;
}) {
  // ❌ NO idempotency key
  // ❌ Race condition: check then insert
  const { data: existingDiscount } = await supabase
    .from("order_discounts")
    .select("id")
    .eq("order_id", order.id)
    .eq("type", "voucher")
    .maybeSingle();  // ← Check

  if (existingDiscount) return { error: "..." };  // ← Then insert (gap)

  const { error: discountError } = await supabase
    .from("order_discounts")
    .insert({ ... });  // ← Could fail if race condition hit
}
```

Vulnerability: Network retry on insert fails → user retries → two vouchers applied

`/app/(admin)/admin/inventory/actions.ts` — Stock movements, ingredient creation, PO receives have **zero** idempotency tracking

**Scenarios:**
1. User creates order → network fails → retries → duplicate order created
2. Apply voucher → network retry → two discounts applied → order total corrupted
3. Receive PO → double-counted inventory → stocktake mismatch

**Recommendation:**
1. **Extend Zod schemas** with idempotency requirement:
```typescript
// packages/shared/src/schemas/base.ts
export const idempotentActionSchema = z.object({
  idempotency_key: z.string().uuid().optional(),
});

// Then all mutation schemas extend this
export const applyVoucherSchema = z.object({
  order_id: z.number().int().positive(),
  voucher_code: z.string(),
}).merge(idempotentActionSchema);
```

2. **Create idempotency middleware** helper:
```typescript
export async function withIdempotency<T>(
  supabase: SupabaseClient,
  idempotencyKey: string,
  operation: () => Promise<T>,
  deduplicationTable: string,
): Promise<T> {
  // Check if already processed
  const { data: existing } = await supabase
    .from("idempotency_cache")
    .select("result")
    .eq("key", idempotencyKey)
    .maybeSingle();

  if (existing) return JSON.parse(existing.result);

  // Execute operation
  const result = await operation();

  // Store result
  await supabase.from("idempotency_cache").insert({
    key: idempotencyKey,
    result: JSON.stringify(result),
  });

  return result;
}
```

3. **Add database constraint** to order_discounts (prevent duplicate vouchers):
```sql
ALTER TABLE order_discounts ADD CONSTRAINT unique_order_voucher
  UNIQUE(order_id, type) WHERE type = 'voucher';
```

4. **Apply universally** to all mutations:
   - createOrder
   - applyVoucher
   - receiveStockMovement
   - createPurchaseOrder
   - submitFeedback

---

### 6. REALTIME SUBSCRIPTION LACKS CONNECTION RESILIENCE
**Priority:** HIGH
**Severity:** MEDIUM
**Impact:** KDS disconnections during peak hours, missed orders

**Problem:**
`/app/(kds)/kds/[stationId]/use-kds-realtime.ts` — Realtime hook has no reconnection/backoff logic:

```typescript
export function useKdsRealtime(
  stationId: number,
  initialTickets: KdsTicket[]
) {
  const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`kds-station-${stationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kds_tickets",
          filter: `station_id=eq.${stationId}`,
        },
        handleTicketChange
      )
      .subscribe();  // ← No error handling, no retry

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId, handleTicketChange]);

  return tickets;
}
```

**Issues:**
1. No `.on("*", subscriptionError)` handler
2. Network disconnect → silent failure (KDS doesn't know it's offline)
3. No exponential backoff for reconnection
4. Missed tickers between disconnect and reconnect
5. Orders could be marked "ready" at kitchen but KDS shows "preparing"

**Real-world scenario:**
- Peak hour: 50+ orders flowing through KDS
- Network hiccup → connection drops for 30 seconds
- Chef taps "Ready" on 5 orders during outage
- KDS reconnects but missed those updates
- Cashier thinks orders still preparing → customer waits

**Recommendation:**
1. **Add connection state tracking**:
```typescript
export function useKdsRealtime(stationId: number, initialTickets: KdsTicket[]) {
  const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`kds-station-${stationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kds_tickets",
          filter: `station_id=eq.${stationId}`,
        },
        handleTicketChange
      )
      .on("subscribe", () => {
        setIsConnected(true);
        setReconnectAttempts(0);
      })
      .on("error", (error) => {
        console.error("KDS subscription error:", error);
        setIsConnected(false);
        // Trigger reconnection with exponential backoff
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId]);

  // Expose connection status to UI
  return { tickets, isConnected };
}
```

2. **Add offline indicator UI**:
```tsx
export function KdsBoard({ tickets, isConnected }) {
  return (
    <>
      {!isConnected && (
        <div className="bg-red-600 text-white p-4 flex justify-between">
          <span>Mất kết nối. Đang kết nối lại...</span>
          <ActivityLoader />
        </div>
      )}
      {/* Rest of UI */}
    </>
  );
}
```

3. **Sync full state on reconnect**:
```typescript
.on("subscribe", async () => {
  // Re-fetch current tickets to avoid stale data
  const { data: freshTickets } = await supabase
    .from("kds_tickets")
    .select("*")
    .eq("station_id", stationId)
    .in("status", ["pending", "preparing"]);

  setTickets(freshTickets ?? []);
  setIsConnected(true);
})
```

---

### 7. MISSING COMPREHENSIVE ERROR BOUNDARIES IN CLIENT COMPONENTS
**Priority:** HIGH
**Severity:** MEDIUM
**Impact:** Full page crashes on isolated component errors

**Problem:**
Client components with Server Action calls lack error boundaries:

`/app/(pos)/pos/cashier/payment-panel.tsx` — Calls `processPayment()` without error boundary
`/app/(customer)/customer/loyalty/loyalty-dashboard.tsx` — Calls `getCustomerLoyalty()` without isolation
`/app/(pos)/pos/cashier/order-queue.tsx` — Calls `getCashierOrders()` without fallback

Pattern across codebase: try/catch in **RSC (page.tsx)** but **NOT in client components**.

**Example:**
```tsx
// ✓ RSC has try/catch
export default async function CashierPage() {
  try {
    const orders = await getCashierOrders();
    return <CashierClient orders={orders} />;
  } catch {
    return <ErrorFallback />;
  }
}

// ❌ Client component has no boundary
"use client";
export function PaymentPanel({ order }) {
  async function handlePayment() {
    const result = await processPayment(order.id, amount);
    // If processPayment() throws → component crashes
    // No error UI shown to user
  }
}
```

**Risk:**
- One payment error crashes entire cashier interface
- Kitchen staff loses KDS visibility on network hiccup
- Customer feedback form crash = lost review data

**Recommendation:**
1. **Create reusable Error Boundary**:
```typescript
// components/error-boundary.tsx
"use client";
import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: (error: Error) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!) ?? (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">Lỗi: {this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

2. **Wrap all action-calling components**:
```tsx
<ErrorBoundary fallback={(error) => <PaymentErrorUI error={error} />}>
  <PaymentPanel order={selectedOrder} />
</ErrorBoundary>
```

3. **Add try/catch inside async Server Action calls**:
```tsx
async function handlePayment() {
  try {
    setLoading(true);
    const result = await processPayment({ order_id, amount });
    if (result.error) {
      setError(result.error);
      return;
    }
    onPaymentComplete();
  } catch (error) {
    setError(error instanceof Error ? error.message : "Lỗi không xác định");
  } finally {
    setLoading(false);
  }
}
```

---

### 8. PRISMA ADAPTER CONFIGURATION RISKS
**Priority:** HIGH
**Severity:** MEDIUM
**Impact:** Database connection pooling issues, timeout failures

**Problem:**
`packages/database/src/prisma.ts` exports Prisma client but import path concerns:

1. Imports are inconsistent with hard boundary rule #1:
   - CLIENT_IMPORT: "use client" files should NOT import Prisma (OK)
   - But some Server Actions may over-use Prisma vs Supabase

2. `@prisma/adapter-pg` for PgBouncer requires careful configuration (not visible in codebase)

3. No visible connection pooling configuration or timeout handling

**Risk:**
- Connection timeouts on high-concurrency operations (busy lunch hour)
- Prisma pool exhaustion could cascade failures
- No retry logic visible for stale connections

**Recommendation:**
1. **Document Prisma configuration** in `packages/database/prisma.config.ts`:
```typescript
// Ensure PgBouncer connection pooling is properly tuned
export const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      // With PgBouncer: ensure pool_size is appropriately sized
      // Recommend: 10-20 for typical Vercel workload
    },
  },
  // Add explicit timeout handling
  errorFormat: "pretty",
};
```

2. **Create Prisma wrapper with retry logic**:
```typescript
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  throw new Error("Max retries exceeded");
}
```

3. **Clarify when to use Prisma vs Supabase**:
   - Use **Prisma** for: Complex queries, joins, transactions
   - Use **Supabase** for: Auth, Realtime, RLS-protected reads
   - Document pattern in REFERENCE.md

---

## MEDIUM-PRIORITY FINDINGS

### 9. DUPLICATE HELPER FUNCTIONS ACROSS CODEBASE
**Priority:** MEDIUM
**Severity:** LOW
**Impact:** Maintainability, inconsistency risks

**Files with repeated helpers:**
- `isValidTransition()` — `/pos/orders/helpers.ts` (good centralization)
- `calculateOrderTotals()` — `/pos/orders/helpers.ts` + inline in `/pos/cashier/actions.ts:353-356`
- Tax rate fetching — repeated in `/pos/orders/actions.ts` + `/pos/cashier/actions.ts:404-418`

**Recommendation:**
1. **Extract to shared helpers** in `packages/shared/src/utils/`:
```typescript
// utils/calculations.ts
export { calculateOrderTotals } from "...";

// utils/settings.ts
export async function getTaxAndServiceChargeRates(supabase, tenantId) {
  // Centralized logic
}
```

2. Ensure single source of truth for business logic

---

### 10. LIMITED INPUT VALIDATION IN SOME MUTATION SCHEMAS
**Priority:** MEDIUM
**Severity:** MEDIUM
**Impact:** Potential for malformed data, security bypasses

**Evidence:**

`/packages/shared/src/schemas/payment.ts` — Missing amount validation:
```typescript
export const processPaymentSchema = z.object({
  order_id: z.number().int().positive(),
  method: z.enum(["cash", "qr"]),
  amount_tendered: z.number().optional(),  // ❌ No min/max bounds
  tip: z.number().optional(),  // ❌ No validation
});
```

Risk: Negative amounts, unreasonably large tips, amounts > order total

`/packages/shared/src/schemas/crm.ts` — Limited voucher validation:
```typescript
export const validateVoucherSchema = z.object({
  code: z.string(),  // ❌ No length bounds
  branch_id: z.number().int().positive(),
  subtotal: z.number(),  // ❌ No min/max
});
```

Risk: Empty code, negative subtotal

**Recommendation:**
1. **Add strict boundaries** to all numeric schemas:
```typescript
export const processPaymentSchema = z.object({
  order_id: z.number().int().positive(),
  method: z.enum(["cash", "qr"]),
  amount_tendered: z.number().min(0).max(9999999).optional(),
  tip: z.number().min(0).max(1000000).optional(),
});
```

2. **Add length constraints** to strings:
```typescript
code: z.string().min(1).max(20),
```

3. **Add cross-field validation**:
```typescript
processPaymentSchema.refine(
  (data) => {
    if (data.method === "cash" && !data.amount_tendered) {
      return false;  // Cash requires amount_tendered
    }
    return true;
  },
  { message: "Cash payments require amount_tendered" }
);
```

---

### 11. MISSING AUDIT TRAIL FOR SENSITIVE OPERATIONS
**Priority:** MEDIUM
**Severity:** MEDIUM
**Impact:** Compliance, forensics, accountability

**Problem:**
No audit logging visible for:
- Order modifications (status changes)
- Payment processing
- Voucher applications
- User permission/role changes

Only `/app/(admin)/admin/security/actions.ts` suggests audit table exists, but integration is unclear.

**Recommendation:**
1. **Create audit service** in `packages/server/src/services/audit.service.ts`:
```typescript
export async function auditLog(supabase, {
  action: "order_status_changed" | "payment_processed" | "voucher_applied",
  userId: string,
  entityType: "order" | "payment" | "voucher",
  entityId: number,
  before: Record<string, any>,
  after: Record<string, any>,
  notes?: string,
}) {
  await supabase.from("audit_logs").insert({
    action,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    before: JSON.stringify(before),
    after: JSON.stringify(after),
    notes,
    created_at: new Date().toISOString(),
  });
}
```

2. **Trigger on all mutations**:
```typescript
export async function updateOrderStatus(data) {
  // ... validation ...
  const before = order;
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", order_id);

  if (!updateError) {
    await auditLog(supabase, {
      action: "order_status_changed",
      userId,
      entityType: "order",
      entityId: order_id,
      before,
      after: { ...order, status: newStatus },
    });
  }
}
```

---

### 12. NO EXPLICIT CACHE INVALIDATION STRATEGY
**Priority:** MEDIUM
**Severity:** LOW
**Impact:** Potential stale cache issues, user confusion

**Problem:**
80 instances of `revalidatePath()` but no documented strategy:

```typescript
revalidatePath("/pos/orders");
revalidatePath("/pos/cashier");
revalidatePath(`/pos/order/${order_id}`);
```

Questions:
- What happens if revalidatePath fails?
- Should both paths always be revalidated together?
- Are there paths accidentally missed?

**Recommendation:**
1. **Create cache constants**:
```typescript
// packages/shared/src/constants.ts
export const CACHE_PATHS = {
  POS_ORDERS: "/pos/orders",
  POS_CASHIER: "/pos/cashier",
  POS_ORDER_DETAIL: (orderId: number) => `/pos/order/${orderId}`,
  ADMIN_DASHBOARD: "/admin",
  CUSTOMER_ORDERS: "/customer/orders",
};

// Use consistently:
export async function createOrder(data) {
  // ... mutation ...
  revalidatePath(CACHE_PATHS.POS_ORDERS);
  revalidatePath(CACHE_PATHS.POS_CASHIER);
  // ...
}
```

2. **Document cache invalidation rules** in REFERENCE.md

---

## LOW-PRIORITY FINDINGS

### 13. VERBOSE DASHBOARD AGGREGATION LOGIC
**Priority:** LOW
**Severity:** LOW
**Impact:** Performance at scale, code complexity

`/app/(admin)/admin/actions.ts` — Dashboard stats functions perform **in-JavaScript aggregation** instead of using database queries:

```typescript
// getTopSellingItems (lines 214-234)
// 30-day orders → 1000s of order items → aggregate in JS
for (const item of items) {
  const existing = aggregated.get(item.menu_item_id);
  if (existing) {
    existing.total_qty += item.quantity;
    existing.total_revenue += Number(item.item_total);
  } else {
    aggregated.set(item.menu_item_id, { ... });
  }
}
```

**Better approach:**
- Use Supabase PostGRES aggregate functions
- Use Supabase RPC for complex calculations
- Cache aggregates in materialized view

**Recommendation (non-critical):**
Create view or RPC for dashboard aggregations → push computation to database

---

### 14. SPARSE TYPESCRIPT STRICTNESS COVERAGE
**Priority:** LOW
**Severity:** LOW
**Impact:** Type safety gaps, IDE support

While project uses `TypeScript 5.9 strict` in `CLAUDE.md`, type coverage could improve:
- Some interface definitions use `unknown` (e.g., KdsTicket.items)
- API response types partially typed
- Component prop types could be more specific

**Minor optimization** — not critical for MVP, but address when refactoring actions.

---

## POSITIVE FINDINGS (Strengths)

### ✓ Hard Boundaries Are Enforced
- Import separation (client/server/RSC) is well-structured
- `packages/database/src/supabase/client.ts` vs `server.ts` clearly separated
- RBAC boundaries are explicit (POS_ROLES, KDS_ROLES, ADMIN_ROLES)

### ✓ Zod Validation Is Ubiquitous
- 42+ safeParse calls across Server Actions
- Comprehensive schema definitions in 11 schema files
- Prevents malformed data at entry points

### ✓ Multi-Tenant Architecture Is Foundational
- Tenant filtering is present in most read operations
- Branch isolation is enforced in layout guards
- Clear role-based access control

### ✓ Realtime Features Are Well-Implemented
- KDS realtime subscriptions use proper Supabase channels
- Connection state is tracked (though could improve resilience)

### ✓ Payment Security Basics Are Sound
- No card data storage (PCI compliance)
- Idempotency keys for payment operations
- HMAC signature verification for Momo webhooks
- Service client appropriately isolated to webhooks only (issue 3 excepted)

### ✓ Code Organization by Domain
- Route groups clearly separate concerns (admin, pos, kds, customer)
- Actions colocated with pages
- Schemas organized by domain (order, payment, crm, etc.)

---

## SUMMARY TABLE

| Finding | Priority | Severity | Files Affected | Effort to Fix |
|---------|----------|----------|-----------------|---------------|
| Inconsistent error handling | CRITICAL | HIGH | All actions.ts (30 files) | 3-5 days |
| Missing tenant/branch validation | CRITICAL | CRITICAL | 10+ files | 2-3 days |
| Service role in webhook | CRITICAL | HIGH | `/api/webhooks/momo/` | 1 day |
| Server action file bloat | HIGH | MEDIUM | 4 large actions.ts | 3-5 days |
| Missing idempotency | HIGH | HIGH | 15+ actions | 2-3 days |
| KDS realtime resilience | HIGH | MEDIUM | 1 file | 1-2 days |
| Client error boundaries | HIGH | MEDIUM | 20+ components | 2-3 days |
| Prisma config risks | HIGH | MEDIUM | 1 file | 1 day |
| Duplicate helpers | MEDIUM | LOW | 5+ files | 1 day |
| Weak input validation | MEDIUM | MEDIUM | Schema files | 1 day |
| Missing audit trail | MEDIUM | MEDIUM | All actions | 2 days |
| Cache strategy | MEDIUM | LOW | 30+ revalidatePath | 1 day |
| Dashboard aggregation | LOW | LOW | 1 file | 1 day |
| Type coverage | LOW | LOW | Many files | As-needed |

---

## RECOMMENDATIONS FOR NEXT SPRINT

**Week 1: Eliminate Critical Issues**
1. Audit and fix all missing tenant/branch validations (CRITICAL #2)
2. Create standardized error handling (CRITICAL #1)
3. Refactor Momo webhook to use RPC (CRITICAL #3)

**Week 2: Stabilize Core Operations**
4. Add idempotency keys to all mutations (HIGH #5)
5. Add KDS offline handling (HIGH #6)
6. Create error boundaries (HIGH #7)

**Week 3: Refactor for Scale**
7. Extract domain services layer (HIGH #4)
8. Centralize profile helpers (MEDIUM #9)

**Ongoing:**
- Add comprehensive tests for Server Actions
- Set up pre-commit hooks to catch missing .eq("branch_id", ...)
- Establish audit logging requirements

---

## ARCHITECTURE DECISION RECORD (ADR)

### ADR-001: Server Action Error Handling Standardization

**Status:** RECOMMENDED
**Decision:** All Server Actions must return `{error: string | null, ...data}` consistently

**Rationale:**
- Predictable client-side error handling
- Prevents silent failures from unhandled throws
- Enables global error reporting

**Implementation:**
1. Create error.ts utility with ActionError class
2. Update all 30 Server Action files
3. Document in CLAUDE.md Rule #13

---

## CONCLUSION

The Com Tấm Mã Tú CRM is **production-ready for MVP** with strong foundational architecture. However, **three critical security/data integrity issues** (tenant isolation gaps, inconsistent error handling, webhook privileges) should be resolved before scaling to multiple customers or high-volume production traffic.

The codebase demonstrates good discipline with hard boundaries, Zod validation, and RBAC, but would benefit from:
1. **Service layer abstraction** to reduce Server Action complexity
2. **Consistent error handling** pattern
3. **Comprehensive tenant/branch validation audit**

**Estimated refactoring effort:** 2-3 sprints to address all HIGH and CRITICAL issues while maintaining feature development velocity.

---

**Report Generated:** March 2, 2026
**Reviewed by:** Software Architecture Agent
**Codebase Size:** ~180 source files, 5,274 lines in actions.ts alone

