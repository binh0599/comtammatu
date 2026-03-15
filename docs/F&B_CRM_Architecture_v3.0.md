**CƠM TẤM MÁ TƯ**

**F&B SaaS Platform**

**Architecture V3.0**

*Multi-Brand SaaS Edition*

**Status:** Living Document

Version: 3.0 \| Date: March 2026 \| Author: Binh

  ----------------------- ----------------------- -----------------------
  **V1**\                 **V2** Modular Monolith **V3** SaaS Platform
  Microservices                                   

  ----------------------- ----------------------- -----------------------

**Executive Summary**

V3.0 represents a fundamental shift in the platform\'s identity: from a
single-brand restaurant management system to a **multi-brand F&B SaaS
platform** capable of serving Cơm Tấm Má Tư and any number of future F&B
brands under a single infrastructure.

  ---------------- --------------------------- ---------------------------
  **Dimension**    **V2 (Current State)**      **V3.0 (Target State)**

  Identity         Single-brand CRM            Multi-brand SaaS Platform

  Tenant model     Tenant = restaurant chain   Tenant = brand; brands have
                                               chains; chains have
                                               branches

  Revenue model    Internal tool               SaaS subscription (Starter
                                               / Growth / Enterprise)

  Compliance       **MISSING** E-invoicing,    **BUILT-IN** All Tier 1
                   VietQR, GrabFood            gaps resolved

  CI/CD            **BROKEN** Merging without  **ENFORCED** Branch
                   gates since Mar 2026        protection required before
                                               feature work

  Query strategy   **DRIFTING** Prisma +       **DECIDED** Supabase
                   PostgREST dual pattern      PostgREST as primary,
                                               Prisma for migrations only
  ---------------- --------------------------- ---------------------------

**1. Engineering Health Baseline**

*This section must be resolved BEFORE any new feature work. These are
not tech debt items --- they are blockers.*

**1.1 CI/CD Pipeline --- Fix Immediately**

  -----------------------------------------------------------------------
  **CRITICAL:** CI has been broken since early March 2026. 13 lint
  annotations and test failures are being merged to main without any
  gates. Bundle analysis, build, and Playwright E2E stages never execute.

  -----------------------------------------------------------------------

**Required actions:**

-   Enable branch protection rules on main: require all 8 CI stages to
    pass before merge.

-   Fix all 13 lint errors --- do not suppress, find root cause.

-   Re-enable Flutter CI and bring it to green.

-   Set up required status checks on GitHub: typecheck, unit-tests,
    lint, security-scan, build.

-   Add auto-cancel on outdated workflow runs to reduce queue time.

**1.2 Query Strategy Decision**

  -----------------------------------------------------------------------
  **DECIDED:** Supabase PostgREST (via supabase-js) is the primary query
  client. Prisma is retained ONLY for schema migrations (prisma migrate).
  No new Prisma Client query code.

  -----------------------------------------------------------------------

**Rationale:**

-   PostgREST already dominant in codebase (PR evidence: branches!inner
    syntax throughout).

-   PostgREST + RLS = security enforced at DB layer, not application
    layer.

-   Prisma Client in serverless = connection pool issues without extra
    Supavisor config.

-   Prisma schema (.prisma) remains the source of truth for DB
    structure; run prisma migrate for all DDL changes.

**1.3 Bus-Factor Risk**

All commits and PRs are from a single developer. For a platform of this
scope, this is a critical operational risk.

-   Document architecture decisions in ADR/ folder (Architecture
    Decision Records).

-   Every module must have a README.md explaining domain logic, not just
    setup steps.

-   Onboarding guide must enable a new developer to run the full stack
    locally within 30 minutes.

**1.4 Customer Access Gap**

  -----------------------------------------------------------------------
  **INTERIM STATE:** Customer PWA removed in PR #60. Flutter app is the
  replacement but has failing CI. No production customer-facing interface
  currently exists.

  -----------------------------------------------------------------------

-   Temporary mitigation: QR code ordering via table-scoped URL pointing
    to a simplified web ordering flow.

-   Flutter app CI must be green before any customer-facing feature is
    tested.

-   Target: Flutter app in TestFlight/Play Store internal track within 6
    weeks of CI being fixed.

**2. SaaS Platform Vision**

The platform evolves from an internal tool for Cơm Tấm Má Tư into a
**white-label F&B SaaS product** that can power any Vietnamese
restaurant brand. This is the strategic north star for V3.0.

**2.1 Hierarchy Model**

V2 treated \'tenant\' as a restaurant chain. V3.0 introduces a
four-level hierarchy:

  ------------- ------------------ ------------------ --------------------
  **Level**     **Entity**         **Example**        **Notes**

  L0            Platform           comtammatu SaaS    Single global
                                                      instance

  L1            Brand              Cơm Tấm Má Tư, Pho = SaaS customer /
                                   XYZ, BBQ ABC       tenant

  L2            Chain / Region     HCM Chain, Hanoi   Optional grouping
                                   Chain              within brand

  L3            Branch             Quan 1, Quan 7,    Operational unit
                                   Thu Duc            
  ------------- ------------------ ------------------ --------------------

  -----------------------------------------------------------------------
  **KEY CHANGE:** Every table that previously had tenant_id now maps to
  brand_id (L1). The brands table IS the tenant table. Branch-level
  queries remain unchanged --- branches.brand_id replaces
  branches.tenant_id.

  -----------------------------------------------------------------------

**2.2 Data Isolation Strategy**

Use PostgreSQL Row-Level Security (RLS) with JWT custom claims for full
brand isolation:

-   Each authenticated user carries { brand_id, user_role, branch_id? }
    in their JWT claims.

-   RLS policy: USING (brand_id = (auth.jwt() -\>\> \'brand_id\')::uuid)
    --- evaluated at DB layer, zero app-level subqueries.

-   Platform-level admin (super_admin role) bypasses RLS via SECURITY
    DEFINER functions --- never via service_role in client code.

-   Cross-brand analytics (platform dashboard) uses service_role in Edge
    Functions only, with explicit brand_id scoping in every query.

**2.3 SaaS Pricing Tiers**

  --------------- ------------------ ------------------ ------------------
  **Feature**     **Starter**        **Growth**         **Enterprise**

  Price/month     299K--499K VND     999K--1.499M VND   Custom

  Branches        1--3               4--20              Unlimited

  POS terminals   2 per branch       Unlimited          Unlimited

  E-invoicing     Included           Included           Included +
                                                        dedicated provider

  Delivery        1 platform         GrabFood +         All + Xanh SM Ngon
  integration                        ShopeeFood         

  Analytics       Basic reports      RFM + Food cost    BCG + AI
                                     AvT                forecasting

  SLA             99.5%              99.9%              99.99% + dedicated
                                                        support
  --------------- ------------------ ------------------ ------------------

**2.4 Platform Admin vs Brand Admin**

-   Platform Admin dashboard: brand management, subscription billing
    (Stripe for international or VNPay for VN), usage metrics, support
    escalation.

-   Brand Admin dashboard: branches, staff, menus, analytics --- scoped
    to their brand_id, zero visibility into other brands.

-   Super admin role stored in a separate platform_admins table, not in
    the brands auth flow.

-   Billing events trigger via Edge Function webhook from payment
    provider → update brands.subscription_status.

**2.5 White-Label Capability**

Each brand can configure their own domain, logo, color scheme, and
notification sender identity:

-   Custom domain: brand.pos.vn via Vercel custom domains API per
    deployment.

-   Zalo OA: each brand registers their own Official Account ---
    credentials stored in Vault per brand_id.

-   E-invoicing: each brand has their own provider account
    (MISA/Viettel/VNPT) with their own tax certificate.

-   Receipts, KDS tickets: brand logo + color scheme pulled from
    brands.theme_config JSONB column.

**3. Stack & Infrastructure**

**3.1 Technology Stack**

  --------------- ---------------------- ---------------------------------
  **Layer**       **Technology**         **Notes**

  Monorepo        Turborepo              Shared packages: \@repo/ui,
                                         \@repo/types, \@repo/auth

  Web apps        Next.js 15 App Router  Separate apps: admin, pos, kds,
                                         employee

  Mobile          Flutter 3.x            comtammatu-app repo ---
                                         customer + staff

  Database        Supabase PostgreSQL 15 Schema-per-module isolation

  Auth            Supabase Auth + JWT    Custom access token hook for
                  claims                 brand_id + role

  Query client    supabase-js            Prisma ONLY for migrations
                  (PostgREST)            

  Realtime        Supabase Realtime      KDS, waitlist, order status

  Edge Functions  Supabase Edge          All external webhooks + heavy
                  Functions (Deno)       operations

  Hosting         Vercel (per app)       Independent deployments per
                                         Turborepo app

  Secrets         Supabase Vault         ALL 3rd-party credentials ---
                                         never in env vars

  Scheduled jobs  pg_cron + pg_net       Analytics refresh, loyalty
                                         expiry, alerts

  POS offline     Serwist + IndexedDB    Background sync queue, conflict
                  (idb)                  resolution
  --------------- ---------------------- ---------------------------------

**3.2 Monorepo Structure**

Split route groups into independent Turborepo apps for separate
deployment cycles:

  ---------------- ----------------- ---------------------------------------
  **App /          **Vercel          **Key requirements**
  Package**        Project**         

  apps/admin       admin.pos.vn      Brand-scoped dashboard, RFM, analytics,
                                     financial reports

  apps/pos         pos.pos.vn        PWA + Serwist offline, terminal-scoped,
                                     printer config

  apps/kds         kds.pos.vn        Realtime WebSocket, station routing,
                                     sound alerts

  apps/employee    staff.pos.vn      Shift management, payroll view,
                                     schedule

  apps/platform    platform.pos.vn   NEW --- SaaS brand management, billing,
                                     usage metrics

  packages/ui      ---               Shared component library, brand theme
                                     tokens

  packages/auth    ---               JWT helpers, role guards, has_role()
                                     wrappers

  packages/types   ---               Generated from Supabase schema via
                                     supabase gen types
  ---------------- ----------------- ---------------------------------------

**3.3 Connection Pooling**

  -----------------------------------------------------------------------
  **RULE:** Always use Supavisor transaction mode (port 6543) with
  ?pgbouncer=true for all serverless/edge deployments. Set
  connection_limit=1 in any Prisma connection string for serverless.
  Direct connection (port 5432) is ONLY for prisma migrate.

  -----------------------------------------------------------------------

**3.4 Cost Estimate (Realistic)**

  -------------------------- --------------- ----------------- --------------
  **Service**                **Plan**        **USD/month**     **Notes**

  Supabase Pro               Pro + Small     \$25 + \$15 =     5--10 branches
                             Compute         \$40              

  Supabase (scale)           Pro + Medium    \$25 + \$60 =     20+ branches
                             Compute         \$85              

  Vercel Pro                 Pro (5          \$60              Per Turborepo
                             projects)                         app

  Resend (email)             Starter         \$0--\$20         3K free/mo

  Total (Phase 0)                            \$100--\$165/mo   vs \$25 in V2
  -------------------------- --------------- ----------------- --------------

**4. Multi-tenancy & Authentication**

**4.1 JWT Custom Claims (Required Upgrade)**

Current state: application-level tenant scoping via PostgREST inner
joins on branches. This requires every query to join through branches to
verify brand ownership --- unnecessary overhead.

  -----------------------------------------------------------------------
  **TARGET PATTERN:** Store brand_id + user_role (+ optional branch_id)
  directly in the Supabase JWT via a custom access token hook. RLS
  policies reference auth.jwt() directly --- zero extra table lookups.

  -----------------------------------------------------------------------

**Implementation --- custom access token hook:**

+-----------------------------------------------------------------------+
| \-- Supabase Dashboard \> Auth \> Hooks \> Custom Access Token        |
|                                                                       |
| CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event      |
| jsonb)                                                                |
|                                                                       |
| RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS \$\$               |
|                                                                       |
| DECLARE claims jsonb; user_brand_id uuid; user_role text;             |
|                                                                       |
| BEGIN                                                                 |
|                                                                       |
| claims := event -\> \'claims\';                                       |
|                                                                       |
| SELECT brand_id, role INTO user_brand_id, user_role                   |
|                                                                       |
| FROM public.brand_members WHERE user_id =                             |
| (event-\>\>\'user_id\')::uuid;                                        |
|                                                                       |
| claims := jsonb_set(claims, \'{brand_id}\',                           |
| to_jsonb(user_brand_id::text));                                       |
|                                                                       |
| claims := jsonb_set(claims, \'{user_role}\', to_jsonb(user_role));    |
|                                                                       |
| RETURN jsonb_set(event, \'{claims}\', claims);                        |
|                                                                       |
| END; \$\$;                                                            |
+-----------------------------------------------------------------------+

**RLS policy pattern:**

+-----------------------------------------------------------------------+
| CREATE POLICY \"brand_isolation\" ON orders FOR ALL TO authenticated  |
|                                                                       |
| USING (brand_id = (auth.jwt() -\>\> \'brand_id\')::uuid);             |
+-----------------------------------------------------------------------+

**4.2 RBAC Role Matrix**

  -------------- ----------------- ----------- ------------- ----------- --------------
  **Resource**   **super_admin**   **owner**   **manager**   **staff**   **customer**

  Brands         Full CRUD         Read own    Read own      ---         ---

  Branches       Full CRUD         Full CRUD   Read + Update Read only   ---

  Orders         Full CRUD         Full CRUD   Full CRUD     Create +    Read own
                                                             Read own    

  Payments       Full CRUD         Full CRUD   Read + Refund Read only   Read own

  Staff / HR     Full CRUD         Full CRUD   Read +        Read own    ---
                                               Schedule                  

  Analytics      All brands        Own brand   Own branch    ---         ---

  E-invoices     Full CRUD         Full CRUD   Read + Void   Read only   Read own
  -------------- ----------------- ----------- ------------- ----------- --------------

**5. Core Schema Fixes (V2.1 Items)**

These are carry-forward fixes from the V2 review. All are required
before production.

**5.1 tenant_id → brand_id Migration**

-   Rename tenant_id to brand_id across ALL tables in a single
    migration.

-   Update all RLS policies, FK constraints, and indexes accordingly.

-   Update JWT claims hook to emit brand_id not tenant_id.

**5.2 Schema-Per-Module**

Replace flat public namespace with module schemas for clean future
microservice extraction:

  --------------- -------------------------------------------------------
  **Schema**      **Tables**

  core            brands, branches, brand_members, profiles, audit_logs

  pos             pos_terminals, pos_sessions, printers

  orders          orders, order_items, order_status_history,
                  delivery_orders

  payments        payments, refunds, settlement_batches, payment_webhooks

  inventory       ingredients, recipes, recipe_ingredients, stock_levels,
                  stock_movements, stock_transfers, waste_logs,
                  purchase_orders

  menu            menus, menu_items, categories, menu_branch_assignments
                  (replaces UUID\[\])

  crm             customers, loyalty_tiers, loyalty_transactions,
                  campaigns, campaign_recipients, customer_segments

  hr              staff, shifts, payroll_periods, payroll_entries,
                  payroll_si_breakdown

  einvoice        NEW: einvoices, einvoice_configs, einvoice_providers

  delivery        NEW: delivery_platforms, platform_menu_mappings,
                  platform_orders
  --------------- -------------------------------------------------------

**5.3 Critical Schema Corrections**

-   menus.branches UUID\[\] → replace with menu.menu_branch_assignments
    junction table (brand_id, menu_id, branch_id, active_from,
    active_to).

-   customers: add UNIQUE(brand_id, phone) composite constraint.

-   tables, branch_zones: add denormalized brand_id column to enable
    direct RLS without JOIN.

-   stock_movements: add from_branch_id UUID and to_branch_id UUID ---
    required for inter-branch transfers.

-   orders: add source ENUM
    (\'pos\',\'app\',\'website\',\'grabfood\',\'shopeefood\',\'xanh_sm\')
    and external_order_id TEXT.

-   payments: split method vs gateway (see Section 6).

**6. Payment Architecture**

**6.1 Gateway Strategy**

  ------------- --------------- --------------- ---------------------------
  **Phase**     **Gateway**     **Methods**     **Notes**

  Phase 0       Cash (built-in) Cash            Always available, offline

  Phase 0       PayOS           VietQR bank     Zero merchant fee,
                                transfer        \@payos/node SDK, T+0
                                                settlement

  Phase 0       VNPay           Domestic card,  vnpay npm library, HMAC
                                VNPAY-QR        webhook

  Phase 3       MoMo            MoMo e-wallet   40M+ users, direct SDK

  Phase 3       ZaloPay         ZaloPay         Leverages 76M Zalo users
                                e-wallet        

  Phase 3       VNPAY SmartPOS  Physical card   Stripe Terminal equivalent
                                terminal        for VN
  ------------- --------------- --------------- ---------------------------

**6.2 Payment Schema**

Separate gateway (who processes) from method (how customer pays):

  -------------------- --------------------------------------------------------------------------------------
  **Table**            **Key columns**

  payments             id, brand_id, order_id, gateway ENUM(cash\|payos\|vnpay\|momo\|zalopay), method
                       ENUM(cash\|vietqr\|vnpay_qr\|domestic_card\|intl_card\|momo_wallet\|zalopay_wallet),
                       amount, tip, status, gateway_tx_id, gateway_payment_link_id, created_at, settled_at

  refunds              **NEW** payment_id FK, brand_id, amount, reason, approved_by FK, gateway_refund_id,
                       status ENUM(pending\|processing\|completed\|failed), created_at, completed_at

  settlement_batches   **NEW** brand_id, gateway, period_start, period_end, expected_amount, actual_amount,
                       variance, status ENUM(pending\|reconciled\|disputed), gateway_batch_id, notes

  payment_webhooks     **NEW** gateway, event_id (idempotency key), payload JSONB, processed BOOLEAN,
                       processed_at, error TEXT
  -------------------- --------------------------------------------------------------------------------------

**6.3 PayOS Edge Function Pattern**

-   create-payment-link: generates PayOS payment link with order details
    → returns QR URL to POS frontend.

-   payos-webhook: receives payment confirmation, validates HMAC
    checksum (checksumKey in Vault), stores raw payload in
    payment_webhooks for idempotency check, then updates
    payments.status.

-   Idempotency: check payment_webhooks.event_id BEFORE any DB update
    --- PayOS may send duplicate webhooks.

-   All PayOS credentials (clientId, apiKey, checksumKey) stored per
    brand_id in Supabase Vault.

**7. E-invoicing --- Decree 70/2025 Compliance**

  -----------------------------------------------------------------------
  **LEGAL REQUIREMENT:** Decree 70/2025 effective June 1, 2025. Every F&B
  business with annual revenue ≥ VND 1 billion (\~\$38,400) must issue
  e-invoices from POS connected to the General Department of Taxation
  (GDT) in real-time. This is not optional --- it is a legal requirement
  that all Vietnamese competitors already implement.

  -----------------------------------------------------------------------

**7.1 Schema**

-   einvoice.einvoice_configs: brand_id, provider
    ENUM(misa\|viettel\|vnpt\|fpt), api_endpoint, vault_secret_ref,
    digital_cert_ref, tax_code, template_code, active.

-   einvoice.einvoices: id, brand_id, branch_id, order_id, payment_id,
    invoice_number, invoice_series, xml_data TEXT, status
    ENUM(draft\|submitted\|issued\|cancelled\|error), gdt_submission_id,
    buyer_tax_code, buyer_name, buyer_email, issued_at, archived_until
    (10-year retention required).

-   einvoice.einvoice_providers: provider reference table --- API base
    URLs, format specs per provider.

**7.2 Architecture**

-   Trigger: payment status transitions to \'completed\' → pg_net calls
    Edge Function einvoice-submit.

-   Edge Function: pulls brand\'s einvoice_config from DB, retrieves API
    credentials from Vault, generates XML per GDT format, POSTs to
    provider REST API, stores response in einvoices table.

-   Provider recommendation: Viettel S-Invoice or VNPT for best API
    quality. MISA if brand already uses MISA accounting.

-   Customer delivery: invoice QR code embedded in receipt; email via
    Resend if buyer_email provided.

-   Archive: einvoices.xml_data must be retained for 10 years --- do not
    delete, only soft-cancel.

**7.3 VAT Rate**

  -----------------------------------------------------------------------
  **NOTE:** Temporary 8% VAT rate (reduced from 10%) applies to
  restaurant services through December 31, 2026. The einvoice XML must
  emit the correct rate. Plan to revert to 10% in January 2027.

  -----------------------------------------------------------------------

**8. Delivery Platform Integration**

GrabFood (36%) + ShopeeFood (56%) = 92% of Vietnam\'s \$2.8B food
delivery market. This is Tier 1 --- not optional for any restaurant
chain.

**8.1 Schema Additions**

-   delivery.delivery_platforms: platform
    ENUM(grabfood\|shopeefood\|xanh_sm), brand_id, branch_id,
    platform_store_id, platform_menu_id, active, credentials_vault_ref.

-   delivery.platform_menu_mappings: internal menu_item_id ↔
    platform_item_id --- required because platform item IDs differ from
    internal IDs.

-   orders.orders: add source ENUM + external_order_id + platform_fee +
    commission_amount + commission_pct.

-   delivery.delivery_orders: add platform_source, platform_order_id,
    commission_amount, platform_fee, driver_assigned_at.

**8.2 Architecture**

  -------------------- -------------------------------------------------------
  **Component**        **Responsibility**

  grabfood-webhook     Receives GrabFood order push, validates signature,
  (Edge Function)      normalizes to internal orders schema, creates order +
                       order_items + delivery_orders, returns 200 ACK within
                       5s (GrabFood requires this)

  shopeefood-webhook   Same pattern as GrabFood --- separate function because
  (Edge Function)      APIs differ. ShopeeFood has different auth (HMAC SHA256
                       vs GrabFood JWT).

  menu-sync (Scheduled Runs on pg_cron daily at 3AM: reads active menu items,
  Edge Function)       transforms to platform format, PUTs to
                       GrabFood/ShopeeFood menu API. Manual trigger available
                       from admin UI.

  order-status-push    When orders.status changes → pg_net calls Edge Function
  (DB trigger)         that pushes status update back to delivery platform
                       (e.g., READY_FOR_PICKUP signal to GrabFood driver app).
  -------------------- -------------------------------------------------------

  -----------------------------------------------------------------------
  **IMPORTANT:** No Vietnamese middleware aggregator exists. Sapo FnB\'s
  model of direct integration with each platform is the proven approach.
  Two separate webhook handlers + shared order normalization layer is the
  correct architecture.

  -----------------------------------------------------------------------

**9. Zalo OA / ZNS Integration**

77 million MAU --- 87% of Vietnamese smartphone users. Unlike Facebook,
Zalo OA messages have near-100% visibility. ZNS (Zalo Notification
Service) delivers transactional messages in under 1 second.

**9.1 Schema Additions**

-   crm.zalo_oa_configs: brand_id, oa_id, vault_secret_ref
    (access_token), webhook_secret, active.

-   crm.zalo_message_templates: brand_id, template_id (Zalo-assigned),
    template_name, template_type
    ENUM(order_confirm\|loyalty_update\|promo\|win_back\|birthday),
    params_schema JSONB, pre_approved BOOLEAN. Templates must be
    pre-approved by Zalo before use.

-   crm.zalo_followers: brand_id, customer_id FK, zalo_user_id,
    followed_at, unfollow_at --- follower-to-customer mapping.

-   crm.campaigns: add channel ENUM update to include \'zalo\' alongside
    \'email\', \'sms\', \'push\'.

**9.2 Architecture**

-   OAuth2 flow: Zalo OA uses OAuth2. Access tokens expire --- implement
    auto-refresh via Edge Function zalo-token-refresh (pg_cron every
    12h, stores new token in Vault).

-   zalo-webhook Edge Function: receives Zalo OA events (new follower,
    message received, user unfollow) → updates crm.zalo_followers +
    triggers customer profile enrichment.

-   send-zalo-notification Edge Function: called by pg_cron campaign
    jobs or post-payment trigger. Fetches template_id from
    zalo_message_templates, constructs ZNS payload, POSTs to Zalo ZNS
    API.

-   Zalo Mini App (Phase 3): customer ordering + loyalty tracking within
    Zalo ecosystem. Separate mini app project using Zalo Mini App SDK.

**9.3 Use Cases by Priority**

  -------------- ---------------- ----------------------------------------
  **Priority**   **Use Case**     **Template Type**

  P0 --- Now     Order            order_confirm --- sent post-payment via
                 confirmation     ZNS

  P0 --- Now     Loyalty points   loyalty_update --- sent after order
                 earned           closed

  P1 --- 3       Win-back         win_back --- customers not seen in
  months         campaign         30/60/90 days (RFM)

  P1 --- 3       Birthday offer   birthday --- triggered by pg_cron daily
  months                          

  P2 --- 6       Promotional      promo --- manual send from admin
  months         campaigns        campaign builder
  -------------- ---------------- ----------------------------------------

**10. POS Offline-First Architecture**

  -----------------------------------------------------------------------
  **CONTEXT:** Vietnamese restaurant environments have unstable internet
  --- 3G/4G dropouts, shared WiFi overload during peak hours. The POS
  must operate fully during connectivity loss and sync cleanly on
  reconnect.

  -----------------------------------------------------------------------

**10.1 Technology Stack**

-   Service Worker: Serwist (successor to next-pwa) --- handles caching
    strategy and background sync registration.

-   Local storage: IndexedDB via idb library --- stores pending orders,
    menu cache, customer cache.

-   Sync queue: IDB object store \'sync_queue\' --- each pending
    mutation stored with { id, operation, payload, created_at, attempts
    }.

-   Background Sync API:
    navigator.serviceWorker.sync.register(\'process-queue\') triggers
    when connectivity returns.

**10.2 Offline Capability by Terminal Type**

  ------------------ -------------------------- --------------------------
  **Feature**        **mobile_order (waiter)**  **cashier_station
                                                (cashier)**

  View menu          Cached, available offline  Cached, available offline

  Create order       Queued locally, syncs on   Queued locally, syncs on
                     reconnect                  reconnect

  Process payment    NOT ALLOWED (no payment    Cash only while offline
                     access)                    

  Print receipt      ---                        Local printer, queued if
                                                USB unavailable

  View past orders   Last 24h cached            Last 48h cached, reconcile
                                                on shift close

  E-invoice          ---                        Queued, submitted on
                                                reconnect
  ------------------ -------------------------- --------------------------

**10.3 Conflict Resolution**

-   Strategy: last-write-wins based on modified_at timestamp +
    terminal_id to detect source.

-   On sync, server compares incoming modified_at vs current DB value
    --- newer wins, older discarded.

-   Multi-terminal conflict (two waiters modify same table order):
    server detects via version column (optimistic concurrency) ---
    second write gets 409 Conflict → client re-fetches and prompts staff
    to re-apply change.

-   Cash payments taken offline: flagged with reconciled = false until
    pos_session close confirms cash amount.

**11. Analytics Layer**

All analytics implemented as PostgreSQL materialized views refreshed by
pg_cron. No separate analytics service required.

**11.1 Materialized Views --- Priority Order**

  ------------------------- --------------- --------------- -------------------------------
  **View**                  **Refresh**     **Tier**        **Description**

  daily_branch_financials   Every 15 min    **Tier 1**      Revenue, order count, avg
                            (peak), hourly                  ticket, payment mix per
                            (off-peak)                      branch/day

  customer_rfm_scores       Hourly          **Tier 2**      Recency / Frequency / Monetary
                                                            scores 1-5, segment label

  food_cost_avt             Daily 3AM       **Tier 2**      Theoretical vs actual food cost
                                                            per item + per branch

  labor_cost_metrics        Daily 3AM       **Tier 2**      Labor cost %, SPLH, prime cost
                                                            per shift/branch

  menu_bcg_matrix           Daily 5AM       **Tier 3**      Stars/Plowhorses/Puzzles/Dogs
                                                            classification by item

  delivery_platform_perf    Hourly          **Tier 1**      Orders/GMV per platform,
                                                            commission cost, net revenue
  ------------------------- --------------- --------------- -------------------------------

  -----------------------------------------------------------------------
  **RULE:** Always create UNIQUE INDEX on materialized views to enable
  REFRESH MATERIALIZED VIEW CONCURRENTLY --- allows reads during refresh
  without blocking the dashboard.

  -----------------------------------------------------------------------

**11.2 RFM Segmentation**

-   Scores 1--5 on Recency (days since last order), Frequency (orders
    per 90 days), Monetary (total spend).

-   Segments: Champions (R5+F5+M5), Loyal (R3+), Promising (new, high
    frequency), At Risk (R1--2), Lost (R1+F1+M1).

-   Automated campaign triggers via pg_cron: win-back for At Risk (30
    days no visit) → Zalo ZNS template win_back.

-   Research benchmark: RFM-targeted campaigns yield up to 77% ROI
    improvement vs blanket promotions.

**11.3 Theoretical vs Actual Food Cost**

-   Theoretical cost = SUM(recipe_ingredients.quantity ×
    ingredients.cost_price) per order_item × units_sold.

-   Actual cost = beginning_inventory + purchases (from purchase_orders)
    − ending_inventory (from stock_counts).

-   Variance = actual − theoretical. Positive variance =
    waste/theft/over-portioning.

-   Restaurant365 benchmark: identifying AvT variance cut COGS 4--5% per
    store, saving \$600K per restaurant group.

**11.4 BCG Menu Matrix (Tier 3)**

-   Popularity axis: order_items count per menu_item over trailing 30
    days vs. category median.

-   Profitability axis: (selling_price − theoretical_food_cost) /
    selling_price = contribution margin %.

-   Classification: Stars (above median both) → promote. Plowhorses
    (popular, low margin) → optimize recipe cost. Puzzles (high margin,
    low volume) → reposition/market. Dogs (both below) → retire or
    reprice.

-   Cornell research: up to 15% profit improvement through menu
    engineering. No Vietnamese competitor offers this.

**12. Compliance --- Tax & Payroll**

**12.1 Social Insurance (2024 Law --- Effective July 2025)**

  ---------------------- ---------------- ---------------- ---------------
  **Contribution**       **Employer %**   **Employee %**   **Notes**

  Social Insurance (SI)  17.5%            8%               

  Health Insurance (HI)  3%               1.5%             

  Unemployment Insurance 1%               1%               
  (UI)                                                     

  Trade Union            2%               ---              

  TOTAL employer burden  23.5%            10.5%            Per gross
                                                           salary
  ---------------------- ---------------- ---------------- ---------------

  -----------------------------------------------------------------------
  **2024 LAW CHANGE:** Social Insurance Law 2024 (effective July 1, 2025)
  expands SI coverage to part-time workers and short-term contracts. F&B
  businesses with high part-time staff must now track and contribute SI
  for all staff working ≥ 14 hours/week.

  -----------------------------------------------------------------------

-   Schema update: hr.payroll_entries.deductions should be replaced with
    hr.payroll_si_breakdown table: (payroll_entry_id, si_employer,
    si_employee, hi_employer, hi_employee, ui_employer, ui_employee,
    trade_union, gross_salary, net_salary).

-   part_time BOOLEAN column on staff table --- determines if new SI law
    applies.

**12.2 VAT Rate**

-   Current rate: 8% (reduced from standard 10%) for restaurant services
    --- valid through December 31, 2026.

-   Plan reversion to 10% on January 1, 2027 --- store VAT rate in
    brands.vat_rate DECIMAL(4,2) so it\'s configurable per brand without
    code deployment.

-   E-invoices must emit correct VAT rate --- critical for GDT
    compliance audit trail.

**13. Roadmap**

**13.1 Pre-Sprint 0 --- Engineering Health (Week 1--2)**

  -----------------------------------------------------------------------
  **MANDATORY:** No feature sprints begin until CI is green and these
  items are resolved. This is the foundation everything else depends on.

  -----------------------------------------------------------------------

1.  Fix CI/CD: enable branch protection, fix all 13 lint errors, restore
    Flutter CI.

2.  Decide and document query strategy: supabase-js primary, Prisma for
    migrations only.

3.  Centralize role-to-route mapping into a single \@repo/auth config
    file.

4.  Rename tenant_id → brand_id across entire schema in one migration.

5.  Implement JWT custom claims hook (Section 4.1).

**13.2 Tier 1 --- Compliance & Revenue Gates (0--3 months)**

  -------- ------------------------ --------------- ---------------------------
  **\#**   **Feature**              **Sprint**      **Blocks**

  1        PayOS / VietQR           Sprint 1 (Week  Revenue --- zero-fee
           integration              3--4)           payment acceptance

  2        E-invoicing Decree       Sprint 1 (Week  Legal operation in Vietnam
           70/2025                  3--4)           

  3        Refunds +                Sprint 1        Payment reconciliation
           settlement_batches                       
           tables                                   

  4        VNPay card aggregator    Sprint 2 (Week  Card payment acceptance
                                    5--6)           

  5        GrabFood webhook         Sprint 2 (Week  36% of Vietnam delivery
           integration              5--6)           volume

  6        ShopeeFood webhook       Sprint 3 (Week  56% of Vietnam delivery
           integration              7--8)           volume

  7        Zalo OA / ZNS order      Sprint 3 (Week  Primary customer channel,
           notifications            7--8)           77M MAU

  8        POS offline-first        Sprint 4 (Week  Unstable internet
           (Serwist + IndexedDB)    9--10)          resilience

  9        Schema-per-module        Sprint 4 (Week  Microservice extraction
           migration                9--10)          path

  10       Flutter app CI green +   Sprint 4 (Week  Customer access gap closure
           TestFlight               9--10)          

  11       SaaS: Brand onboarding + Sprint 5 (Week  First external SaaS
           billing                  11--12)         customer
  -------- ------------------------ --------------- ---------------------------

**13.3 Tier 2 --- Competitive Parity (3--6 months)**

-   Reservation + waitlist system (reservations, waitlist_entries
    tables + Realtime display).

-   RFM segmentation materialized view + automated Zalo campaign
    triggers.

-   Financial reporting: daily_branch_financials, labor_cost_metrics,
    food_cost_avt materialized views.

-   Inter-branch stock transfer workflow (stock_transfers table +
    approval flow).

-   MoMo + ZaloPay e-wallet integration (Phase 3 payment gateways).

-   Payroll SI breakdown restructure + part-time SI compliance.

-   Multi-brand admin: platform dashboard for SaaS brand management.

**13.4 Tier 3 --- Differentiation (6--24 months)**

-   BCG menu matrix (materialized view + interactive admin dashboard).

-   AI demand forecasting (Edge Function → ML inference,
    demand_forecasts table).

-   Dynamic pricing: ingredient-cost-driven + daypart promotions
    (subtle, not surge pricing).

-   Staff analytics: SPLH, upsell tracking, avg ticket per server,
    scheduling optimization.

-   Zalo Mini App: in-app ordering + loyalty (separate Zalo Mini App SDK
    project).

-   VNPAY SmartPOS hardware integration for physical card terminal.

-   SevenRooms-style guest CRM: auto-tagging, preference tracking,
    AI-assisted seating.

**14. Migration Path from V2**

This section documents the ordered steps to move from the current V2
state to V3.0 without breaking production.

**14.1 Non-Breaking First**

-   All schema additions (new tables, new columns) are
    backward-compatible --- run these first.

-   Add brand_id as a column alias: CREATE VIEW brand_tenants AS SELECT
    id AS brand_id, \* FROM tenants.

-   New tables (refunds, settlement_batches, einvoices, etc.) can be
    added in any sprint without affecting existing queries.

**14.2 Breaking Changes --- Plan Carefully**

-   tenant_id → brand_id rename: single migration, run in off-peak
    hours, update all application code in same PR.

-   menus.branches UUID\[\] → junction table: requires data migration
    script to convert array values to rows.

-   public → schema-per-module: move tables in batches, update
    supabase-js client calls one schema at a time. Use search_path to
    maintain backward compat during transition.

**14.3 Microservice Extraction Triggers**

  --------------------- --------------- ----------------------------------
  **Trigger Condition** **Extract       **Notes**
                        Service**       

  \> 500 orders/day     Payment Service First extraction --- PCI scope
                                        isolation

  \> 1000 concurrent    Auth Service    JWT validation bottleneck
  users                                 

  \> 50 branches        Orders + KDS    Realtime WebSocket scaling
                        Service         

  \> 10 brands (SaaS)   Separate DB per Move from shared DB to per-brand
                        brand           Supabase projects
  --------------------- --------------- ----------------------------------

**15. Conclusion & Decision Summary**

  ------------------------ ----------------------------------------------
  **Decision**             **Resolution**

  Platform identity        Multi-brand SaaS --- comtammatu becomes the
                           platform, brands are tenants

  Tenant model             Platform \> Brand \> Chain \> Branch (4-level
                           hierarchy)

  Query strategy           supabase-js primary; Prisma for migrations
                           only

  Auth pattern             JWT custom claims: brand_id + user_role in
                           every token

  CI/CD                    Fix before any feature work --- branch
                           protection enforced

  Primary payment          PayOS (VietQR, zero fee) + VNPay (cards) in
                           Phase 0

  E-invoicing              Viettel S-Invoice or VNPT --- Edge Function
                           pattern, 10yr archive

  Delivery                 Direct GrabFood + ShopeeFood webhooks --- no
                           middleware aggregator

  Customer channel         Zalo OA + ZNS as primary (77M MAU); Flutter
                           app as secondary

  Analytics                PostgreSQL materialized views + pg_cron --- no
                           separate analytics service

  Differentiation          BCG matrix + food cost AvT + RFM --- no
                           Vietnamese competitor offers these
  ------------------------ ----------------------------------------------

*The Vietnamese F&B tech market is compliance-driven first,
feature-driven second.*

**Fix CI. Ship e-invoicing. Then build the intelligence layer no
competitor has.**