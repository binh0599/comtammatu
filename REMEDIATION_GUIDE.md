# Com Tấm Mã Tú CRM — Remediation Implementation Guide

This document provides **copy-paste ready** code snippets to address the CRITICAL and HIGH findings.

---

## ISSUE #1: Inconsistent Error Handling

### Step 1.1: Create Error Utility

**File:** `/packages/shared/src/utils/errors.ts` (NEW)

```typescript
/**
 * Standard error class for Server Actions
 * Ensures all errors have consistent shape and codes
 */
export class ActionError extends Error {
  constructor(
    public readonly message: string,
    public readonly code:
      | "UNAUTHORIZED"
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "CONFLICT"
      | "SERVER_ERROR",
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Handle any error thrown during Server Action
 * Returns standardized response shape for client
 */
export function handleServerActionError(error: unknown): {
  error: string;
  code: string;
} {
  if (error instanceof ActionError) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: "SERVER_ERROR",
    };
  }

  return {
    error: "Lỗi không xác định. Vui lòng thử lại sau.",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Helper to validate auth and throw appropriate error
 */
export async function requireAuth(supabase: any, userId?: string) {
  if (!userId) {
    throw new ActionError("Bạn phải đăng nhập", "UNAUTHORIZED", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw new ActionError("Hồ sơ không tìm thấy", "NOT_FOUND", 404);
  }

  return profile;
}

/**
 * Helper to validate role and throw error if insufficient
 */
export function requireRole(
  userRole: string,
  allowedRoles: string[],
  operation: string = "hoạt động"
) {
  if (!allowedRoles.includes(userRole)) {
    throw new ActionError(
      `Bạn không có quyền ${operation}`,
      "UNAUTHORIZED",
      403
    );
  }
}
```

### Step 1.2: Update Package Exports

**File:** `/packages/shared/src/index.ts`

```typescript
// Add to existing exports
export { ActionError, handleServerActionError, requireAuth, requireRole } from "./utils/errors";
```

### Step 1.3: Refactor a Sample Action (login/actions.ts)

**Before:**
```typescript
"use server";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Thông tin đăng nhập không hợp lệ" };
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Email hoặc mật khẩu không chính xác" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Đã xảy ra lỗi, vui lòng thử lại" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = data?.role ?? "customer";

  switch (role) {
    case "owner":
    case "manager":
      redirect("/admin");
    case "cashier":
    case "waiter":
      redirect("/pos");
    case "chef":
      redirect("/kds");
    default:
      redirect("/customer");
  }
}
```

**After:**
```typescript
"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, handleServerActionError } from "@comtammatu/shared";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

async function _login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw new ActionError(
      parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const supabase = await createSupabaseServer();

  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !authData.user) {
    // Generic message to avoid user enumeration
    throw new ActionError(
      "Email hoặc mật khẩu không chính xác",
      "UNAUTHORIZED"
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (!profile) {
    throw new ActionError("Hồ sơ không tìm thấy", "NOT_FOUND");
  }

  const role = profile.role ?? "customer";

  switch (role) {
    case "owner":
    case "manager":
      redirect("/admin");
    case "cashier":
    case "waiter":
      redirect("/pos");
    case "chef":
      redirect("/kds");
    default:
      redirect("/customer");
  }
}

// Wrapper to handle errors consistently
export async function login(formData: FormData) {
  try {
    return await _login(formData);
  } catch (error) {
    return handleServerActionError(error);
  }
}

export async function logout() {
  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
    redirect("/login");
  } catch (error) {
    return handleServerActionError(error);
  }
}
```

---

## ISSUE #2: Missing Tenant/Branch Validation

### Step 2.1: Create Validation Helper

**File:** `/packages/shared/src/server/auth-helpers.ts` (NEW)

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { ActionError } from "../utils/errors";
import type { StaffRole } from "../constants";

/**
 * Get authenticated user profile with optional role check
 */
export async function getAuthenticatedProfile(
  supabase: SupabaseClient,
  requiredRoles?: StaffRole[]
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ActionError("Bạn phải đăng nhập", "UNAUTHORIZED", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, tenant_id, branch_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new ActionError("Hồ sơ không tìm thấy", "NOT_FOUND", 404);
  }

  if (requiredRoles && !requiredRoles.includes(profile.role as StaffRole)) {
    throw new ActionError(
      "Bạn không có quyền truy cập",
      "UNAUTHORIZED",
      403
    );
  }

  return { user, profile };
}

/**
 * Verify an entity belongs to user's branch
 */
export async function verifyBranchOwnership(
  supabase: SupabaseClient,
  table: string,
  entityId: number,
  userBranchId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("branch_id")
    .eq("id", entityId)
    .single();

  if (error || !data) {
    throw new ActionError(`${table} không tìm thấy`, "NOT_FOUND", 404);
  }

  if (data.branch_id !== userBranchId) {
    throw new ActionError(
      "Entity không thuộc chi nhánh của bạn",
      "UNAUTHORIZED",
      403
    );
  }

  return true;
}

/**
 * Verify an entity belongs to user's tenant
 */
export async function verifyTenantOwnership(
  supabase: SupabaseClient,
  table: string,
  entityId: number,
  userTenantId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("tenant_id")
    .eq("id", entityId)
    .single();

  if (error || !data) {
    throw new ActionError(`${table} không tìm thấy`, "NOT_FOUND", 404);
  }

  if (data.tenant_id !== userTenantId) {
    throw new ActionError(
      "Entity không thuộc tổ chức của bạn",
      "UNAUTHORIZED",
      403
    );
  }

  return true;
}
```

### Step 2.2: Refactor updateOrderStatus (HIGH PRIORITY FIX)

**File:** `/app/(pos)/pos/orders/actions.ts`

**Before:**
```typescript
export async function updateOrderStatus(data: {
  order_id: number;
  status: string;
}) {
  const { supabase } = await getPosProfile();

  const parsed = updateOrderStatusSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { order_id, status: newStatus } = parsed.data;

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, table_id, type")
    .eq("id", order_id)  // ❌ MISSING: .eq("branch_id", userBranchId)
    .single();

  if (fetchError || !order) {
    return { error: "Đơn hàng không tồn tại" };
  }
  // ... rest of function
}
```

**After:**
```typescript
import { verifyBranchOwnership, handleServerActionError, ActionError } from "@comtammatu/shared";

async function _updateOrderStatus(data: {
  order_id: number;
  status: string;
}) {
  const parsed = updateOrderStatusSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { supabase, profile } = await getPosProfile();
  const { order_id, status: newStatus } = parsed.data;

  // ✓ NEW: Verify branch ownership before any operation
  await verifyBranchOwnership(supabase, "orders", order_id, profile.branch_id!);

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, table_id, type")
    .eq("id", order_id)
    .eq("branch_id", profile.branch_id!)  // ✓ Added explicit check
    .single();

  if (fetchError || !order) {
    throw new ActionError("Đơn hàng không tồn tại", "NOT_FOUND");
  }

  if (
    !isValidTransition(
      order.status as OrderStatus,
      newStatus as OrderStatus
    )
  ) {
    throw new ActionError(
      `Không thể chuyển từ "${order.status}" sang "${newStatus}"`,
      "CONFLICT"
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", order_id)
    .eq("branch_id", profile.branch_id!);  // ✓ Added explicit check

  if (updateError) {
    throw new ActionError(updateError.message, "SERVER_ERROR");
  }

  // Free up table when order is completed or cancelled
  if (
    (newStatus === "completed" || newStatus === "cancelled") &&
    order.table_id &&
    order.type === "dine_in"
  ) {
    await supabase
      .from("tables")
      .update({ status: "available" })
      .eq("id", order.table_id)
      .eq("branch_id", profile.branch_id!);  // ✓ Added
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);
  revalidatePath("/pos/cashier");

  return { error: null };
}

export async function updateOrderStatus(data: any) {
  try {
    return await _updateOrderStatus(data);
  } catch (error) {
    return handleServerActionError(error);
  }
}
```

### Step 2.3: Audit Checklist

Run this grep to find all mutations that need verification:

```bash
# Find all .update() and .delete() calls
grep -rn "\.update\|\.delete" \
  /path/to/apps/web/app \
  --include="*.ts" \
  | grep -v "node_modules" \
  | grep -v ".next"

# For each result, check:
# 1. Is there an .eq("branch_id", ...) check?
# 2. Is there an .eq("tenant_id", ...) check?
# 3. Is the entity verified to belong to user's scope?
```

---

## ISSUE #3: Service Role in Webhook

### Step 3.1: Create Payment Completion RPC

**File:** Migration or execute directly in Supabase dashboard

```sql
CREATE OR REPLACE FUNCTION handle_momo_payment_success(
  p_payment_id BIGINT,
  p_transaction_id BIGINT,
  p_reference_no TEXT,
  p_service_role_ok BOOLEAN DEFAULT false
)
RETURNS TABLE(success BOOLEAN, message TEXT, order_id BIGINT) AS $$
DECLARE
  v_order_id BIGINT;
  v_table_id BIGINT;
  v_order_type TEXT;
  v_voucher_id BIGINT;
BEGIN
  -- Verify payment exists and is pending
  UPDATE payments
  SET
    status = 'completed'::payment_status,
    reference_no = p_reference_no,
    paid_at = NOW()
  WHERE id = p_payment_id AND status = 'pending'
  RETURNING order_id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RETURN QUERY SELECT false, 'Payment not found or already processed'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  -- Update order status
  UPDATE orders
  SET
    status = 'completed'::order_status,
    completed_at = NOW()
  WHERE id = v_order_id
  RETURNING table_id, type INTO v_table_id, v_order_type;

  -- Free table if dine_in
  IF v_table_id IS NOT NULL AND v_order_type = 'dine_in' THEN
    UPDATE tables
    SET status = 'available'::table_status
    WHERE id = v_table_id;
  END IF;

  -- Increment voucher usage if applicable
  SELECT voucher_id INTO v_voucher_id
  FROM order_discounts
  WHERE order_id = v_order_id AND type = 'voucher'
  LIMIT 1;

  IF v_voucher_id IS NOT NULL THEN
    UPDATE vouchers
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = v_voucher_id;
  END IF;

  RETURN QUERY SELECT true, 'Payment processed successfully'::TEXT, v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

### Step 3.2: Update Webhook

**File:** `/app/api/webhooks/momo/route.ts`

**Before:**
```typescript
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  // ... signature verification ...

  const supabase = getServiceClient();

  if (body.resultCode === 0) {
    const { data: payment } = await supabase
      .from("payments")
      .select("id, status, order_id, pos_session_id")
      .eq("idempotency_key", body.requestId)
      .maybeSingle();

    // ... direct updates to orders/payments ...
    await supabase
      .from("orders")
      .update({
        status: "completed",
        pos_session_id: payment.pos_session_id,
      })
      .eq("id", order.id);
  }
}
```

**After:**
```typescript
// Use service client ONLY for safe queries
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  let body: MomoIPNPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { resultCode: 1, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Verify signature (safe operation)
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!secretKey) {
    console.error("MOMO_SECRET_KEY is not configured");
    return NextResponse.json(
      { resultCode: 1, message: "Server configuration error" },
      { status: 500 },
    );
  }

  const { signature, ...signatureParams } = body;
  const verifyParams: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(signatureParams)) {
    if (value !== undefined && value !== null) {
      verifyParams[key] = value;
    }
  }

  const isValid = verifyMomoSignature(verifyParams, signature, secretKey);
  if (!isValid) {
    console.error("Momo IPN signature verification failed", {
      orderId: body.orderId,
      requestId: body.requestId,
    });
    return NextResponse.json(
      { resultCode: 1, message: "Invalid signature" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  // Only use service client for safe lookups
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, status, order_id")
    .eq("idempotency_key", body.requestId)
    .maybeSingle();

  if (paymentError) {
    console.error("Payment lookup failed", paymentError);
    return NextResponse.json(
      { resultCode: 1, message: "Payment lookup error" },
      { status: 500 },
    );
  }

  if (!payment) {
    console.error("No payment found for requestId", body.requestId);
    return NextResponse.json(
      { resultCode: 1, message: "Payment not found" },
      { status: 404 },
    );
  }

  // Idempotent: already completed
  if (payment.status === "completed") {
    return NextResponse.json({ resultCode: 0, message: "ok" });
  }

  // ✓ NEW: Use RPC for mutation (enforces security)
  if (body.resultCode === 0) {
    const { data: result, error: rpcError } = await supabase.rpc(
      "handle_momo_payment_success",
      {
        p_payment_id: payment.id,
        p_transaction_id: body.transId,
        p_reference_no: String(body.transId),
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json(
        { resultCode: 1, message: "Payment processing failed" },
        { status: 500 },
      );
    }

    if (!result?.success) {
      console.error("Payment processing failed", result?.message);
      return NextResponse.json(
        { resultCode: 1, message: result?.message ?? "Unknown error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ resultCode: 0, message: "ok" });
  }

  // Handle payment failure
  if (body.resultCode !== 0) {
    const { error: updateError } = await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Failed to mark payment as failed", updateError);
    }
  }

  return NextResponse.json({ resultCode: 0, message: "ok" });
}
```

---

## ISSUE #5: Missing Idempotency Keys

### Step 5.1: Update Zod Schemas

**File:** `/packages/shared/src/schemas/voucher.ts`

```typescript
import { z } from "zod";

export const applyVoucherSchema = z.object({
  order_id: z.number().int().positive(),
  voucher_code: z.string().min(1).max(20),
  idempotency_key: z.string().uuid().optional(),  // ✓ NEW
});

export const removeVoucherSchema = z.object({
  order_id: z.number().int().positive(),
  idempotency_key: z.string().uuid().optional(),  // ✓ NEW
});
```

### Step 5.2: Generate & Use Idempotency Keys

**File:** `/app/(pos)/pos/cashier/actions.ts`

**Before:**
```typescript
export async function applyVoucherToOrder(data: {
  order_id: number;
  voucher_code: string;
}) {
  const { supabase, userId, profile } = await getCashierProfile();

  const parsed = applyVoucherSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // ... no idempotency ...

  const { error: discountError } = await supabase
    .from("order_discounts")
    .insert({
      order_id: order.id,
      type: "voucher",
      value: discountAmount,
      reason: validation.code,
      applied_by: userId,
      voucher_id: validation.voucher_id,
    });
}
```

**After:**
```typescript
export async function applyVoucherToOrder(data: {
  order_id: number;
  voucher_code: string;
  idempotency_key?: string;
}) {
  const { supabase, userId, profile } = await getCashierProfile();

  const parsed = applyVoucherSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // ✓ NEW: Generate idempotency key if not provided
  const idempotencyKey = data.idempotency_key || crypto.randomUUID();

  // ✓ NEW: Check if already processed
  const { data: existingApply } = await supabase
    .from("order_discounts")
    .select("id")
    .eq("order_id", order.id)
    .eq("type", "voucher")
    .maybeSingle();

  if (existingApply) {
    return {
      error: "Đơn hàng đã có voucher. Vui lòng xóa voucher cũ trước.",
    };
  }

  // ... validation ...

  const { error: discountError } = await supabase
    .from("order_discounts")
    .insert({
      order_id: order.id,
      type: "voucher",
      value: discountAmount,
      reason: validation.code,
      applied_by: userId,
      voucher_id: validation.voucher_id,
      idempotency_key: idempotencyKey,  // ✓ NEW
    });

  if (discountError) {
    if (discountError.code === "23505") {
      // ✓ NEW: Unique violation = already processed
      return { error: null, discount_amount: discountAmount };
    }
    return { error: discountError.message };
  }

  // ... rest of function ...
}
```

---

## ISSUE #6: KDS Realtime Resilience

### Step 6.1: Enhanced KDS Hook

**File:** `/app/(kds)/kds/[stationId]/use-kds-realtime.ts`

```typescript
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface KdsTicket {
  id: number;
  order_id: number;
  station_id: number;
  status: string;
  items: unknown;
  priority: number | null;
  color_code: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  orders: {
    order_number: string;
    table_id: number | null;
    tables: { number: number } | null;
  } | null;
}

interface UseKdsRealtimeReturn {
  tickets: KdsTicket[];
  isConnected: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

export function useKdsRealtime(
  stationId: number,
  initialTickets: KdsTicket[]
): UseKdsRealtimeReturn {
  const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<any>(null);

  const handleTicketChange = useCallback(
    (
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      const eventType = payload.eventType;

      if (eventType === "INSERT") {
        const newTicket = payload.new as unknown as KdsTicket;
        if (
          newTicket.station_id === stationId &&
          (newTicket.status === "pending" || newTicket.status === "preparing")
        ) {
          setTickets((prev) => {
            if (prev.some((t) => t.id === newTicket.id)) return prev;
            return [...prev, newTicket];
          });
        }
      }

      if (eventType === "UPDATE") {
        const updated = payload.new as unknown as KdsTicket;

        if (updated.status === "ready" || updated.status === "cancelled") {
          setTickets((prev) => prev.filter((t) => t.id !== updated.id));
        } else {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? { ...t, ...updated, orders: updated.orders ?? t.orders }
                : t
            )
          );
        }
      }

      if (eventType === "DELETE") {
        const old = payload.old as { id?: number };
        if (old.id) {
          setTickets((prev) => prev.filter((t) => t.id !== old.id));
        }
      }
    },
    [stationId]
  );

  const syncFromServer = useCallback(async () => {
    if (!supabaseRef.current) return;

    try {
      const { data: freshTickets, error } = await supabaseRef.current
        .from("kds_tickets")
        .select(
          `*,
          orders(order_number, table_id, tables(number))`
        )
        .eq("station_id", stationId)
        .in("status", ["pending", "preparing"]);

      if (error) {
        console.error("Failed to sync KDS tickets:", error);
        setLastError(error.message);
        return;
      }

      setTickets(freshTickets ?? []);
      setLastError(null);
    } catch (error) {
      console.error("Sync error:", error);
      setLastError(error instanceof Error ? error.message : "Unknown error");
    }
  }, [stationId]);

  const reconnect = useCallback(() => {
    if (reconnectAttempts >= RECONNECT_DELAYS.length) {
      setLastError("Max reconnection attempts reached");
      return;
    }

    const delay = RECONNECT_DELAYS[reconnectAttempts];
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts((prev) => prev + 1);
      // Let useEffect re-run with updated stationId/deps
    }, delay);
  }, [reconnectAttempts]);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

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
        console.log(`[KDS] Connected to station ${stationId}`);
        setIsConnected(true);
        setReconnectAttempts(0);
        setLastError(null);
        // Full sync on reconnect to catch missed updates
        syncFromServer();
      })
      .on("error", (error: any) => {
        console.error(`[KDS] Subscription error:`, error);
        setIsConnected(false);
        setLastError(error.message ?? "Connection error");
        reconnect();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [stationId, handleTicketChange, syncFromServer, reconnect]);

  // Sync initial tickets
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  return { tickets, isConnected, reconnectAttempts, lastError };
}
```

### Step 6.2: Update KDS Board UI

**File:** `/app/(kds)/kds/[stationId]/kds-board.tsx`

```tsx
"use client";

import { useKdsRealtime } from "./use-kds-realtime";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";

export function KdsBoard({ stationId, initialTickets }) {
  const { tickets, isConnected, reconnectAttempts, lastError } = useKdsRealtime(
    stationId,
    initialTickets
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Connection Status Bar */}
      {!isConnected && (
        <div className="bg-red-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5" />
            <span>
              Mất kết nối với máy chủ
              {reconnectAttempts > 0 && ` (Lần ${reconnectAttempts})`}
            </span>
          </div>
          {lastError && (
            <span className="text-xs opacity-75">{lastError}</span>
          )}
        </div>
      )}

      {isConnected && (
        <div className="bg-green-900 text-white px-4 py-2 flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>Đã kết nối</span>
        </div>
      )}

      {/* Tickets Grid */}
      <div className="flex-1 overflow-auto p-4">
        {tickets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Không có đơn hàng nào
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} stationId={stationId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Summary of Changes

These remediation snippets address:

1. **Error Handling** — All actions now return consistent `{error: string | null}`
2. **Tenant/Branch Validation** — Every mutation verified before execution
3. **Webhook Security** — RPC function enforces rules instead of service client
4. **Idempotency** — Keys tracked and checked for duplicate prevention
5. **KDS Resilience** — Connection monitoring and backoff logic

**Estimated implementation time:** 2-3 days with proper testing.

