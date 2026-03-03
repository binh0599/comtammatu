# Security Audit Report: Com Tấm Mã Tú F&B CRM

**Audit Date:** March 2, 2026
**Project:** Com Tấm Mã Tú F&B CRM (Next.js 16.1 + Supabase + Prisma)
**Stack:** Next.js 16.1 App Router, React 19.1, TypeScript 5.9, Supabase Auth, PostgreSQL
**Report Version:** 1.0

---

## Executive Summary

The Com Tấm Mã Tú F&B CRM is an MVP-stage multi-tenant restaurant POS/CRM system with **significant architectural security strengths** (RLS, role-based access, Zod validation, HMAC payment verification) but **several critical gaps** in monitoring, logging, and operational resilience. The system processes payments, handles customer PII (GDPR), and manages multi-tenant data across roles from cashier to owner.

### Critical Findings Summary

| Severity | Count | Key Risks |
|----------|-------|-----------|
| **CRITICAL** | 3 | Missing audit logging on payment/order transactions; GDPR deletion automation gap; payment HMAC race condition |
| **HIGH** | 6 | No rate limiting; incomplete security event logging; client ID validation gaps; error message information leakage |
| **MEDIUM** | 5 | Missing HTTP security headers; credential exposure in middleware; limited CSRF protection; deprecated auth patterns |
| **LOW** | 3 | Voucher code case sensitivity; verbose debug logging; test fixture patterns |

**Risk Score: 7.8/10 (Elevated)**

---

## I. CRITICAL FINDINGS

### 1. CRITICAL: Missing Audit Trail on Payment Processing

**Severity:** CRITICAL
**OWASP Category:** A06:2021 – Vulnerable and Outdated Components, A09:2021 – Security Logging and Monitoring Failures
**Component:** `/apps/web/app/(pos)/pos/cashier/actions.ts`

**Description:**

Payment processing and order lifecycle changes do not log to `audit_logs` or `security_events` tables, violating the HARD BOUNDARY rule `AUDIT_APPEND_ONLY` and PCI DSS compliance requirements. Critical operations include:

- **processPayment()** — Cash and Momo QR payments (lines 36-161)
- **applyVoucherToOrder()** — Discount application (lines 229-311)
- **removeVoucherFromOrder()** — Discount removal (lines 313-348)
- **createMomoPayment()** — Payment initiation (lines 350-405)

**Current State:**

```typescript
// NO AUDIT LOGGING
export async function processPayment(data: { ... }) {
  // Processes payment, completes order
  await supabase.from("payments").insert({...});
  // Missing: INSERT into audit_logs
}
```

**Evidence:**

```bash
grep -c "audit_logs\|security_events" \
  /apps/web/app/(pos)/pos/cashier/actions.ts  # Returns 0
```

**Impact:**

- No traceable record of who processed a payment, when, or why
- Cannot audit discount misuse or unauthorized refunds
- Fails PCI DSS Requirement 10.2.1 (audit trail for payment transactions)
- Violates GDPR Article 32(c) — integrity and confidentiality of processing
- **Severity Justification:** Payment is the highest-risk transaction; no audit = no accountability

**Remediation:**

Every `processPayment()`, `applyVoucherToOrder()`, and payment-related operation must insert into `audit_logs`:

```typescript
// After successful payment:
await supabase.from("audit_logs").insert({
  tenant_id: profile.tenant_id,
  user_id: userId,
  resource_type: "payment",
  resource_id: payment.id,
  action: "create",
  changes: { method, amount, status },
  ip_address: request.headers.get("x-forwarded-for"),
});
```

**Files Affected:**

- `/apps/web/app/(pos)/pos/cashier/actions.ts` — All payment functions (36-405)
- `/apps/web/app/(pos)/pos/orders/actions.ts` — All order status changes (150-180)
- `/apps/web/app/api/webhooks/momo/route.ts` — Webhook completion (50-85)

---

### 2. CRITICAL: GDPR Deletion Request Automation Gap

**Severity:** CRITICAL
**OWASP Category:** A07:2021 – Identification and Authentication Failures, A01:2021 – Broken Access Control
**Component:** `/apps/web/app/api/privacy/deletion-request/route.ts` (POST)

**Description:**

The system allows customers to request account deletion with a 30-day grace period (scheduled_deletion_at), but **no automated deletion job exists** to enforce the scheduled deletion. This creates a GDPR Article 17 "Right to be Forgotten" compliance gap.

**Current State:**

```typescript
// POST /api/privacy/deletion-request
const scheduledAt = new Date();
scheduledAt.setDate(scheduledAt.getDate() + 30);

const { data: newRequest } = await supabase
  .from("deletion_requests")
  .insert({
    customer_id: customer.id,
    status: "pending",
    scheduled_deletion_at: scheduledAt.toISOString(), // Scheduled but never executed
  });
```

**Evidence:**

- `deletion_requests` table has `status` column with 'pending' state
- No backend job (cron, Cloud Function, trigger) found that processes expired deletion requests
- `/apps/web/app/api/privacy/deletion-request/route.ts` only creates requests, never deletes

**Impact:**

- Customers' deletion requests may never be processed
- GDPR Article 17 violation — EU customers have explicit right to deletion
- GDPR fines: Up to €20M or 4% of global revenue
- Reputational risk; potential regulatory action from CNIL (France), ICO (UK)

**Remediation:**

1. **Create a Supabase scheduled function** or Edge Function to run daily:
   ```sql
   -- Check for overdue deletion_requests
   SELECT id, customer_id FROM deletion_requests
   WHERE status = 'pending' AND scheduled_deletion_at <= NOW();

   -- For each:
   -- 1. Delete customer PII (customers table)
   -- 2. Anonymize orders (replace customer_id with NULL)
   -- 3. Delete loyalty_transactions, customer_feedback
   -- 4. Mark deletion_requests.status = 'completed'
   -- 5. Log to audit_logs
   ```

2. **Implement a manual deletion trigger** in admin panel:
   ```typescript
   // /apps/web/app/(admin)/admin/crm/actions.ts
   export async function processCustomerDeletion(deletionRequestId: number) {
     // Fetch deletion_request
     // Delete/anonymize customer data
     // Mark as completed
     // Log to audit_logs
   }
   ```

3. **Store audit trail** of who deleted what:
   ```
   audit_logs: {
     action: "customer_deletion",
     resource_id: customer_id,
     details: { reason, processed_at, processor_id }
   }
   ```

**Files Affected:**

- `/apps/web/app/api/privacy/deletion-request/route.ts` — Deletion request creation (no enforcement)
- Missing: Cloud Function / Cron Job for automatic deletion
- Missing: Admin endpoint for manual deletion review/execution

---

### 3. CRITICAL: Momo Webhook HMAC Verification Race Condition

**Severity:** CRITICAL (Conditional)
**OWASP Category:** A02:2021 – Cryptographic Failures, A09:2021 – Security Logging and Monitoring Failures
**Component:** `/apps/web/app/api/webhooks/momo/route.ts`

**Description:**

The Momo IPN webhook correctly verifies HMAC signatures, but has a **race condition** where duplicate payments can be created if:
1. Webhook is received twice (network retry)
2. Second request arrives before `idempotency_key` insert completes

Additionally, no logging of failed webhook verification attempts occurs.

**Current State:**

```typescript
// Verify HMAC (correct)
const isValid = verifyMomoSignature(verifyParams, signature, secretKey);

if (!isValid) {
  console.error("Momo IPN signature verification failed", {...}); // Only console log
  return NextResponse.json({ resultCode: 1, message: "Invalid signature" }, { status: 400 });
}

// Race condition: if webhook fires twice
const { data: payment } = await supabase
  .from("payments")
  .select("id, status, order_id")
  .eq("idempotency_key", body.requestId)  // May not exist yet if concurrent
  .maybeSingle();

if (!payment) {
  // Second request sees no payment — potential duplicate
  console.error("No payment found for requestId", body.requestId);
  return NextResponse.json({ resultCode: 1, message: "Payment not found" }, { status: 404 });
}
```

**Evidence:**

- Line 47-50: HMAC failure only logged to console, not to `security_events`
- Line 62-77: Payment lookup is not wrapped in transaction/upsert logic
- No idempotency guarantee if webhook retries mid-insert

**Impact:**

- Attacker could replay valid webhook signatures to trigger duplicate refunds/payments
- Legitimate webhook retries could process the same payment twice
- No audit trail of failed HMAC verifications

**Remediation:**

1. **Log failed HMAC verifications to security_events:**
   ```typescript
   if (!isValid) {
     await supabase.from("security_events").insert({
       tenant_id: null, // Unknown tenant for external webhook
       event_type: "webhook_verification_failure",
       severity: "critical",
       description: `Momo webhook HMAC verification failed for orderId=${body.orderId}`,
       source_ip: request.headers.get("x-forwarded-for"),
     });
     return NextResponse.json({ resultCode: 1 }, { status: 400 });
   }
   ```

2. **Ensure payment insert is idempotent using UPSERT or unique constraint:**
   ```typescript
   // payments table already has unique(idempotency_key)
   // But verify this constraint exists in schema
   ```

3. **Add timestamp validation** to reject stale webhooks:
   ```typescript
   const webhookAge = Math.abs(Date.now() - body.responseTime * 1000) / 1000;
   if (webhookAge > 3600) { // > 1 hour
     return NextResponse.json({ resultCode: 1 }, { status: 400 });
   }
   ```

**Files Affected:**

- `/apps/web/app/api/webhooks/momo/route.ts` — Webhook handler (entire file)

---

## II. HIGH SEVERITY FINDINGS

### 4. HIGH: No Rate Limiting on API Endpoints

**Severity:** HIGH
**OWASP Category:** A07:2021 – Identification and Authentication Failures, A04:2021 – Insecure Design
**Component:** All API routes and Server Actions

**Description:**

The system has **zero rate limiting** on critical endpoints (login, password reset, webhook, payment processing). This enables brute force attacks, DOS, and credential stuffing.

**Current State:**

- `.env.example` lists `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` but they are **never used**
- No `rateLimit()` middleware found in codebase
- Login endpoint (`/login/actions.ts`) has no retry limits
- Webhook endpoint (`/api/webhooks/momo/route.ts`) has no request throttling
- Payment endpoint (`/api/webhooks/momo/route.ts`) has no DOS protection

**Evidence:**

```bash
grep -r "rateLimit\|Ratelimit\|Upstash" apps/web --include="*.ts"
# Returns: 0 results (unused)
```

**Impact:**

- Attacker can brute-force passwords: ~10 attempts/second on `/login` without backoff
- Attacker can spam webhook endpoint to trigger false payment events
- DOS: Crash database with unlimited concurrent requests

**Remediation:**

1. **Implement rate limiting middleware** for Next.js:
   ```typescript
   // apps/web/lib/ratelimit.ts
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   export const loginRateLimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 min
   });

   export const webhookRateLimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min per IP
   });
   ```

2. **Apply to login action:**
   ```typescript
   // apps/web/app/login/actions.ts
   export async function login(formData: FormData) {
     const ip = headers().get("x-forwarded-for") || "unknown";
     const { success } = await loginRateLimit.limit(ip);

     if (!success) {
       return { error: "Too many login attempts. Try again later." };
     }
     // ... rest of login
   }
   ```

3. **Apply to webhook:**
   ```typescript
   // apps/web/app/api/webhooks/momo/route.ts
   export async function POST(request: Request) {
     const ip = request.headers.get("x-forwarded-for") || "unknown";
     const { success } = await webhookRateLimit.limit(ip);

     if (!success) {
       return NextResponse.json({ resultCode: 1 }, { status: 429 });
     }
     // ... rest of webhook
   }
   ```

4. **Configure Upstash environment variables** in `.env.local` and Vercel deployment

**Files Affected:**

- Missing: `apps/web/lib/ratelimit.ts`
- `/apps/web/app/login/actions.ts`
- `/apps/web/app/api/webhooks/momo/route.ts`
- `/apps/web/app/api/privacy/deletion-request/route.ts`
- All payment/order endpoints

---

### 5. HIGH: Incomplete Security Event Logging

**Severity:** HIGH
**OWASP Category:** A09:2021 – Security Logging and Monitoring Failures
**Component:** `/apps/web/app/(pos)/pos/orders/actions.ts`, `/apps/web/app/(pos)/pos/cashier/actions.ts`

**Description:**

Security-critical operations are not logged to `security_events` table. Detectable events missing include:

- Failed authorization checks (wrong terminal type, branch mismatch)
- Order modifications (status changes, item additions)
- Discount/voucher abuse attempts
- Failed payment attempts

**Current State:**

```typescript
// apps/web/app/(pos)/pos/orders/actions.ts
if (terminal.branch_id !== profile.branch_id) {
  return { error: "Thiết bị không thuộc chi nhánh của bạn" };
  // No security_events log
}

if (!["mobile_order"].includes(terminal.type)) {
  return { error: "Chỉ thiết bị đặt món mới có thể tạo đơn hàng" };
  // No security_events log
}
```

**Evidence:**

```bash
grep "security_events" apps/web/app/\(pos\)/pos/orders/actions.ts
# Returns: 0
```

**Impact:**

- No detection of repeated failed authorization attempts
- Cannot identify users attempting to bypass RBAC controls
- Cannot correlate brute-force attacks across multiple orders
- Violates PCI DSS Requirement 10.3 (monitoring access)

**Remediation:**

Log all failed authorization and suspicious events:

```typescript
// Helper function
async function logSecurityEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  event: {
    tenant_id: number;
    event_type: string;
    severity: "info" | "warning" | "critical";
    description: string;
    user_id?: string;
    terminal_id?: number;
    source_ip?: string;
  }
) {
  await supabase.from("security_events").insert(event);
}

// In createOrder():
if (terminal.branch_id !== profile.branch_id) {
  await logSecurityEvent(supabase, {
    tenant_id: profile.tenant_id,
    event_type: "unauthorized_terminal_access",
    severity: "warning",
    description: `User ${userId} attempted to create order on terminal from different branch`,
    user_id: userId,
    terminal_id: terminal.id,
  });
  return { error: "Thiết bị không thuộc chi nhánh của bạn" };
}
```

**Files Affected:**

- `/apps/web/app/(pos)/pos/orders/actions.ts` — All failed checks (lines 90-98, 110-115, etc.)
- `/apps/web/app/(pos)/pos/cashier/actions.ts` — Payment validation (lines 60-77)

---

### 6. HIGH: Client ID Validation Gap in Order Operations

**Severity:** HIGH
**OWASP Category:** A01:2021 – Broken Access Control
**Component:** `/apps/web/app/(pos)/pos/orders/actions.ts`, `/apps/web/app/(pos)/pos/cashier/actions.ts`

**Description:**

While most endpoints correctly validate `branch_id` ownership, the HARD BOUNDARY rule `VALIDATE_CLIENT_IDS` is inconsistently applied. Specifically:

- `terminal_id` from client is validated (line 90)
- `table_id` from client is **validated implicitly** (table exists in branch)
- `menu_item_id` from client is **not explicitly validated** against tenant

**Current State:**

```typescript
// ✓ Good: terminal_id validated
const { data: terminal } = await supabase
  .from("pos_terminals")
  .select("id, type, branch_id")
  .eq("id", data.terminal_id)  // Validates it exists
  .single();

if (terminal.branch_id !== profile.branch_id) { // Validates ownership
  return { error: "Thiết bị không thuộc chi nhánh của bạn" };
}

// ⚠ Incomplete: menu_item_id not validated against tenant ownership
const { data: menuItems } = await supabase
  .from("menu_items")
  .select("id, base_price, is_available")
  .in("id", itemIds);  // Assumes client cannot inject foreign menu items

// Should verify:
// - menu_item belongs to tenant
// - menu_item is not from competing tenant's branch
```

**Evidence:**

`createOrder()` assumes all `menu_item_id` values are safe because they come from the client. If Supabase RLS is misconfigured, a malicious client could inject menu items from a different tenant.

**Impact:**

- Privilege escalation: Customer from tenant A could order from tenant B's menu
- Data leak: Menu item prices from competitors
- Business logic bypass: Order items from restricted menus

**Remediation:**

Add explicit tenant validation on all client-provided IDs:

```typescript
// Validate menu_items belong to tenant
const { data: menuItems } = await supabase
  .from("menu_items")
  .select("id, base_price, is_available, tenant_id")  // Add tenant_id
  .in("id", itemIds)
  .eq("tenant_id", profile.tenant_id);  // Verify ownership

const invalidItems = itemIds.filter(
  id => !menuItems?.some(mi => mi.id === id)
);
if (invalidItems.length > 0) {
  return { error: "Invalid menu item(s)" };
}
```

**Files Affected:**

- `/apps/web/app/(pos)/pos/orders/actions.ts` — createOrder() (lines 130-145)
- `/apps/web/app/(pos)/pos/orders/actions.ts` — addOrderItems() (lines 397-425)

---

### 7. HIGH: Information Disclosure via Error Messages

**Severity:** HIGH
**OWASP Category:** A01:2021 – Broken Access Control, A09:2021 – Security Logging and Monitoring Failures
**Component:** `/apps/web/app/api/webhooks/momo/route.ts`, Error handling throughout

**Description:**

Error messages returned to clients expose internal details that could aid attackers in reconnaissance.

**Current Issues:**

1. **Webhook endpoint** returns specific error messages:
   ```typescript
   // Line 69
   return NextResponse.json(
     { resultCode: 1, message: "Payment lookup error" },
     { status: 500 }
   );
   ```
   Attacker learns: We're querying a `payments` table, it has `idempotency_key` field

2. **Order creation** exposes system messages:
   ```typescript
   // Line 106
   return { error: "Thiết bị chưa được kích hoạt hoặc phê duyệt" };
   ```
   Attacker learns: Exact business logic (terminals must be activated + approved)

3. **Console errors** expose stack traces in development/staging deployments

**Evidence:**

```typescript
// apps/web/app/api/webhooks/momo/route.ts
console.error("Payment lookup failed", paymentError);  // Line 69
console.error("Momo IPN signature verification failed", {...}); // Line 47
```

**Impact:**

- Information disclosure: Attackers learn system architecture
- Social engineering: Specific error messages enable more targeted attacks
- Debugging aid: Stack traces in logs reveal code paths

**Remediation:**

1. **Generic error responses to clients:**
   ```typescript
   // Webhook
   if (paymentError) {
     console.error("[internal] Payment lookup failed", paymentError);
     return NextResponse.json(
       { resultCode: 1, message: "Transaction processing failed" },
       { status: 500 }
     );
   }
   ```

2. **Detailed logging server-side only:**
   ```typescript
   // Log to security_events or structured logger
   await supabase.from("security_events").insert({
     event_type: "payment_lookup_error",
     severity: "critical",
     description: paymentError.message, // Not returned to client
     metadata: { requestId: body.requestId },
   });
   ```

3. **Disable console.error in production:**
   ```typescript
   // Wrap with env check
   if (process.env.NODE_ENV === "development") {
     console.error("Debug:", paymentError);
   }
   ```

**Files Affected:**

- `/apps/web/app/api/webhooks/momo/route.ts` — Lines 27, 47, 69, 100
- `/apps/web/app/(pos)/pos/orders/actions.ts` — Lines 106, 115, 142
- All Server Action error returns

---

### 8. HIGH: Missing HTTP Security Headers

**Severity:** HIGH
**OWASP Category:** A05:2021 – Security Misconfiguration
**Component:** `apps/web/next.config.ts`, Missing middleware

**Description:**

The application lacks critical HTTP security headers:

- **Content-Security-Policy (CSP)**: No protection against XSS, clickjacking
- **X-Frame-Options**: No clickjacking protection
- **X-Content-Type-Options**: No MIME-sniffing protection
- **Strict-Transport-Security (HSTS)**: No enforcement of HTTPS
- **Referrer-Policy**: Leaks user data to external sites

**Evidence:**

```bash
grep -i "Content-Security-Policy\|X-Frame-Options\|HSTS\|Referrer" \
  apps/web/next.config.ts
# Returns: 0 results
```

**Impact:**

- XSS attacks: CSP not enforced
- Clickjacking: No X-Frame-Options header
- MIME confusion: Browsers could execute JS as HTML
- Downgrade attacks: No HSTS to enforce HTTPS
- Privacy: Referrer headers leak user location/data

**Remediation:**

Add headers in Next.js middleware or next.config.ts:

```typescript
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.momo.vn https://*.supabase.co",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};
```

**Files Affected:**

- `/apps/web/next.config.ts`
- Missing: Security headers middleware

---

## III. MEDIUM SEVERITY FINDINGS

### 9. MEDIUM: Credential Exposure in Middleware/RLS Functions

**Severity:** MEDIUM
**OWASP Category:** A02:2021 – Cryptographic Failures, A05:2021 – Security Misconfiguration
**Component:** `/packages/database/src/supabase/middleware.ts`

**Description:**

The middleware uses the **anon key** (NEXT_PUBLIC_SUPABASE_ANON_KEY) to call auth functions that rely on RLS policies. While this is the Supabase SSR pattern, it increases risk because:

1. Anon key is public (in browser bundle)
2. RLS policies rely on `auth.uid()` context set by cookie
3. If RLS policy is misconfigured, anon key enables full access

**Current State:**

```typescript
// packages/database/src/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // Public key, lowest privileges
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // ...
      },
    },
  );

  // Relies on RLS + auth.uid() from cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();
```

**Evidence:**

- `.env.example` shows `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public
- `middleware.ts` calls `auth.getUser()` which relies on RLS + session cookie
- If RLS policy for any table is `USING (true)`, anon key has read access

**Impact:**

- Misconfigured RLS policy → Data breach via anon key
- No defense-in-depth: Only RLS protects sensitive operations
- Cookie hijacking → Full account compromise (cookie + anon key = full access)

**Remediation:**

1. **Verify all RLS policies are present** (completed in schema):
   ```sql
   -- Run audit
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public'
   AND rowsecurity = false;  -- Should return empty
   ```

2. **Add defense-in-depth: Service role for sensitive operations**:
   ```typescript
   // For admin operations, use service role key (server-side only)
   async function getAdminSupabase() {
     return createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Server-side only
       // Bypass RLS for critical admin operations
     );
   }
   ```

3. **Rotate anon key regularly** (quarterly)

4. **Monitor RLS policy changes** in version control

**Files Affected:**

- `/packages/database/src/supabase/middleware.ts`
- `/packages/database/src/supabase/server.ts`

---

### 10. MEDIUM: Insufficient CSRF Protection on State-Changing Operations

**Severity:** MEDIUM
**OWASP Category:** A01:2021 – Broken Access Control
**Component:** Server Actions (all)

**Description:**

Server Actions in Next.js 16.1 have CSRF protection, but:

1. No explicit verification shown in code (relying on framework)
2. Cross-site form submissions are possible if SameSite cookie not enforced
3. No CSRF token validation for critical operations (payments, deletions)

**Evidence:**

```typescript
// apps/web/app/(pos)/pos/cashier/actions.ts
export async function processPayment(data: {...}) {
  // No explicit CSRF token validation
  // Relies on Next.js framework CSRF protection
}
```

**Impact:**

- Attacker could craft form that tricks user to process payment
- Especially risky if user visits attacker's site in same session

**Remediation:**

1. **Ensure SameSite cookie is enforced** in Supabase cookie settings:
   ```typescript
   // packages/database/src/supabase/middleware.ts
   cookies: {
     setAll(cookiesToSet: [...]) {
       cookiesToSet.forEach(({ name, value, options }) => {
         supabaseResponse.cookies.set(name, value, {
           ...options,
           sameSite: 'strict', // Add explicit SameSite
           secure: true,      // HTTPS only
         });
       });
     },
   }
   ```

2. **Add explicit CSRF token validation** for payments:
   ```typescript
   export async function processPayment(
     data: {...},
     csrfToken: string
   ) {
     // Validate CSRF token before processing
     if (!verifyCsrfToken(csrfToken)) {
       return { error: "CSRF token invalid" };
     }
   }
   ```

**Files Affected:**

- `/packages/database/src/supabase/middleware.ts`
- All Server Actions (especially `/apps/web/app/(pos)/pos/cashier/actions.ts`)

---

### 11. MEDIUM: Voucher Code Case Sensitivity Bypass

**Severity:** MEDIUM
**OWASP Category:** A07:2021 – Identification and Authentication Failures
**Component:** `/apps/web/app/(pos)/pos/cashier/actions.ts`

**Description:**

Voucher code lookup uses `ilike()` (case-insensitive), which is correct for UX but could allow duplicate voucher codes with different cases (e.g., "VOUCHER2024" vs "voucher2024").

**Current State:**

```typescript
// Line 204, validateVoucher()
const { data: voucher } = await supabase
  .from("vouchers")
  .select(...)
  .eq("tenant_id", profile.tenant_id)
  .ilike("code", parsed.data.code)  // Case-insensitive lookup
  .maybeSingle();
```

**Issue:**

If database constraint is `UNIQUE(tenant_id, code)` but code is not case-normalized, attackers could:

1. Register "DISC50" and "disc50" as separate vouchers
2. Cause confusion in accounting
3. Trigger unexpected discount stacking

**Evidence:**

```sql
-- From schema: supabase/migrations/20260228000000_initial_schema.sql, line 250
CONSTRAINT uniq_voucher_code UNIQUE (tenant_id, code),
```

The constraint is `code` not `LOWER(code)`, so case variants are allowed in database.

**Impact:**

- Voucher code confusion: User enters "VOUCHER2024", system applies "voucher2024"
- Multiple discount codes with same text, different cases
- Accounting discrepancies

**Remediation:**

1. **Normalize code to uppercase on insert:**
   ```typescript
   // In create voucher action
   const { error } = await supabase
     .from("vouchers")
     .insert({
       code: parsed.data.code.toUpperCase(),  // Normalize
       // ...
     });
   ```

2. **Update constraint in migration:**
   ```sql
   ALTER TABLE vouchers
   DROP CONSTRAINT uniq_voucher_code;

   ALTER TABLE vouchers
   ADD CONSTRAINT uniq_voucher_code_normalized
     UNIQUE (tenant_id, LOWER(code));
   ```

3. **Update lookup to normalize client input:**
   ```typescript
   .ilike("code", parsed.data.code.toUpperCase())
   ```

**Files Affected:**

- `/apps/web/app/(pos)/pos/cashier/actions.ts` — Lines 204, 240
- Schema: `/supabase/migrations/20260228000000_initial_schema.sql` — Line 250

---

### 12. MEDIUM: Deprecated Supabase Authentication Pattern

**Severity:** MEDIUM
**OWASP Category:** A07:2021 – Identification and Authentication Failures
**Component:** `/apps/web/app/api/privacy/helpers.ts`

**Description:**

The privacy helper looks up customers by email only, without verifying email is confirmed. This could allow:

1. User registers, doesn't confirm email
2. Someone else registers with same email address
3. System grants access to wrong customer

**Current State:**

```typescript
// apps/web/app/api/privacy/helpers.ts, line 14
const { data: customer } = await supabase
  .from("customers")
  .select("id, tenant_id, full_name, email")
  .eq("email", user.email)  // No verification of email_confirmed_at
  .single();
```

**Evidence:**

- No check for `email_confirmed_at` column in customers table
- Supabase auth can have unconfirmed users

**Impact:**

- Unconfirmed email users could export/delete data
- Privilege escalation if email registration is exploited

**Remediation:**

1. **Verify email is confirmed:**
   ```typescript
   if (!user.email_confirmed_at) {
     return { error: "Email not confirmed", status: 403 } as const;
   }
   ```

2. **Enforce email verification in registration flow:**
   ```typescript
   // apps/web/app/login/actions.ts
   const { user } = await supabase.auth.signUpWithPassword({
     email: parsed.data.email,
     password: parsed.data.password,
   });

   if (!user.email_confirmed_at) {
     return { error: "Please verify your email" };
   }
   ```

**Files Affected:**

- `/apps/web/app/api/privacy/helpers.ts` — Line 14
- `/apps/web/app/login/actions.ts` — Registration logic (missing)

---

## IV. LOW SEVERITY FINDINGS

### 13. LOW: Verbose Error Logging in Production

**Severity:** LOW
**OWASP Category:** A09:2021 – Security Logging and Monitoring Failures
**Component:** `/apps/web/app/api/webhooks/momo/route.ts`

**Description:**

Momo webhook uses `console.error()` which may expose details in production logs if not properly configured for log aggregation.

**Current State:**

```typescript
console.error("MOMO_SECRET_KEY is not configured");
console.error("Momo IPN signature verification failed", {...});
console.error("Payment lookup failed", paymentError);
```

**Remediation:**

Use structured logging with environment filtering:

```typescript
function logError(context: string, error: any) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error);
  } else {
    // Send to Sentry or structured logger
    Sentry.captureException(error, { tags: { context } });
  }
}
```

**Files Affected:**

- `/apps/web/app/api/webhooks/momo/route.ts` — Lines 27, 47, 69, 100

---

### 14. LOW: Missing Secrets Configuration in .env.example

**Severity:** LOW
**OWASP Category:** A02:2021 – Cryptographic Failures
**Component:** `.env.example`

**Description:**

Payment gateway secrets are commented out in `.env.example`:

```bash
# VNPAY_TMN_CODE=
# VNPAY_HASH_SECRET=
# MOMO_PARTNER_CODE=
# MOMO_ACCESS_KEY=
# MOMO_SECRET_KEY=
```

While this prevents accidental exposure, developers might forget to configure them.

**Remediation:**

1. Document required secrets clearly
2. Add validation on startup:
   ```typescript
   if (!process.env.MOMO_SECRET_KEY) {
     throw new Error("MOMO_SECRET_KEY must be configured");
   }
   ```

---

### 15. LOW: Test Data Fixtures in Production-like Credentials

**Severity:** LOW
**OWASP Category:** A05:2021 – Security Misconfiguration
**Component:** `supabase/seed.sql`

**Description:**

Seed data may contain test accounts with known passwords if present.

**Remediation:**

Ensure seed.sql is **never** used in production, only in development/testing:

```bash
# In CI/CD
if [ "$ENVIRONMENT" = "production" ]; then
  echo "Skipping seed in production"
else
  supabase db push --seed
fi
```

---

## V. CONFIGURATION & ENVIRONMENT REVIEW

### Database Security

✅ **RLS Enabled:** All tables have RLS enabled (104 policies defined)
✅ **Tenant Isolation:** RLS policies enforce tenant_id checks
✅ **Role-Based Access:** Policies differentiate owner/manager/cashier/chef roles
⚠ **Audit Tables:** `audit_logs` and `security_events` exist but not actively used

### Authentication & Sessions

✅ **Cookie-based Sessions:** Supabase SSR with secure cookies
✅ **Anon Key Isolation:** Client uses anon key, RLS enforces data isolation
✅ **Session Timeout:** Relies on Supabase default (1 hour)
❌ **2FA:** No multi-factor authentication implemented
❌ **Session Revocation:** No immediate session revocation on logout

### Payment Processing

✅ **HMAC Verification:** Momo webhooks verify SHA256 HMAC signature
✅ **PCI DSS:** No card data stored (SAQ A compliant)
✅ **Idempotency Keys:** Payment operations use UUID idempotency keys
⚠ **Webhook Retries:** Race condition on duplicate webhooks
❌ **TLS Pinning:** No TLS certificate pinning for payment API calls

### Data Protection

✅ **GDPR Endpoints:** Data export and deletion request APIs implemented
❌ **Deletion Automation:** No background job executes scheduled deletions
❌ **Data Encryption at Rest:** Supabase provides but no explicit configuration visible
⚠ **Sensitive Data in Logs:** Error messages leak internal structure

### Infrastructure

✅ **Vercel Deployment:** Managed HTTPS/security baseline
❌ **WAF/DDoS:** No Web Application Firewall or DDoS protection evident
❌ **Rate Limiting:** No implementation despite Upstash Redis configuration in .env
❌ **Security Headers:** No CSP, X-Frame-Options, HSTS configured

---

## VI. REMEDIATION PRIORITY & TIMELINE

### Phase 1: Critical (Week 1)

1. **Add audit logging to payment operations** (~8 hours)
   - Files: `/apps/web/app/(pos)/pos/cashier/actions.ts`, `/apps/web/app/api/webhooks/momo/route.ts`
   - Create audit helper function
   - Insert audit_logs on every payment/voucher/order change

2. **Implement GDPR deletion automation** (~16 hours)
   - Create Supabase function or Cloud Function
   - Run daily to process overdue deletion requests
   - Add manual admin trigger endpoint

3. **Add webhook HMAC logging** (~4 hours)
   - Log failed verifications to security_events
   - Add timestamp validation to reject stale webhooks

### Phase 2: High (Week 2)

4. **Implement rate limiting** (~12 hours)
   - Set up Upstash Redis client
   - Add rate limiting to login, webhook, payment endpoints
   - Configure limits: login 5/15min, webhooks 100/min per IP

5. **Add security event logging** (~12 hours)
   - Create logging helper function
   - Log failed authorization checks, suspicious operations
   - Integrate with all order/payment/auth endpoints

6. **Add HTTP security headers** (~4 hours)
   - CSP policy in next.config.ts
   - X-Frame-Options, HSTS, Referrer-Policy
   - Test with security scanner

### Phase 3: Medium (Week 3)

7. **Normalize voucher codes** (~4 hours)

8. **Verify email confirmation** (~4 hours)

9. **Add CSRF token validation** (~6 hours)

### Phase 4: Monitoring & Hardening (Week 4+)

10. **Implement centralized logging** (Sentry/LogRocket)
11. **Set up security alerts** for suspicious patterns
12. **Conduct penetration test** of payment flow
13. **Implement secrets rotation** strategy

---

## VII. SECURITY TESTING RECOMMENDATIONS

### SAST Tools to Deploy

- **Semgrep:** Catch common vulnerabilities (SQL injection, XSS, hardcoded secrets)
- **CodeQL:** GitHub-native analysis, detects CWE-89, CWE-79
- **SonarQube:** Code quality + security scans

### DAST Tools

- **OWASP ZAP:** Automated scanning of API endpoints (login, webhooks, privacy API)
- **Burp Community:** Manual testing of payment flow, CSRF, session handling

### Specific Test Cases

1. **Payment Flow:**
   - Attempt duplicate payment with same idempotency key
   - Send malformed Momo webhook with invalid signature
   - Send webhook from different IP than expected

2. **Authorization:**
   - Cashier tries to access order from different branch
   - Customer tries to access another customer's deletion request
   - User tries to apply voucher from different tenant

3. **Rate Limiting:**
   - 100 rapid login attempts from single IP
   - 1000 webhook requests in 1 minute

4. **GDPR:**
   - Request data export, verify all PII is included
   - Request deletion, verify scheduled date, check automation

---

## VIII. COMPLIANCE MAPPING

### PCI DSS (Payment Card Industry Data Security Standard)

- **Requirement 1:** Network Segmentation — ✅ Supabase handles
- **Requirement 2:** Default Security — ✅ Implemented
- **Requirement 3:** Card Data Protection — ✅ No card data stored (SAQ A)
- **Requirement 10:** Audit Logging — ❌ **CRITICAL GAP** — Payment operations not logged
- **Requirement 12:** Incident Response — ⚠ Missing formalized procedure

### GDPR (General Data Protection Regulation)

- **Article 5:** Data Minimization — ✅ Only PII necessary for F&B ops stored
- **Article 17:** Right to be Forgotten — ❌ **CRITICAL GAP** — Deletion not automated
- **Article 32:** Integrity & Confidentiality — ⚠ No encryption at rest evident
- **Article 33:** Breach Notification — ⚠ No formal breach response plan

### OWASP ASVS (Application Security Verification Standard)

- **V2 Authentication:** 3/5 (missing 2FA, session revocation)
- **V3 Session Management:** 3/5 (missing explicit timeout, revocation)
- **V4 Access Control:** 4/5 (missing client ID validation for all fields)
- **V5 Input Validation:** 5/5 (Zod schemas enforced)
- **V6 Cryptography:** 4/5 (no TLS pinning, missing data-at-rest encryption config)
- **V7 Error Handling:** 2/5 (verbose error messages)
- **V8 Logging:** 2/5 (missing audit trail for critical ops)
- **V9 API Security:** 3/5 (no rate limiting, missing CORS headers)

---

## IX. CONCLUSION

The Com Tấm Mã Tú F&B CRM has a **solid architectural foundation** with RLS, Zod validation, HMAC payment verification, and role-based access control. However, **critical operational gaps** in audit logging, GDPR automation, and attack mitigation pose **significant compliance and security risks**.

**Immediate actions required:**

1. **Audit logging on payment operations** (compliance deadline)
2. **GDPR deletion automation** (legal compliance)
3. **Rate limiting deployment** (DOS prevention)
4. **Security event logging** (incident detection)

With these remediations, the application can reach **production-ready** security posture for a financial transaction system.

---

## X. APPENDIX: Security Controls Checklist

### Authentication & Authorization

- [ ] Enforce email confirmation before account activation
- [ ] Implement 2FA for admin roles (owner, manager)
- [ ] Add session revocation on logout
- [ ] Rate limit login attempts (5 per 15 minutes)
- [ ] Log failed authentication attempts

### Payment Security

- [ ] Audit log all payment transactions
- [ ] Implement webhook timestamp validation (< 1 hour)
- [ ] Add TLS certificate pinning for Momo API calls
- [ ] Encrypt payment secrets using Supabase Vault
- [ ] Test webhook idempotency (duplicate signature handling)

### Data Protection

- [ ] Implement automated GDPR deletion job
- [ ] Encrypt customer PII at rest (if not already)
- [ ] Enable database backup encryption
- [ ] Implement data retention policy (delete old orders after 7 years)
- [ ] Add PII masking in logs (no email/phone in error messages)

### Monitoring & Logging

- [ ] Centralized logging (Sentry, Datadog, or ELK)
- [ ] Real-time alerts for failed payments, auth failures
- [ ] Daily security event summary report
- [ ] Audit log retention: Minimum 1 year
- [ ] Security incident response playbook

### Infrastructure & Operations

- [ ] Deploy Web Application Firewall (WAF)
- [ ] Rate limiting on all public endpoints
- [ ] HTTP security headers (CSP, HSTS, X-Frame-Options)
- [ ] Secrets rotation: Monthly for API keys
- [ ] Regular penetration testing: Quarterly
- [ ] Dependency scanning: Automated (Snyk/Dependabot)
- [ ] Static code analysis: Pre-commit (Semgrep)

### Compliance & Documentation

- [ ] GDPR Data Processing Agreement (DPA) signed with Supabase
- [ ] PCI DSS attestation (SAQ A maintained)
- [ ] Incident response policy documented
- [ ] Security contact information published
- [ ] Privacy policy updated and linked from UI

---

**Report Prepared By:** Security Auditor (Claude)
**Report Date:** March 2, 2026
**Next Review:** June 2, 2026 (Quarterly)
**Classification:** Internal Use
