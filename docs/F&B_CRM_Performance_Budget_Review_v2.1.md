# F&B CRM System — Performance & Budget Optimization Review

## Architecture v2.1 → v2.2 Recommended Changes

**Review Date:** February 2026
**Scope:** Performance bottlenecks, budget waste, and architectural improvements
**Baseline:** F&B_CRM_Lightweight_Architecture_v2.1.md

---

## Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | Must fix before production — risk of outage or data loss | Before MVP launch |
| **P1** | Should fix before production — measurable performance impact | During MVP development |
| **P2** | Fix after launch — long-term scalability concern | Post-launch (Month 2-3) |
| **P3** | Nice to have — cost savings or DX improvement | When convenient |

---

## PART 1: PERFORMANCE CHANGES

---

### 1.1 [P0] Add PgBouncer Connection Pooling

**Problem:**
Vercel serverless functions create a new database connection per invocation. Supabase Pro provides ~60 direct connections. A single busy branch with 3-5 POS terminals + KDS + admin dashboard can open 10-15 concurrent connections. With 5-10 branches, peak hour traffic will exceed the connection limit, causing `FATAL: too many connections` errors and POS downtime.

**Current state:** No connection pooling mentioned in the architecture document.

**Change required:**

```
# In Tech Stack table (Section 2.2), add:
| Connection Pool | Supabase PgBouncer (built-in) | Transaction-mode pooling for serverless | Included |

# In all application connection strings, switch from:
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# To the pooler URL:
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

**Additional notes:**
- Use `transaction` mode (not `session` mode) for Vercel serverless
- Prisma requires `?pgbouncer=true&connection_limit=1` in the connection string
- Supabase Realtime and migrations should still use the direct connection (port 5432)

**Impact:** Prevents production outages under load.
**Effort:** Low (configuration change only).

---

### 1.2 [P0] Remove Redundant and Unnecessary Indexes

**Problem:**
The schema defines ~80+ indexes across all tables. Many are redundant (duplicating UNIQUE constraints or PRIMARY KEYs) or unnecessary at the expected data volume (thousands of rows, not millions). Each index costs:
- Write performance: every INSERT/UPDATE/DELETE must update all indexes
- Memory: indexes compete with data cache in Supabase Pro's 8GB allocation
- Vacuum overhead: more indexes = longer autovacuum cycles

**Indexes to remove immediately:**

```sql
-- REDUNDANT: UNIQUE constraints already create implicit indexes
DROP INDEX idx_orders_idempotency;       -- orders.idempotency_key is UNIQUE
DROP INDEX idx_payments_idempotency;     -- payments.idempotency_key is UNIQUE
DROP INDEX idx_tenants_slug;             -- tenants.slug is UNIQUE
DROP INDEX idx_pos_terminals_device_fingerprint; -- device_fingerprint is UNIQUE

-- REDUNDANT: Primary key already covers these
-- (Any index on just the PK column is redundant)

-- LOW VALUE at small scale (< 10K rows): remove now, add back if needed
DROP INDEX idx_branches_tenant_active;   -- branches table will have < 20 rows
DROP INDEX idx_menu_categories_sort;     -- < 100 categories per tenant
DROP INDEX idx_kds_timing_station_id;    -- < 50 timing rules per branch
DROP INDEX idx_kds_timing_category_id;   -- same
DROP INDEX idx_shifts_branch_id;         -- < 30 shifts per branch
DROP INDEX idx_loyalty_tiers_tenant_id;  -- < 10 tiers per tenant
DROP INDEX idx_system_settings_tenant_id; -- < 50 settings per tenant
```

**Indexes to keep (high-value for query patterns):**

```sql
-- KEEP: Hot-path query indexes
idx_orders_branch_status_date    -- Cashier: "show me today's open orders for this branch"
idx_orders_unpaid                -- Cashier: "show unpaid orders"
idx_kds_tickets_status           -- KDS: "show pending tickets for my station"
idx_payments_paid_at             -- Reports: "payments for date range"
idx_stock_levels_version         -- Optimistic concurrency on stock deduction
idx_menu_items_fts               -- Full-text search on menu
idx_audit_logs_tenant_created    -- Audit trail queries
idx_notifications_unread         -- Notification badge count
```

**Process for future indexes:**
Add this to Section 5 of the architecture document:

```
INDEX POLICY:
1. Do NOT create indexes preemptively
2. Monitor slow queries via Supabase Dashboard → Query Performance
3. Use pg_stat_user_indexes to find unused indexes
4. Add indexes only when a query consistently exceeds 100ms
5. Review and prune indexes quarterly
```

**Impact:** 20-30% faster write operations across all tables.
**Effort:** Low (SQL migration to drop indexes).

---

### 1.3 [P1] Replace Array Columns with Junction Tables

**Problem:**
Three tables use PostgreSQL arrays to store foreign key references:

| Table | Column | Issue |
|-------|--------|-------|
| `menus` | `branches BIGINT[]` | No FK constraint, orphan IDs possible |
| `vouchers` | `branches BIGINT[]` | Same |
| `kds_stations` | `categories BIGINT[]` | Same |

Arrays with GIN indexes work for containment queries (`@>`), but they break referential integrity, make JOINs awkward (`ANY(branches)`), and cannot participate in standard query planning.

**Change required:**

```sql
-- Remove array columns
ALTER TABLE menus DROP COLUMN branches;
ALTER TABLE vouchers DROP COLUMN branches;
ALTER TABLE kds_stations DROP COLUMN categories;

-- Add junction tables
CREATE TABLE menu_branches (
  menu_id BIGINT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_id, branch_id)
);

CREATE TABLE voucher_branches (
  voucher_id BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (voucher_id, branch_id)
);

CREATE TABLE kds_station_categories (
  station_id BIGINT NOT NULL REFERENCES kds_stations(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (station_id, category_id)
);
```

**Query migration example:**

```sql
-- BEFORE (array):
SELECT * FROM menus WHERE branch_id = ANY(branches);

-- AFTER (junction table):
SELECT m.* FROM menus m
JOIN menu_branches mb ON mb.menu_id = m.id
WHERE mb.branch_id = :branch_id;
```

**Also update RLS policies** to use the junction tables for branch-scoped access.

**Impact:** Guarantees data integrity, standard JOIN performance, proper FK cascades.
**Effort:** Medium (schema migration + query updates + RLS policy updates).

---

### 1.4 [P1] Optimize Supabase Realtime Usage — Broadcast over Postgres Changes

**Problem:**
Current design subscribes every device (waiter phones, cashier tablets, KDS screens, customer apps) to `postgres_changes` channels. Each subscription triggers PostgreSQL's logical replication. With 5-10 branches × 5+ devices each = 30-50+ active replication listeners, this causes:
- WAL (Write-Ahead Log) accumulation
- Replication slot lag
- Increased CPU on Supabase's Realtime server
- Potential hitting Supabase Pro's Realtime message limits

**Change required — Split into two tiers:**

**Tier 1: Postgres Changes (keep — critical for data consistency)**
- KDS tickets: `INSERT/UPDATE on kds_tickets` (kitchen must see every order)
- Order status for customer app: `UPDATE on orders WHERE id = my_order` (customer tracking)

**Tier 2: Broadcast (switch to — ephemeral notifications)**
- Waiter notifications ("Order #45 ready") → Broadcast to `branch:{id}:waiters`
- Cashier notifications ("Table 7 requests bill") → Broadcast to `branch:{id}:cashiers`
- Table status changes → Broadcast to `branch:{id}:tables`
- Terminal presence (who is online) → Already using Presence, keep as-is

**Implementation pattern:**

```typescript
// API endpoint: when order status changes
// Instead of relying solely on postgres_changes, explicitly broadcast
async function updateOrderStatus(orderId: number, newStatus: string) {
  // 1. Update database (this triggers KDS postgres_changes — Tier 1)
  await db.orders.update({ where: { id: orderId }, data: { status: newStatus } });

  // 2. Broadcast notification to relevant staff (Tier 2 — ephemeral)
  await supabase.channel(`branch:${branchId}:notifications`).send({
    type: 'broadcast',
    event: 'order_status',
    payload: { orderId, orderNumber, newStatus, tableNumber }
  });
}
```

**Update Section 6.1** of the architecture document to reflect this two-tier model.

**Impact:** Reduces Realtime load by ~60%, prevents WAL buildup.
**Effort:** Medium (refactor subscription logic in POS, KDS, and customer apps).

---

### 1.5 [P1] Evaluate Drizzle ORM to Replace Prisma

**Problem:**
Prisma 7.2 uses a Rust-based query engine binary (~15MB) that runs as a sidecar process. On Vercel serverless:
- Cold start penalty: 200-500ms to load the engine
- Memory overhead: ~50-80MB per function instance
- Bundle size: larger deployment artifacts

For a POS system where cashier taps "Process Payment" and expects instant response, a 500ms cold start on top of network + DB latency is noticeable.

**Change required — Evaluate Drizzle ORM:**

```
# In Tech Stack table (Section 2.2), change:
| ORM | Drizzle ORM 0.39+ + @supabase/supabase-js | Type-safe queries, zero binary overhead | Free |

# Instead of Prisma:
| ORM | Prisma 7.2 + @supabase/supabase-js | Type-safe queries + Supabase client | Free |
```

**Migration approach:**
- Phase 1: Use `@supabase/supabase-js` directly for hot-path queries (orders, payments, KDS tickets)
- Phase 2: Migrate admin/reporting queries to Drizzle ORM
- Phase 3: Remove Prisma entirely

**Drizzle advantages for this project:**
- No binary engine — pure TypeScript
- Cold start: ~50ms (vs Prisma's 200-500ms)
- Memory: ~10-20MB (vs Prisma's 50-80MB)
- Native PostgreSQL features (arrays, JSONB, enums) without workarounds
- SQL-like API — closer to raw SQL, easier for team familiar with PostgreSQL

**If Prisma is kept**, at minimum:
- Enable Prisma Accelerate (edge-compatible, reduces cold starts)
- Use `@prisma/client/edge` for serverless functions
- Set `previewFeatures = ["driverAdapters"]` to use Supabase's connection pooler natively

**Impact:** 60-80% reduction in serverless cold starts for POS operations.
**Effort:** Medium-High (ORM migration across all modules).

---

### 1.6 [P2] Partition Append-Only Tables

**Problem:**
These tables grow indefinitely and are never updated/deleted (append-only):

| Table | Estimated growth | After 1 year |
|-------|-----------------|--------------|
| `audit_logs` | ~500-1000 rows/day (5-10 branches) | 180K-365K rows |
| `security_events` | ~100-500 rows/day | 36K-180K rows |
| `stock_movements` | ~200-500 rows/day | 73K-180K rows |
| `order_status_history` | ~300-800 rows/day | 110K-290K rows |
| `loyalty_transactions` | ~50-200 rows/day | 18K-73K rows |

After 2-3 years without partitioning, queries on these tables will slow down, and the data retention cleanup (Section 11) will require expensive DELETE operations.

**Change required — Partition by month:**

```sql
-- Convert audit_logs to partitioned table
CREATE TABLE audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id BIGINT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at),  -- Partition key must be in PK

  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

-- Create partitions (automate via pg_partman or cron job)
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... etc.
```

**Data retention benefit:**

```sql
-- Instead of slow: DELETE FROM audit_logs WHERE created_at < '2019-01-01'
-- Fast: DROP TABLE audit_logs_2019_01;  (instant, no vacuum needed)
```

**Apply the same pattern to:** `security_events`, `stock_movements`, `order_status_history`.

**Do NOT partition** `loyalty_transactions` (too few rows, and queries need cross-partition access for point balances).

**Impact:** 10x faster retention cleanup, consistent query performance over years.
**Effort:** Low (initial setup, automate partition creation).

---

### 1.7 [P2] Make Customer Counters Async

**Problem:**
`customers.total_visits` and `customers.total_spent` are updated synchronously in the payment transaction:

```
BEGIN;
  INSERT INTO payments (...);
  UPDATE orders SET pos_session_id = ...;
  UPDATE stock_levels SET quantity = quantity - ...;  -- per ingredient
  UPDATE customers SET total_visits = total_visits + 1, total_spent = total_spent + amount;
  INSERT INTO loyalty_transactions (...);
COMMIT;
```

This transaction touches 4+ tables, holds locks on all of them, and the customer counter UPDATE can conflict if the same customer has two simultaneous orders (e.g., dine-in at one branch, delivery at another).

**Change required — Async counter updates:**

**Option A: Database trigger (simple)**

```sql
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Runs after payment is committed, in a separate transaction
  UPDATE customers SET
    total_visits = total_visits + 1,
    total_spent = total_spent + NEW.amount,
    last_visit = NOW()
  WHERE id = (SELECT customer_id FROM orders WHERE id = NEW.order_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_stats
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_customer_stats();
```

**Option B: Materialized view (most accurate)**

```sql
CREATE MATERIALIZED VIEW customer_stats AS
SELECT
  o.customer_id,
  COUNT(DISTINCT o.id) AS total_visits,
  COALESCE(SUM(p.amount), 0) AS total_spent,
  MAX(o.created_at) AS last_visit
FROM orders o
JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
WHERE o.customer_id IS NOT NULL
GROUP BY o.customer_id;

-- Refresh hourly via Supabase cron
SELECT cron.schedule('refresh-customer-stats', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY customer_stats');
```

**Recommendation:** Use Option A (trigger) for MVP simplicity, migrate to Option B if contention becomes an issue.

**Impact:** Shorter payment transactions, no lock contention on customers table.
**Effort:** Low.

---

### 1.8 [P2] Reduce PBKDF2 Iterations for Mobile Devices

**Problem:**
Section 7.3 specifies PBKDF2 with 600,000 iterations (OWASP 2023 minimum for SHA-256). On a mid-range Android phone (waiter device), this takes 2-5 seconds for key derivation. This delays:
- App launch (re-encrypt offline data)
- Screen unlock after 15-min timeout
- Any re-authentication flow

Waiters need instant access during service — a 3-second wait is unacceptable.

**Change required:**

```typescript
// Detect device capability and adjust
const iterations = await benchmarkPBKDF2();  // Time 1000 iterations

const MOBILE_ITERATIONS = 210_000;   // OWASP minimum for PBKDF2-SHA256 (2023)
const DESKTOP_ITERATIONS = 600_000;  // For cashier stations (laptop/tablet)

const key = await crypto.subtle.deriveKey({
  name: 'PBKDF2',
  salt: crypto.getRandomValues(new Uint8Array(16)),
  iterations: isMobileDevice() ? MOBILE_ITERATIONS : DESKTOP_ITERATIONS,
  hash: 'SHA-256',
}, ...);
```

**Compensate for lower iterations on mobile:**
- Require minimum 6-digit PIN + device fingerprint (effectively a longer key)
- Auto-lock after 5 minutes (not 15) on mobile
- Mobile stores only non-sensitive data (menu items, pending orders — no PII, no payments)

**Update Section 7.3** to document the tiered iteration strategy.

**Impact:** App unlock time drops from 3-5s to <1s on mobile.
**Effort:** Low.

---

## PART 2: BUDGET CHANGES

---

### 2.1 [P3] Remove Upstash Redis — Use Edge-Native Rate Limiting

**Current cost:** $0-10/month
**Problem:** Upstash Redis is used only for rate limiting (Section 9.1). At the scale of 5-10 branches, total API traffic is likely under 1,000 requests/minute. This doesn't justify an external Redis dependency.

**Change required:**

**Option A: Vercel Edge Middleware with in-memory store (simplest)**

```typescript
// middleware.ts — runs at the edge, no external dependency
import { NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 100;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + window });
    return NextResponse.next();
  }
  if (entry.count >= limit) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  entry.count++;
  return NextResponse.next();
}
```

> **Note:** In-memory rate limiting resets when the edge function cold starts. This is acceptable at small scale — it degrades gracefully (slightly more lenient, never more strict).

**Option B: Supabase Edge Function rate limiting (if stricter control needed)**

Use a Supabase table or the `pg_net` extension for server-side rate tracking.

**Update Section 2.2 Tech Stack:** Remove Upstash Redis row.
**Update Section 9.1:** Replace Upstash implementation with edge-native approach.

**Savings:** $0-10/month + removes an external dependency.

---

### 2.2 [P3] Defer Resend Email — Start with Supabase SMTP Only

**Current cost:** $0-20/month for Resend
**Problem:** The architecture lists both Resend and Supabase SMTP. For MVP, the only emails needed are:
- Password reset
- Email verification
- Deletion request confirmation

All of these are handled by Supabase Auth's built-in SMTP. The CRM campaigns module (email/SMS marketing) is likely Phase 3+ of the roadmap.

**Change required:**

```
# In Tech Stack table (Section 2.2), change:
| Email | Supabase SMTP (built-in) | Auth emails, transactional | Included |

# Add note:
> Marketing campaigns (Section 4.8 `campaigns` table) will require
> Resend ($20/mo) or similar when the CRM module is built (Phase 3+).
```

**Update cost table:**

```
| Email (Resend) | Deferred to Phase 3 | $0 (MVP) |
```

**Savings:** $0-20/month during MVP and early production.

---

### 2.3 [P3] Plan Sentry Usage to Stay Within Free Tier

**Current cost:** $0 (free tier: 5K events/month)
**Risk:** A POS system with 5-10 branches can easily exceed 5K error events/month, triggering a forced upgrade to Sentry Team ($26/month).

**Change required — Add Sentry filtering:**

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sampleRate: 0.1,           // Only send 10% of errors (sample)
  tracesSampleRate: 0.05,    // Only trace 5% of transactions

  beforeSend(event) {
    // Drop known non-critical errors
    const ignoredMessages = [
      'Network request failed',      // Offline POS — expected
      'ResizeObserver loop',          // Browser noise
      'Failed to fetch',              // Intermittent network
    ];
    if (ignoredMessages.some(msg => event.message?.includes(msg))) {
      return null;  // Drop event
    }

    // Strip sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    return event;
  },
});
```

**Also consider alternatives if exceeding free tier:**
- **Vercel's built-in error tracking** (included in Pro plan) for basic error capture
- **BetterStack Logs** (free tier: 1GB/month) for structured logging
- **Axiom** (free tier: 500MB/month) for observability

**Update Section 2.2 Tech Stack** to note the Sentry filtering strategy.

**Savings:** Keeps monitoring at $0/month by staying within free tier limits.

---

### 2.4 [P3] Post-MVP: Evaluate Cloudflare Pages as Vercel Alternative

**Current cost:** $20/month (Vercel Pro)
**Potential savings:** $15-20/month

**Not recommended for MVP** — Vercel's DX (auto-deploy, preview URLs, serverless functions) accelerates development. However, after launch, evaluate:

| Feature | Vercel Pro ($20/mo) | Cloudflare Pages (Free) |
|---------|--------------------|-----------------------|
| Static hosting | Included | Free (unlimited bandwidth) |
| Serverless functions | Vercel Functions | Cloudflare Workers (100K req/day free) |
| Edge middleware | Yes | Yes (built-in) |
| Preview deployments | Yes | Yes |
| Custom domains | Yes | Yes |
| Build minutes | 6000 min/mo | 500 min/mo (free), 5000 (paid $5) |
| Analytics | Basic included | Web Analytics (free) |

**Change required (post-MVP evaluation):**
Add to the Roadmap document:

```
## Phase 4: Cost Optimization (Month 4-6)
- [ ] Evaluate Cloudflare Pages migration
- [ ] Benchmark Next.js on Cloudflare Workers (via @cloudflare/next-on-pages)
- [ ] Compare function execution costs at actual production traffic
- [ ] Decision: migrate or stay on Vercel
```

**Savings:** Potentially $15-20/month if Cloudflare is sufficient.

---

## PART 3: UPDATED COST ESTIMATE

### Before (v2.1)

| Item | Cost/month |
|------|-----------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Domain | ~$1 |
| Email (Resend) | $0-20 |
| Sentry | $0 |
| Upstash Redis | $0-10 |
| **TOTAL** | **$45-76 (base) / $76-120 (with extras)** |

### After (v2.2 optimized)

| Item | Cost/month | Change |
|------|-----------|--------|
| Vercel Pro | $20 | No change (evaluate Cloudflare post-MVP) |
| Supabase Pro | $25 | No change |
| Domain | ~$1 | No change |
| Email | $0 | Supabase SMTP only (defer Resend to Phase 3) |
| Sentry | $0 | Add filtering to stay within free tier |
| Upstash Redis | $0 | Remove — use edge-native rate limiting |
| **TOTAL** | **$46 (base)** | **Savings: up to $44/month vs v2.1 max** |

Post-MVP potential (with Cloudflare migration):

| **TOTAL (optimized)** | **$26-31/month** |
|-|-|

---

## PART 4: CHANGE CHECKLIST

### Pre-MVP (Must Do)

- [ ] Enable Supabase PgBouncer connection pooling (P0)
- [ ] Run index audit — drop redundant and low-value indexes (P0)
- [ ] Add INDEX POLICY to architecture document (P0)
- [ ] Migrate array columns to junction tables (P1)
- [ ] Refactor Realtime to use Broadcast for POS notifications (P1)
- [ ] Evaluate Drizzle ORM — benchmark cold starts vs Prisma (P1)
- [ ] Remove Upstash Redis from architecture — implement edge rate limiting (P3)
- [ ] Remove Resend from MVP tech stack — use Supabase SMTP (P3)
- [ ] Add Sentry event filtering configuration (P3)

### Post-MVP (Month 2-3)

- [ ] Implement table partitioning for audit_logs, security_events, stock_movements (P2)
- [ ] Make customer counter updates async via trigger or materialized view (P2)
- [ ] Implement tiered PBKDF2 iterations (mobile vs desktop) (P2)
- [ ] Evaluate Cloudflare Pages migration (P3)

### Ongoing

- [ ] Monthly: Review `pg_stat_user_indexes` for unused indexes
- [ ] Monthly: Check Sentry event count (stay under 5K)
- [ ] Quarterly: Review Supabase Realtime connection count
- [ ] Quarterly: Prune unused indexes

---

## APPENDIX: Files to Update

| File | Sections Affected |
|------|-------------------|
| `F&B_CRM_Lightweight_Architecture_v2.1.md` | §2.2 (Tech Stack), §4.x (all schema sections), §5 (Architecture Improvements), §6 (Realtime), §7.3 (Offline Security), §9 (Rate Limiting), §15 (Cost) |
| `ROADMAP.md` | Add Phase 4 cost optimization milestone |
| Prisma schema / Drizzle config | ORM migration (if approved) |
| Supabase migrations | Index cleanup, junction tables, partitioning |
| Next.js middleware | Edge-native rate limiting |
| Sentry config | Event filtering |
| Supabase connection strings | PgBouncer pooler URL |

---

*This review was conducted against F&B_CRM_Lightweight_Architecture_v2.1.md (February 2026).*
*Next review recommended after MVP launch to reassess based on actual production metrics.*
