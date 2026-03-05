# Mobile App Plan — Com Tam Ma Tu F&B CRM

> Native iOS (Swift/SwiftUI) + Android (Kotlin/Jetpack Compose)
> Target: All 4 audiences (Customer, Staff POS, KDS Kitchen, Management)
> Offline-first for staff operations

---

## Context

The Com Tam Ma Tu system currently runs as a Next.js web application with Supabase backend. All business logic lives in Next.js Server Actions (not REST APIs), which are inaccessible from native mobile apps. The system serves 4 audiences (Customer, Staff/POS, KDS/Kitchen, Management) through web route groups. This plan introduces native iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose) apps with offline-first capability, requiring a new API layer since Server Actions can't be called from native clients.

### Current System Summary
- **Backend:** Next.js 16.1 + Supabase (project `zrlriuednoaqrsvnjjyo`) + Prisma 7.2
- **Auth:** Supabase Auth with cookie-based sessions (web-only)
- **Realtime:** Supabase postgres_changes + broadcast for orders, tables, KDS tickets
- **Hosting:** Vercel (comtammatu.vercel.app)
- **Roles:** owner > manager > cashier > chef > waiter > inventory > hr > customer
- **Order flow:** Waiter creates -> KDS receives (realtime) -> Chef bumps ready -> Cashier pays -> completed
- **Existing REST endpoints:** `/api/health`, `/api/auth/callback`, `/api/privacy/*`, `/api/webhooks/momo` (everything else is Server Actions)
- **Shared package:** 14 Zod schema files, status constants, Vietnamese formatters

---

## 1. Architecture Decision: Single App vs Multiple Apps

**Recommendation: Single app per platform, role-based navigation.**

| Approach | Pros | Cons |
|----------|------|------|
| Single app | Shared auth, one install, role switching | Larger binary |
| 4 separate apps | Smaller, focused | Auth duplication, staff needs 2-3 apps |

Staff members often hold multiple roles (waiter + cashier). A single app with role-based tab navigation avoids friction. The KDS module can be conditionally loaded only on tablet-sized devices.

### App Module Structure
```
ComTamMaTu/
  Core/           -- Auth, networking, offline sync, DI
  Features/
    Customer/     -- Menu, orders, loyalty, feedback
    POS/          -- Waiter ordering, table management
    Cashier/      -- Payment processing, session management
    KDS/          -- Kitchen display, ticket bumping
    Management/   -- Dashboard, reports, staff management
  Shared/         -- Models, utilities, design system
```

---

## 2. API Layer Strategy

### Problem
Current backend uses Next.js Server Actions — not callable from native apps. Only existing REST endpoints are `/api/health`, `/api/auth/callback`, `/api/privacy/*`, `/api/webhooks/momo`.

### Recommendation: Supabase Edge Functions + Direct Supabase Client SDK

| Layer | Purpose |
|-------|---------|
| **Supabase Client SDK** (supabase-swift / supabase-kt) | Auth, realtime subscriptions, simple CRUD reads |
| **Supabase Edge Functions** (Deno/TypeScript) | Complex business logic (order creation, payment processing, stock deduction) |
| **Existing RLS policies** | Security — same policies protect both web and mobile |

**Why not a separate REST API?**
- Supabase RLS already secures data access
- Edge Functions reuse existing TypeScript validation (Zod schemas from `@comtammatu/shared`)
- Avoids maintaining a separate API server
- Realtime subscriptions work natively via Supabase client SDKs

### Edge Functions to Create

| Function | Mirrors Server Action | Purpose |
|----------|----------------------|---------|
| `create-order` | `(pos)/pos/orders/actions.ts:createOrder` | Order creation with validation |
| `update-order-status` | `(pos)/pos/orders/actions.ts:updateOrderStatus` | Status transitions |
| `process-payment` | `(pos)/pos/cashier/actions.ts:processPayment` | Payment (cashier_station only) |
| `bump-kds-ticket` | `(kds)/kds/actions.ts:bumpTicket` | KDS ticket status update |
| `open-session` / `close-session` | POS session management | Shift management |
| `customer-register` | Customer self-registration | Customer onboarding |
| `submit-feedback` | Feedback submission | Post-order feedback |
| `redeem-voucher` | Voucher application | Loyalty redemption |
| `sync-offline-queue` | New | Batch process offline mutations |

### Direct SDK Reads (no Edge Function needed — RLS handles security)
- Menu items/categories (public read)
- Order history (filtered by user via RLS)
- Table status (branch-scoped)
- KDS tickets (branch-scoped)
- Loyalty balance/transactions
- Dashboard aggregates (via DB views/functions)

---

## 3. Offline-First Strategy

### Architecture: Local DB + Sync Queue

```
[Native App]
  |-> Local Database (SQLite via Swift Data / Room)
  |-> Sync Queue (pending mutations)
  |-> Conflict Resolver
  |-> Supabase Client (when online)
```

### What Works Offline

| Feature | Offline Capability | Sync Strategy |
|---------|-------------------|---------------|
| **Menu browsing** | Full (cached) | Pull on app open, TTL 1 hour |
| **Order creation (waiter)** | Full | Queue + sync when online |
| **Table status view** | Cached snapshot | Realtime when online |
| **KDS ticket view** | Cached snapshot | Realtime when online |
| **KDS bump** | Queue locally | Sync when online |
| **Payment processing** | NO — requires online | Show "offline" warning |
| **Loyalty/points** | Read cached | Write requires online |
| **Dashboard/reports** | Cached last fetch | Requires online for fresh data |
| **Customer registration** | Queue locally | Sync when online |

### Offline Order Creation Flow
1. Waiter creates order offline -> saved to local SQLite with `sync_status = "pending"`
2. Local order gets a temporary UUID (not server-generated order number)
3. When connectivity returns, sync queue sends to `create-order` Edge Function
4. Server returns real `order_number` (from `generate_order_number()` DB function)
5. Local record updated with server ID + order number
6. If conflict (e.g., table occupied by another offline order): server rejects, app shows resolution UI

### Conflict Resolution Rules
- **Last-write-wins** for table status changes
- **Server-authoritative** for order numbers, payment status, stock levels
- **Reject + notify** for duplicate table assignments
- **Merge** for KDS ticket bumps (idempotent operation)

### Local Database Schema (simplified)
Mirror key tables locally with added `sync_status` and `last_synced_at` columns:
- `local_menu_items`, `local_menu_categories`
- `local_orders`, `local_order_items`
- `local_tables`
- `local_kds_tickets`
- `local_sync_queue` (pending mutations)

---

## 4. Feature Modules

### 4.1 Customer Module
**Screens:** Home, Menu Browser, Order History, Loyalty Dashboard, Account, Feedback Form, Notifications

**Key behaviors:**
- Menu browsing works offline (cached)
- Order placement requires online (for payment/availability check)
- Push notifications for order status changes
- Loyalty points display (cached, refresh on open)
- QR code scan to link to dine-in table

**Reuse from web:** Menu browser UI patterns from `(customer)/customer/menu/menu-browser.tsx`, loyalty dashboard from `(customer)/customer/loyalty/loyalty-dashboard.tsx`

### 4.2 Staff POS Module (Waiter)
**Screens:** Table Grid, Menu Selector + Cart, Order Confirmation, Active Orders List

**Key behaviors:**
- Offline order creation (core requirement)
- Table grid with realtime status (green/red/yellow)
- Menu search with category filters
- Cart with modifiers and notes
- Order queue with status badges

**Reuse from web:** Order flow from `(pos)/pos/orders/actions.ts`, table grid patterns, cart drawer logic

### 4.3 Cashier Module
**Screens:** Order Queue (pending payment), Payment Screen, Session Open/Close, Daily Summary

**Key behaviors:**
- Payment ALWAYS requires online (hard constraint: PAYMENT_TERMINAL rule)
- Cash payment with change calculator
- Momo/VNPay integration (QR display)
- Voucher redemption
- Session reconciliation

**Reuse from web:** Payment logic from `(pos)/pos/cashier/actions.ts`, session management

### 4.4 KDS Module (Kitchen)
**Screens:** Ticket Board (full screen), Station Config

**Key behaviors:**
- Optimized for tablets (landscape)
- Realtime ticket feed via Supabase postgres_changes
- Bump button (mark ready) — works offline (queued)
- Color-coded timing (green < 10min, yellow < 15min, red > 15min)
- Audio alert on new ticket
- Dark theme default

**Reuse from web:** KDS board patterns from `(kds)/kds/[stationId]/`

### 4.5 Management Module
**Screens:** Dashboard (charts), Branch Selector, Staff List, Inventory Overview, Reports

**Key behaviors:**
- Requires online for fresh data
- Cached dashboard for quick glance
- Key metrics: revenue, order count, avg prep time, popular items
- Staff schedule overview
- Low stock alerts

---

## 5. Authentication

### Flow
```
App Launch -> Check stored session -> Valid? -> Home
                                   -> Expired? -> Refresh token
                                   -> No session? -> Login screen
```

- Use Supabase Auth native SDKs (`supabase-swift`, `supabase-kt`)
- Token-based auth (JWT), NOT cookie-based (web-only)
- Tokens stored in iOS Keychain / Android EncryptedSharedPreferences
- Role extracted from JWT claims (via `profiles` table trigger that sets role in `raw_app_meta_data`)
- Auto-refresh before expiry

### Device Registration
Existing device approval flow (`registered_devices` table) applies:
1. App generates device fingerprint on first login
2. Submits fingerprint + device info to `registered_devices`
3. Owner/manager approves in admin panel (existing web UI)
4. Until approved, staff app shows "Pending Approval" screen

---

## 6. Push Notifications

### Infrastructure
- **iOS:** APNs via Supabase Edge Function + apple-push-notification library
- **Android:** FCM via Supabase Edge Function

### Notification Types

| Event | Recipients | Priority |
|-------|-----------|----------|
| New order -> KDS | Chef (KDS station) | High |
| Order ready | Waiter who created order | High |
| Payment completed | Customer | Normal |
| Order status change | Customer | Normal |
| Low stock alert | Manager, Inventory | Normal |
| Shift reminder | Assigned staff | Normal |
| Loyalty tier upgrade | Customer | Normal |
| Device approved | Staff member | Normal |

### Implementation
- Store FCM/APNs tokens in new `device_push_tokens` table
- Supabase Database Webhooks trigger Edge Functions on relevant table changes
- Edge Functions send push via FCM/APNs APIs

---

## 7. Security

- **Certificate pinning** for Supabase API endpoints
- **JWT token** storage in secure enclave (Keychain/EncryptedSharedPreferences)
- **RLS** provides server-side security (same policies as web)
- **Input validation** — port Zod schemas to Swift Codable / Kotlin data classes with validation
- **PAYMENT_TERMINAL rule** enforced server-side in Edge Functions (same as Server Actions)
- **Biometric unlock** option for returning to app (Face ID / fingerprint)
- **Session timeout** — auto-lock after 15 min inactivity for staff roles
- **No card data stored locally** (PCI DSS SAQ A compliance maintained)

---

## 8. Shared Code Strategy (iOS + Android)

Since native (not cross-platform), code sharing is limited. Minimize duplication via:

| Concern | Strategy |
|---------|----------|
| Data models | Generate from Supabase types (both platforms) |
| Validation rules | Port `@comtammatu/shared/constants.ts` status arrays and transitions |
| API contracts | Shared OpenAPI spec from Edge Functions |
| UI patterns | Platform-specific but same UX flows |
| Offline sync | Same algorithm, platform-specific implementation |

### Model Generation
Use `supabase gen types swift` and `supabase gen types kotlin` (or manual mapping from `database.types.ts`) to keep models in sync with DB schema.

---

## 9. Repository Structure

Add to existing monorepo:
```
apps/
  ios/                          -- Xcode project
    ComTamMaTu/
      App/                      -- App entry, DI container
      Core/
        Auth/                   -- Supabase auth wrapper
        Network/                -- Supabase client, Edge Function calls
        Offline/                -- SQLite sync engine
        Push/                   -- APNs registration
      Features/
        Customer/               -- Views, ViewModels
        POS/
        Cashier/
        KDS/
        Management/
      Shared/
        Models/                 -- Generated from Supabase types
        Constants/              -- Ported from @comtammatu/shared
        DesignSystem/           -- Colors, typography, components
      Resources/                -- Assets, localizations (vi, en)

  android/                      -- Gradle project
    app/src/main/
      java/com/comtammatu/
        app/                    -- Application, DI (Hilt)
        core/
          auth/
          network/
          offline/              -- Room DB, sync engine
          push/                 -- FCM registration
        features/
          customer/
          pos/
          cashier/
          kds/
          management/
        shared/
          models/
          constants/
          designsystem/

supabase/functions/             -- Edge Functions (shared backend)
  create-order/
  update-order-status/
  process-payment/
  bump-kds-ticket/
  sync-offline-queue/
  ...
```

---

## 10. Development Phases

### Phase 1: Foundation (Weeks 1-4)
- Project setup (Xcode + Android Studio projects in monorepo)
- Supabase client SDK integration (auth, basic CRUD)
- Core networking layer + Edge Functions for order CRUD
- Data model generation from Supabase types
- Design system (colors, typography, components matching web theme)
- Login/auth flow with device registration
- **Deliverable:** Staff can log in, see menu, create basic order (online only)

### Phase 2: Staff POS + KDS (Weeks 5-8)
- Table grid with realtime status
- Full order creation flow (menu -> cart -> confirm)
- KDS board with realtime tickets + bump
- Cashier payment screen (cash + Momo)
- POS session management (open/close shift)
- **Deliverable:** Full POS flow works online (waiter -> kitchen -> cashier)

### Phase 3: Offline Engine (Weeks 9-12)
- Local SQLite/Room database setup
- Sync queue implementation
- Offline order creation
- Offline KDS bump
- Conflict resolution
- Background sync service
- **Deliverable:** Staff can take orders without internet, sync when back online

### Phase 4: Customer App (Weeks 13-15)
- Menu browsing (cached)
- Customer registration + login
- Order history
- Loyalty dashboard + voucher redemption
- Feedback submission
- **Deliverable:** Customer-facing app feature-complete

### Phase 5: Management + Push (Weeks 16-18)
- Dashboard with charts
- Push notification infrastructure (FCM + APNs)
- All notification types implemented
- Staff management views
- Inventory overview
- **Deliverable:** Management module + push notifications live

### Phase 6: Polish + Release (Weeks 19-20)
- Performance optimization
- Accessibility (VoiceOver/TalkBack)
- Localization (Vietnamese primary, English secondary)
- App Store / Play Store submission
- Beta testing via TestFlight / Play Console internal track
- **Deliverable:** Production release

---

## 11. Infrastructure & CI/CD

| Concern | Tool |
|---------|------|
| iOS CI | GitHub Actions + Fastlane (build, test, deploy to TestFlight) |
| Android CI | GitHub Actions + Gradle (build, test, deploy to Play Console) |
| Code signing | Match (iOS) / Play App Signing (Android) |
| Crash reporting | Firebase Crashlytics (both platforms) |
| Analytics | Firebase Analytics or Mixpanel |
| Beta distribution | TestFlight (iOS) + Firebase App Distribution (Android) |
| Edge Functions deploy | `supabase functions deploy` in CI |

---

## 12. Database Changes Required

### New Tables (via Supabase migration)

```sql
-- Push notification tokens
CREATE TABLE device_push_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  profile_id BIGINT NOT NULL REFERENCES profiles(id),
  device_id TEXT NOT NULL,          -- from registered_devices
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  push_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id, tenant_id)
);

-- RLS: users can manage their own tokens
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON device_push_tokens
  FOR ALL
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));
```

### Edge Functions Deployment
- New `supabase/functions/` directory with shared utilities
- Each function validates JWT, extracts tenant/branch context
- Reuses Zod schemas from `@comtammatu/shared` (imported via Deno)

---

## 13. Key Files to Reference

| File | Relevance |
|------|-----------|
| `packages/shared/src/constants.ts` | All enums, roles, status transitions — must port to Swift/Kotlin |
| `packages/shared/src/schemas/*.ts` | 14 Zod schema files — validation rules to replicate |
| `apps/web/app/(pos)/pos/orders/actions.ts` | Order creation logic — replicate in Edge Functions |
| `apps/web/app/(pos)/pos/cashier/actions.ts` | Payment logic — replicate in Edge Functions |
| `apps/web/app/(kds)/kds/[stationId]/` | KDS board patterns |
| `apps/web/app/(customer)/customer/` | Customer feature reference |
| `packages/database/src/types/database.types.ts` | Source of truth for type generation |
| `supabase/migrations/` | All 5 migrations — understand full schema |

---

## 14. Verification Plan

1. **Edge Functions:** Deploy to Supabase, test each endpoint with curl/Postman against staging
2. **Auth flow:** Verify login -> token -> profile fetch -> role routing on both platforms
3. **Online CRUD:** Create order on mobile -> verify appears in web POS + KDS
4. **Realtime:** Place order on web -> verify mobile KDS receives ticket within 2s
5. **Offline:** Enable airplane mode -> create order -> disable airplane mode -> verify sync
6. **Push:** Trigger order status change -> verify notification received
7. **Security:** Attempt cross-tenant data access -> verify RLS blocks it
8. **Payment:** Verify only cashier_station terminals can process payment (server-side check)

---

## 15. Team Recommendation

| Role | Count | Focus |
|------|-------|-------|
| iOS Developer (Swift/SwiftUI) | 1-2 | iOS app |
| Android Developer (Kotlin/Compose) | 1-2 | Android app |
| Backend Developer (TypeScript) | 1 | Edge Functions, push notification infra |
| UI/UX Designer | 1 | Mobile design system, flows |
| QA | 1 | Cross-platform testing, offline scenarios |

**Total: 5-7 people, ~20 weeks to production release.**

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase native SDKs less mature than JS SDK | Medium | Pin SDK versions, contribute upstream fixes |
| Offline sync complexity | High | Start with simple queue, iterate on conflict resolution |
| Dual codebase maintenance (iOS + Android) | High | Shared Edge Functions reduce backend duplication |
| App Store review delays | Medium | Submit early with minimal MVP, iterate |
| Realtime connection stability on mobile | Medium | Implement reconnection logic with exponential backoff |
| Large app size (all modules in one app) | Low | Lazy-load feature modules, on-demand resources |

---

## Next Steps

1. Review and optimize this plan (identify areas to simplify or cut)
2. Design UI/UX wireframes for key flows (order creation, KDS board, customer menu)
3. Set up Edge Functions infrastructure (prerequisite for any mobile work)
4. Begin Phase 1: Foundation for one platform first (recommend iOS or Android, not both simultaneously)
