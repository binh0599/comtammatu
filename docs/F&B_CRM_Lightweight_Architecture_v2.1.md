# F&B CRM SYSTEM

## Lightweight Architecture for Small Chain (5-10 Branches)

**Version 2.1 — Security-Hardened & Production-Ready Edition**
February 2026

Next.js 16.1 | Supabase | Vercel | GitHub Actions
Est. Monthly Cost: $45-120/month (vs $1,800-3,000 Enterprise)

**Changes from v2.0:**

- All PostgreSQL best practices applied (BIGINT GENERATED ALWAYS AS IDENTITY, TEXT, TIMESTAMPTZ, NUMERIC, CHECK constraints, FK indexes)
- 15 database schema corrections from PostgreSQL review
- 14 security & compliance fixes from security audit
- PCI DSS payment compliance framework added
- GDPR data retention & right-to-erasure implemented
- API rate limiting & DDoS protection documented
- Secrets rotation & key management strategy defined
- Offline encryption hardened (PBKDF2 600K iterations / Argon2id)
- Supply chain security (SBOM, dependency scanning, pinned actions)
- RLS policy validation test framework

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure-modular-monolith)
4. [Database Design](#4-database-design-supabase-postgresql)
5. [Key Architecture Improvements](#5-key-architecture-improvements-from-v1-review)
6. [Real-time Architecture](#6-real-time-architecture-kds--order-tracking)
7. [POS Offline Mode](#7-pos-offline-mode-pwa--service-worker)
8. [Authentication & Security](#8-authentication--security)
9. [API Security & Rate Limiting](#9-api-security--rate-limiting)
10. [Payment Security & PCI DSS](#10-payment-security--pci-dss-compliance)
11. [Data Privacy & GDPR Compliance](#11-data-privacy--gdpr-compliance)
12. [Secrets Management & Key Rotation](#12-secrets-management--key-rotation)
13. [CI/CD, DevSecOps & Supply Chain Security](#13-cicd-devsecops--supply-chain-security)
14. [Backup, DR & Incident Response](#14-backup-disaster-recovery--incident-response)
15. [Detailed Cost Comparison](#15-detailed-cost-comparison)
16. [Conclusion](#16-conclusion)

> **Development Roadmap & Migration Path** have been moved to [`ROADMAP.md`](./ROADMAP.md).

---

## 1. Executive Summary

This document presents the Lightweight architecture for the F&B CRM system, optimized for small restaurant chains (5-10 branches). Compared to the Enterprise edition (Microservices + K8s, costing $1,800-3,000/month), this version uses a Modular Monolith on Vercel + Supabase, reducing costs to $45-120/month while maintaining full functionality.

**Version 2.1** incorporates all findings from a comprehensive PostgreSQL best-practices review (15 issues) and a security & compliance audit (14 issues), making this architecture production-ready with proper database design, PCI DSS compliance, GDPR data privacy, and hardened security controls.

### Quick Comparison — Enterprise vs Lightweight

| Criteria      | Enterprise (v1.0)             | Lightweight (v2.1)                           |
| ------------- | ----------------------------- | -------------------------------------------- |
| Scale         | 50+ branches                  | 5-10 branches                                |
| Architecture  | Microservices (9 services)    | Modular Monolith (1 app)                     |
| Backend       | Node.js + Fastify + K8s       | Next.js API Routes + Supabase Edge Functions |
| Database      | 9x PostgreSQL instances       | 1x Supabase PostgreSQL (shared schema)       |
| Auth          | Custom JWT + Redis            | Supabase Auth (built-in)                     |
| Real-time     | Socket.IO + Redis Adapter     | Supabase Realtime (built-in)                 |
| File Storage  | AWS S3                        | Supabase Storage (built-in)                  |
| Message Queue | RabbitMQ                      | Supabase Database Webhooks + Edge Functions  |
| Hosting       | Kubernetes (EKS/GKE)          | Vercel (serverless)                          |
| CI/CD         | GitHub Actions + Docker + K8s | GitHub Actions + Vercel (auto-deploy)        |
| Search        | Elasticsearch                 | PostgreSQL Full-Text Search                  |
| Monitoring    | Prometheus + Grafana + ELK    | Vercel Analytics + Supabase Dashboard        |
| Cost/month    | $1,800 - $3,000               | $45 - $120                                   |
| Team required | 5-8 developers                | 2-3 developers                               |
| Time to MVP   | 3-4 months                    | 4-6 weeks                                    |

---

## 2. System Architecture

### 2.1. Architecture Pattern: Modular Monolith

Instead of splitting into 9 microservices, the system uses a Modular Monolith pattern: a single Next.js application divided into independent modules internally. Each module has its own domain logic but shares a common database and deployment.

**When to migrate to Microservices?** When exceeding 10 branches, team > 5 developers, or when a single module needs independent scaling (e.g., POS traffic too high). The Modular Monolith is designed for easy module extraction into standalone services when needed.

#### 2.1.1. Why Modular Monolith?

- **Simplified deployment:** 1 app on Vercel, no need to manage K8s cluster
- **Reduced latency:** No network hops between services, direct function calls
- **Shared transactions:** All modules share PostgreSQL, enabling database transactions instead of Saga pattern
- **Lower cost:** No message broker, service mesh, or multiple database instances needed
- **Easier debugging:** 1 codebase, 1 log stream, no distributed tracing required
- **Migration path:** When scaling, extract modules into standalone services without rewriting

### 2.2. Tech Stack

All versions as of February 2026.

| Layer               | Technology                             | Description                                                                                  | Cost               |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| Frontend + API      | Next.js 16.1 LTS (App Router)          | Full-stack: SSR pages + API Routes                                                           | Vercel Pro: $20/mo |
| POS Mobile (Waiter) | Next.js 16.1 PWA (mobile-first)        | Order-taking app on waiter's phone, offline support, order creation only                     | Included           |
| POS Cashier Station | Next.js 16.1 PWA (tablet/laptop)       | Cashier: view orders, process payments, print receipts, open/close shifts, printer connected | Included           |
| KDS Frontend        | Next.js 16.1 + Supabase Realtime       | Kitchen display, real-time from Supabase, per-station display                                | Included           |
| Customer App        | Next.js 16.1 PWA (Mobile-first)        | Web app for ordering, loyalty (no native app needed)                                         | Included           |
| Database            | Supabase PostgreSQL (Pro)              | Database + Auth + Realtime + Storage + RLS                                                   | $25/mo             |
| Auth                | Supabase Auth                          | Email/phone login, OAuth, RBAC via RLS policies                                              | Included           |
| Real-time           | Supabase Realtime                      | WebSocket for KDS, order tracking, live updates                                              | Included           |
| File Storage        | Supabase Storage                       | Product images, documents, receipts                                                          | Included (100GB)   |
| Edge Functions      | Supabase Edge Functions (Deno)         | Webhooks, payment callbacks, async tasks                                                     | Included (500K/mo) |
| Search              | PostgreSQL Full-Text Search + tsvector | Search for menu items, customers, orders                                                     | Included           |
| Hosting             | Vercel Pro                             | Auto-deploy, CDN, serverless functions                                                       | $20/mo             |
| Domain              | Vercel / Cloudflare                    | Custom domain + SSL                                                                          | ~$12/yr            |
| CI/CD               | GitHub Actions (free tier)             | Lint, test, type-check, auto-deploy via Vercel                                               | Free               |
| Email               | Resend / Supabase SMTP                 | Transactional emails, marketing                                                              | Free tier / $20    |
| Monitoring          | Vercel Analytics + Sentry              | Performance, errors, user analytics                                                          | Free tier          |
| Rate Limiting       | Upstash Redis                          | API rate limiting, DDoS protection                                                           | Free tier / $10    |
| ORM                 | Prisma 7.2 + @supabase/supabase-js     | Type-safe queries + Supabase client                                                          | Free               |
| Language            | TypeScript 5.7 (stable)                | Type-safe across entire codebase                                                             | Free               |

### Estimated Monthly Cost

| Item                | Plan                                                   | Cost/month                                |
| ------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Vercel Pro          | 1 project, auto-deploy, CDN, serverless                | $20                                       |
| Supabase Pro        | 8GB DB, 100K MAU, 100GB storage, Realtime              | $25                                       |
| Domain              | Custom domain (yearly)                                 | ~$1 (avg)                                 |
| Email (Resend)      | 100 emails/day free, Pro if needed                     | $0-20                                     |
| Sentry (monitoring) | Free tier (5K events/month)                            | $0                                        |
| Upstash Redis       | Rate limiting (free tier sufficient for 5-10 branches) | $0-10                                     |
| **TOTAL**           |                                                        | **$45-76 (base) / $76-120 (with extras)** |

---

## 3. Project Structure (Modular Monolith)

Monorepo with Turborepo 2.8, modules organized by domain. Each module is a separate folder with its own routes, services, and types.

```
comtammatu/
├── apps/web/                          # Next.js 16.1 main app (Admin + POS + KDS + Customer)
│   ├── app/(admin)/                   # Admin dashboard routes
│   ├── app/(pos)/                     # POS interface routes
│   ├── app/(kds)/                     # Kitchen Display routes
│   ├── app/(customer)/                # Customer-facing routes
│   └── app/api/                       # API Routes (backend logic)
├── modules/                           # Domain modules (business logic)
│   ├── auth/                          # Authentication & RBAC
│   ├── terminals/                     # Terminal registration, device management, fingerprint
│   ├── pos/                           # POS sessions, payment processing (cashier_station only)
│   ├── orders/                        # Order lifecycle & state machine (mobile_order + cashier)
│   ├── kds/                           # Kitchen display routing, station management
│   ├── inventory/                     # Stock, recipes, suppliers
│   ├── hr/                            # Employees, shifts, attendance, payroll
│   ├── crm/                           # Customers, loyalty, campaigns
│   ├── privacy/                       # GDPR data deletion, data export, retention jobs
│   └── reports/                       # Analytics, reporting
├── packages/
│   ├── database/                      # Prisma schema, migrations, seed
│   ├── shared/                        # Types, utils, constants
│   ├── security/                      # Rate limiting, webhook verification, encryption helpers
│   └── ui/                            # Shared UI components (shadcn/ui)
├── supabase/                          # Supabase config
│   ├── functions/                     # Edge Functions (Deno)
│   │   ├── payment-webhook/           # Payment callback handler (HMAC verified)
│   │   └── data-retention/            # Scheduled data cleanup (cron)
│   ├── migrations/                    # SQL migrations
│   ├── tests/                         # RLS policy validation tests
│   └── seed.sql                       # Seed data
├── .github/workflows/                 # GitHub Actions CI/CD
│   ├── ci.yml                         # Lint, test, type-check, deploy
│   ├── secrets-scan.yml               # TruffleHog secrets scanning
│   ├── dependency-check.yml           # npm audit + Snyk
│   └── sbom.yml                       # SBOM generation (CycloneDX)
├── .pre-commit-config.yaml            # Pre-commit hooks (detect-secrets)
└── .dependabot.yml                    # Automated dependency updates
```

---

## 4. Database Design (Supabase PostgreSQL)

Instead of 9 separate databases, the system uses 1 Supabase PostgreSQL instance with Row Level Security (RLS) to ensure tenant isolation. Schema is organized by domain modules.

**v2.1 Database Design Principles (all applied):**

- **Identity columns:** `BIGINT GENERATED ALWAYS AS IDENTITY` (not SERIAL, not UUID for internal PKs)
- **Text columns:** `TEXT` (not VARCHAR) — PostgreSQL stores both identically, TEXT is more flexible
- **Timestamps:** `TIMESTAMPTZ` (not TIMESTAMP) — timezone-aware, critical for multi-branch across timezones
- **Money/amounts:** `NUMERIC(14,2)` for totals, `NUMERIC(12,2)` for unit prices, `NUMERIC(12,4)` for cost prices — never FLOAT/DOUBLE
- **NOT NULL by default:** Every column that should have a value is marked NOT NULL
- **CHECK constraints:** Every enum-like column has explicit CHECK constraint (not relying on application code)
- **FK indexes:** Every foreign key column has a corresponding index (prevents sequential scans on JOINs)
- **Composite uniqueness:** Multi-tenant unique constraints use `(tenant_id, field)` pattern
- **Composite indexes:** Query-optimized indexes for common access patterns
- **GIN indexes:** For JSONB and array columns
- **Range constraints:** CHECK constraints on ratings (1-5), quantities (> 0), date ranges (start <= end)

### 4.1. Core Tables: Tenant & Branch

```sql
CREATE TABLE tenants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  settings JSONB,
  subscription_plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (subscription_plan IN ('free', 'starter', 'pro', 'enterprise')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active) WHERE is_active = true;

CREATE TABLE branches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  operating_hours JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_branches_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uniq_branch_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX idx_branches_tenant_active ON branches(tenant_id, is_active);

CREATE TABLE branch_zones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dining', 'bar', 'outdoor', 'other')),
  table_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_zones_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX idx_branch_zones_branch_id ON branch_zones(branch_id);

CREATE TABLE tables (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zone_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  number INT NOT NULL,
  capacity INT,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  qr_code_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_tables_zone FOREIGN KEY (zone_id)
    REFERENCES branch_zones(id) ON DELETE CASCADE,
  CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uniq_table_in_zone UNIQUE (zone_id, number)
);

CREATE INDEX idx_tables_zone_id ON tables(zone_id);
CREATE INDEX idx_tables_branch_id ON tables(branch_id);
CREATE INDEX idx_tables_status ON tables(branch_id, status);

CREATE TABLE profiles (
  id UUID PRIMARY KEY,  -- Maps to auth.users.id
  tenant_id BIGINT NOT NULL,
  branch_id BIGINT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('owner', 'manager', 'cashier', 'chef', 'waiter', 'inventory', 'hr', 'customer')),
  avatar_url TEXT,
  settings JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_profiles_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE SET NULL
);

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_branch_id ON profiles(branch_id);
CREATE INDEX idx_profiles_role ON profiles(tenant_id, role);
```

**RLS Policies:**

| Table          | RLS Policy                                         |
| -------------- | -------------------------------------------------- |
| `tenants`      | Super Admin: ALL; Others: SELECT own tenant        |
| `branches`     | Tenant members: SELECT; Manager: UPDATE own branch |
| `branch_zones` | Branch staff: SELECT; Manager: ALL                 |
| `tables`       | Branch staff: SELECT/UPDATE status                 |
| `profiles`     | Users: SELECT own profile; Admin: ALL              |

### 4.2. Menu Management

```sql
CREATE TABLE menus (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  branches BIGINT[],  -- Array of branch IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_menus_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX idx_menus_active ON menus(tenant_id, is_active);
CREATE INDEX idx_menus_branches ON menus USING GIN(branches);

CREATE TABLE menu_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_categories_menu FOREIGN KEY (menu_id)
    REFERENCES menus(id) ON DELETE CASCADE
);

CREATE INDEX idx_menu_categories_menu_id ON menu_categories(menu_id);
CREATE INDEX idx_menu_categories_sort ON menu_categories(menu_id, sort_order);

CREATE TABLE menu_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id BIGINT NOT NULL,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL,
  image_url TEXT,
  prep_time_min INT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  allergens TEXT[],
  nutrition JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_items_category FOREIGN KEY (category_id)
    REFERENCES menu_categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT chk_price_positive CHECK (base_price > 0),
  CONSTRAINT chk_prep_time_valid CHECK (prep_time_min >= 0)
);

CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_available ON menu_items(category_id, is_available) WHERE is_available = true;
CREATE INDEX idx_menu_items_allergens ON menu_items USING GIN(allergens);
CREATE INDEX idx_menu_items_fts ON menu_items USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

CREATE TABLE menu_item_variants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  price_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_variants_item FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_variants_item_id ON menu_item_variants(menu_item_id);

CREATE TABLE menu_item_modifiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  options JSONB,
  max_selections INT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_modifiers_item FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_modifiers_item_id ON menu_item_modifiers(menu_item_id);
```

### 4.3. POS Terminals & Sessions

The POS system supports a **Split POS** model: each branch has multiple POS devices with different roles. Waiters use mobile phones to take orders, while cashiers use a tablet/laptop with a receipt printer to process payments and print invoices.

**Terminal Types:**

- **`mobile_order`**: Waiter's phone — can only create/edit orders, select tables, track status. **CANNOT** process payments.
- **`cashier_station`**: Main POS terminal — view orders, process payments, print receipts, open/close cash shifts. Connected to printer + cash drawer.

```sql
CREATE TABLE pos_terminals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mobile_order', 'cashier_station')),
  device_fingerprint TEXT NOT NULL UNIQUE,
  peripheral_config JSONB,  -- Printer config, cash drawer info
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  registered_by UUID,  -- profiles.id
  approved_by UUID,    -- Manager who approved registration
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_terminals_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_terminals_registered_by FOREIGN KEY (registered_by)
    REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_terminals_approved_by FOREIGN KEY (approved_by)
    REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_pos_terminals_branch_id ON pos_terminals(branch_id);
CREATE INDEX idx_pos_terminals_device_fingerprint ON pos_terminals(device_fingerprint);
CREATE INDEX idx_pos_terminals_active ON pos_terminals(branch_id, is_active);
CREATE INDEX idx_pos_terminals_type ON pos_terminals(branch_id, type);

CREATE TABLE pos_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  terminal_id BIGINT NOT NULL,
  cashier_id UUID NOT NULL,  -- profiles.id
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(14,2),
  expected_amount NUMERIC(14,2),
  difference NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_sessions_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_terminal FOREIGN KEY (terminal_id)
    REFERENCES pos_terminals(id),
  CONSTRAINT fk_sessions_cashier FOREIGN KEY (cashier_id)
    REFERENCES profiles(id)
  -- Note: Terminal type check (cashier_station only) enforced via RLS + application trigger
);

CREATE INDEX idx_pos_sessions_branch_id ON pos_sessions(branch_id);
CREATE INDEX idx_pos_sessions_terminal_id ON pos_sessions(terminal_id);
CREATE INDEX idx_pos_sessions_cashier_id ON pos_sessions(cashier_id);
CREATE INDEX idx_pos_sessions_open ON pos_sessions(branch_id, status) WHERE status = 'open';
CREATE INDEX idx_pos_sessions_opened_at ON pos_sessions(opened_at DESC);
```

> **Note:** Only `cashier_station` terminals can open a `pos_session` (cash shift). This is enforced via a BEFORE INSERT trigger and RLS policy, not a CHECK constraint (since CHECK cannot reference other tables in standard SQL). `mobile_order` terminals do not need cash sessions since they only create orders and never handle money.

### 4.4. Orders & Payments

```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number TEXT NOT NULL,
  branch_id BIGINT NOT NULL,
  table_id BIGINT,
  customer_id BIGINT,
  terminal_id BIGINT NOT NULL,
  pos_session_id BIGINT,  -- Set when payment is processed
  type TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,  -- profiles.id
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id),
  CONSTRAINT fk_orders_session FOREIGN KEY (pos_session_id) REFERENCES pos_sessions(id),
  CONSTRAINT fk_orders_creator FOREIGN KEY (created_by) REFERENCES profiles(id),
  CONSTRAINT chk_order_amounts_positive CHECK (
    subtotal >= 0 AND discount_total >= 0 AND tax >= 0 AND service_charge >= 0
  )
);

CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_terminal_id ON orders(terminal_id);
CREATE INDEX idx_orders_session_id ON orders(pos_session_id);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX idx_orders_branch_status_date ON orders(branch_id, status, created_at DESC);
CREATE INDEX idx_orders_unpaid ON orders(pos_session_id) WHERE pos_session_id IS NULL;
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);

CREATE TABLE order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  menu_item_id BIGINT NOT NULL,
  variant_id BIGINT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  item_total NUMERIC(14,2) NOT NULL,
  modifiers JSONB,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent_to_kds', 'preparing', 'ready', 'served', 'cancelled')),
  kds_station_id BIGINT,
  sent_to_kds_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES menu_item_variants(id),
  CONSTRAINT fk_order_items_station FOREIGN KEY (kds_station_id) REFERENCES kds_stations(id) ON DELETE SET NULL,
  CONSTRAINT chk_item_price_positive CHECK (unit_price > 0 AND item_total >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_id ON order_items(menu_item_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX idx_order_items_station_id ON order_items(kds_station_id);
CREATE INDEX idx_order_items_status ON order_items(order_id, status);

CREATE TABLE order_discounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'voucher')),
  value NUMERIC(12,2) NOT NULL CHECK (value > 0),
  reason TEXT,
  applied_by UUID,
  voucher_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_discounts_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_discounts_applier FOREIGN KEY (applied_by) REFERENCES profiles(id),
  CONSTRAINT fk_discounts_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

CREATE INDEX idx_order_discounts_order_id ON order_discounts(order_id);
CREATE INDEX idx_order_discounts_voucher_id ON order_discounts(voucher_id);

CREATE TABLE order_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  terminal_id BIGINT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES profiles(id),
  CONSTRAINT fk_history_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id)
);

CREATE INDEX idx_order_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_history_created_at ON order_status_history(created_at DESC);

CREATE TABLE payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  pos_session_id BIGINT NOT NULL,
  terminal_id BIGINT NOT NULL,  -- Must be cashier_station (enforced by trigger + RLS)
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'ewallet', 'qr')),
  provider TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  tip NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tip >= 0),
  reference_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_session FOREIGN KEY (pos_session_id) REFERENCES pos_sessions(id),
  CONSTRAINT fk_payments_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_session_id ON payments(pos_session_id);
CREATE INDEX idx_payments_terminal_id ON payments(terminal_id);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX idx_payments_method ON payments(method, created_at DESC);
```

**Split POS Flow:**

1. Waiter opens POS app on phone (`mobile_order` terminal) → selects table → selects items → submits order
2. Order is INSERTed with `terminal_id` = mobile device, `pos_session_id` = NULL (not yet paid)
3. KDS receives order automatically via Supabase Realtime → Kitchen starts cooking
4. When food is ready (KDS ready) → Waiter brings food to the table
5. Customer requests the bill → Cashier sees the order on `cashier_station` screen
6. Cashier processes payment → `UPDATE orders SET pos_session_id = current_session`, `INSERT payments`
7. Cashier prints receipt → done

### 4.5. KDS (Kitchen Display System)

```sql
CREATE TABLE kds_stations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  display_config JSONB,
  categories BIGINT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_kds_stations_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX idx_kds_stations_branch_id ON kds_stations(branch_id);
CREATE INDEX idx_kds_stations_categories ON kds_stations USING GIN(categories);

CREATE TABLE kds_tickets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  station_id BIGINT NOT NULL,
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready')),
  priority INT,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  color_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_kds_tickets_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_kds_tickets_station FOREIGN KEY (station_id) REFERENCES kds_stations(id) ON DELETE CASCADE
);

CREATE INDEX idx_kds_tickets_order_id ON kds_tickets(order_id);
CREATE INDEX idx_kds_tickets_station_id ON kds_tickets(station_id);
CREATE INDEX idx_kds_tickets_status ON kds_tickets(station_id, status);
CREATE INDEX idx_kds_tickets_created_at ON kds_tickets(created_at DESC);

CREATE TABLE kds_timing_rules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  prep_time_min INT NOT NULL CHECK (prep_time_min > 0),
  warning_min INT,
  critical_min INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_timing_station FOREIGN KEY (station_id) REFERENCES kds_stations(id) ON DELETE CASCADE,
  CONSTRAINT fk_timing_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE,
  CONSTRAINT uniq_station_category UNIQUE (station_id, category_id)
);

CREATE INDEX idx_kds_timing_station_id ON kds_timing_rules(station_id);
CREATE INDEX idx_kds_timing_category_id ON kds_timing_rules(category_id);
```

### 4.6. Inventory & Supply Chain

```sql
CREATE TABLE ingredients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL,
  category TEXT,
  min_stock NUMERIC(14,4),
  max_stock NUMERIC(14,4),
  cost_price NUMERIC(12,4),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_ingredients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT chk_stock_thresholds CHECK (min_stock >= 0 AND max_stock >= min_stock),
  CONSTRAINT chk_cost_price CHECK (cost_price >= 0)
);

CREATE INDEX idx_ingredients_tenant_id ON ingredients(tenant_id);
CREATE INDEX idx_ingredients_sku ON ingredients(tenant_id, sku);

CREATE TABLE recipes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id BIGINT NOT NULL UNIQUE,
  yield_qty NUMERIC(14,4),
  yield_unit TEXT,
  total_cost NUMERIC(14,4),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_recipes_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipes_menu_item_id ON recipes(menu_item_id);

CREATE TABLE recipe_ingredients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id BIGINT NOT NULL,
  ingredient_id BIGINT NOT NULL,
  quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  waste_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (waste_pct >= 0 AND waste_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_recipe_ing_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ing_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

CREATE TABLE stock_levels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingredient_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  version INT NOT NULL DEFAULT 0,  -- Optimistic concurrency control
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_stock_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uniq_stock_location UNIQUE (ingredient_id, branch_id)
);

CREATE INDEX idx_stock_levels_ingredient_id ON stock_levels(ingredient_id);
CREATE INDEX idx_stock_levels_branch_id ON stock_levels(branch_id);
CREATE INDEX idx_stock_levels_version ON stock_levels(ingredient_id, branch_id, version);

CREATE TABLE stock_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingredient_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'transfer', 'waste', 'adjust')),
  quantity NUMERIC(14,4) NOT NULL,
  reference_type TEXT,
  reference_id BIGINT,
  cost_at_time NUMERIC(14,4),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_movement_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  CONSTRAINT fk_movement_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_movement_user FOREIGN KEY (created_by) REFERENCES profiles(id)
);

CREATE INDEX idx_stock_movements_ingredient_id ON stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_branch_id ON stock_movements(branch_id);
CREATE INDEX idx_stock_movements_type_date ON stock_movements(ingredient_id, branch_id, type, created_at DESC);

CREATE TABLE suppliers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);

CREATE TABLE purchase_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  total NUMERIC(14,2),
  ordered_at TIMESTAMPTZ,
  expected_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_po_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_po_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_po_creator FOREIGN KEY (created_by) REFERENCES profiles(id),
  CONSTRAINT chk_po_dates CHECK (ordered_at <= expected_at)
);

CREATE INDEX idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_branch_id ON purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status, created_at DESC);

CREATE TABLE purchase_order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id BIGINT NOT NULL,
  ingredient_id BIGINT NOT NULL,
  quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price > 0),
  received_qty NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_po_items_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE INDEX idx_po_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_ingredient_id ON purchase_order_items(ingredient_id);

CREATE TABLE waste_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingredient_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'spoiled', 'overproduction', 'other')),
  notes TEXT,
  logged_by UUID NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_waste_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  CONSTRAINT fk_waste_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_waste_user FOREIGN KEY (logged_by) REFERENCES profiles(id)
);

CREATE INDEX idx_waste_logs_ingredient_id ON waste_logs(ingredient_id);
CREATE INDEX idx_waste_logs_branch_id ON waste_logs(branch_id);
CREATE INDEX idx_waste_logs_reason ON waste_logs(reason, logged_at DESC);
```

### 4.7. HR & Payroll

```sql
CREATE TABLE employees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id UUID NOT NULL UNIQUE,
  tenant_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  position TEXT NOT NULL,
  department TEXT,
  hire_date DATE NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full', 'part', 'contract')),
  hourly_rate NUMERIC(12,2) CHECK (hourly_rate > 0 OR hourly_rate IS NULL),
  monthly_salary NUMERIC(14,2) CHECK (monthly_salary > 0 OR monthly_salary IS NULL),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  emergency_contact JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_employees_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE INDEX idx_employees_profile_id ON employees(profile_id);
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_employees_branch_id ON employees(branch_id);
CREATE INDEX idx_employees_status ON employees(branch_id, status);

CREATE TABLE shifts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_min INT,
  max_employees INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_shifts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT chk_shift_times CHECK (start_time < end_time)
);

CREATE INDEX idx_shifts_branch_id ON shifts(branch_id);

CREATE TABLE shift_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id BIGINT NOT NULL,
  employee_id BIGINT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'no_show')),
  swap_with BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_assignment_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_swap FOREIGN KEY (swap_with) REFERENCES shift_assignments(id) ON DELETE SET NULL,
  CONSTRAINT uniq_shift_assignment UNIQUE (shift_id, employee_id, date)
);

CREATE INDEX idx_assignment_shift_id ON shift_assignments(shift_id);
CREATE INDEX idx_assignment_employee_id ON shift_assignments(employee_id);
CREATE INDEX idx_assignment_date ON shift_assignments(date, status);

CREATE TABLE attendance_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  hours_worked NUMERIC(5,2) CHECK (hours_worked >= 0),
  overtime_hours NUMERIC(5,2) CHECK (overtime_hours >= 0),
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'early_leave')),
  source TEXT NOT NULL CHECK (source IN ('qr', 'manual', 'pos_session', 'terminal_login')),
  terminal_id BIGINT,
  pos_session_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_attendance_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id),
  CONSTRAINT fk_attendance_session FOREIGN KEY (pos_session_id) REFERENCES pos_sessions(id),
  CONSTRAINT uniq_attendance_daily UNIQUE (employee_id, date)
);

CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_branch_id ON attendance_records(branch_id);
CREATE INDEX idx_attendance_date ON attendance_records(date, status);

CREATE TABLE leave_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('annual', 'sick', 'unpaid', 'maternity')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INT NOT NULL CHECK (days > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_approver FOREIGN KEY (approved_by) REFERENCES profiles(id),
  CONSTRAINT chk_leave_dates CHECK (start_date <= end_date)
);

CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

CREATE TABLE payroll_periods (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed')),
  total NUMERIC(14,2),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payroll_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_processor FOREIGN KEY (processed_by) REFERENCES profiles(id),
  CONSTRAINT chk_payroll_dates CHECK (period_start < period_end)
);

CREATE INDEX idx_payroll_periods_tenant_id ON payroll_periods(tenant_id);
CREATE INDEX idx_payroll_periods_date_range ON payroll_periods(period_start, period_end);

CREATE TABLE payroll_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_id BIGINT NOT NULL,
  employee_id BIGINT NOT NULL,
  base_pay NUMERIC(14,2) CHECK (base_pay >= 0 OR base_pay IS NULL),
  overtime_pay NUMERIC(14,2) CHECK (overtime_pay >= 0 OR overtime_pay IS NULL),
  tips NUMERIC(14,2) CHECK (tips >= 0 OR tips IS NULL),
  bonuses NUMERIC(14,2) CHECK (bonuses >= 0 OR bonuses IS NULL),
  deductions JSONB,
  tax NUMERIC(14,2) CHECK (tax >= 0 OR tax IS NULL),
  net_pay NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payroll_items_period FOREIGN KEY (period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_items_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_payroll_items_period_id ON payroll_items(period_id);
CREATE INDEX idx_payroll_items_employee_id ON payroll_items(employee_id);
```

### 4.8. CRM & Loyalty

```sql
CREATE TABLE customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
  birthday DATE,
  source TEXT CHECK (source IN ('pos', 'app', 'website')),
  first_visit DATE,
  last_visit DATE,
  total_visits INT NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  loyalty_tier_id BIGINT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_customers_tier FOREIGN KEY (loyalty_tier_id) REFERENCES loyalty_tiers(id),
  CONSTRAINT uniq_customer_phone UNIQUE (tenant_id, phone),
  CONSTRAINT uniq_customer_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_tier_id ON customers(loyalty_tier_id);
CREATE INDEX idx_customers_last_visit ON customers(tenant_id, last_visit DESC);

CREATE TABLE loyalty_tiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  min_points INT NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) CHECK (discount_pct >= 0 AND discount_pct <= 100),
  benefits JSONB,
  sort_order INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_loyalty_tiers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_loyalty_tiers_tenant_id ON loyalty_tiers(tenant_id);

CREATE TABLE loyalty_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  points INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust')),
  reference_type TEXT,
  reference_id BIGINT,
  balance_after INT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_loyalty_trans_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(customer_id, type);
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);

CREATE TABLE vouchers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'free_item')),
  value NUMERIC(12,2) NOT NULL CHECK (value > 0),
  min_order NUMERIC(12,2),
  max_discount NUMERIC(12,2),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  branches BIGINT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_vouchers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uniq_voucher_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_voucher_dates CHECK (valid_from <= valid_to),
  CONSTRAINT chk_voucher_uses CHECK (used_count <= max_uses OR max_uses IS NULL)
);

CREATE INDEX idx_vouchers_tenant_id ON vouchers(tenant_id);
CREATE INDEX idx_vouchers_code ON vouchers(tenant_id, code);
CREATE INDEX idx_vouchers_active ON vouchers(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_vouchers_branches ON vouchers USING GIN(branches);

CREATE TABLE campaigns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  target_segment JSONB,
  content JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_campaigns_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status, scheduled_at DESC);

CREATE TABLE customer_feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT,
  order_id BIGINT,
  branch_id BIGINT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response TEXT,
  responded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_feedback_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_feedback_responder FOREIGN KEY (responded_by) REFERENCES profiles(id)
);

CREATE INDEX idx_feedback_customer_id ON customer_feedback(customer_id);
CREATE INDEX idx_feedback_order_id ON customer_feedback(order_id);
CREATE INDEX idx_feedback_branch_id ON customer_feedback(branch_id);
CREATE INDEX idx_feedback_rating ON customer_feedback(branch_id, rating);
```

### 4.9. Audit, System & Privacy

```sql
CREATE TABLE audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  user_id UUID NOT NULL,  -- Hashed for GDPR if customer-related
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id BIGINT NOT NULL,
  old_value JSONB,  -- PII fields hashed/pseudonymized
  new_value JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES profiles(id)
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(tenant_id, resource_type, resource_id);

-- APPEND ONLY: Prevent UPDATE/DELETE at database level
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

CREATE TABLE security_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT,
  event_type TEXT NOT NULL,  -- 'login_failed', 'terminal_disabled', 'anomaly_detected', etc.
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  source_ip INET,
  user_id UUID,
  terminal_id BIGINT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at DESC);

-- APPEND ONLY
REVOKE UPDATE, DELETE ON security_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON security_events FROM authenticated;
GRANT SELECT, INSERT ON security_events TO authenticated;

CREATE TABLE deletion_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL,  -- 30 days after request
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  completed_at TIMESTAMPTZ,
  processed_by UUID,

  CONSTRAINT fk_deletion_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_deletion_requests_status ON deletion_requests(status, scheduled_deletion_at);

CREATE TABLE notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  user_id UUID,
  customer_id BIGINT,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

CREATE TABLE system_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by) REFERENCES profiles(id),
  CONSTRAINT uniq_setting_key UNIQUE (tenant_id, key)
);

CREATE INDEX idx_system_settings_tenant_id ON system_settings(tenant_id);
```

---

## 5. Key Architecture Improvements (from v1 Review)

Based on the Enterprise v1.0 review, the Lightweight version directly addresses all CRITICAL issues:

### 5.1. Row Level Security (RLS) — Fix CRITICAL-S01

Every table has an RLS policy. Supabase enforces RLS at the database level, independent of application code.

```sql
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

Even if a developer forgets to filter by `tenant_id` in code, the database automatically filters.

**Terminal-aware RLS (Split POS):**

```sql
-- Waiter can only create orders, cannot process payments:
CREATE POLICY waiter_create_order ON orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pos_terminals WHERE id = terminal_id AND type = 'mobile_order' AND is_active)
);

-- Only cashier_station can INSERT payments:
CREATE POLICY cashier_payment ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pos_terminals WHERE id = terminal_id AND type = 'cashier_station')
);
```

**RLS Policy Validation (v2.1 new):** Automated test suite validates all RLS policies in CI/CD pipeline. Tests verify cross-tenant isolation, role-based access, and terminal-type enforcement. See Section 13 for CI/CD integration.

### 5.2. Idempotency Keys — Fix CRITICAL-A04

Both `orders` and `payments` tables have an `idempotency_key UUID UNIQUE` column. POS offline sync sends the idempotency_key, and the server rejects duplicates (HTTP 409). Customers can never be charged twice.

### 5.3. Optimistic Concurrency — Fix CRITICAL-A07

The `stock_levels` table has a `version INT` column with a composite index `(ingredient_id, branch_id, version)`. When deducting stock: `UPDATE ... WHERE version = expected_version`. If 2 terminals deduct simultaneously, one will fail and retry.

### 5.4. Supabase Realtime replaces Socket.IO — Fix CRITICAL-A08

Supabase Realtime uses PostgreSQL replication slots and scales automatically. KDS subscribes to changes on `orders` and `kds_tickets` tables. Built-in and requires no additional configuration. Channel authorization enforced via RLS (see Section 6).

### 5.5. Database Transactions replace Saga — Fix CRITICAL-A01

The Modular Monolith enables PostgreSQL transactions for cross-module operations. When an order is completed: `BEGIN` → deduct stock + add loyalty points + record payment → `COMMIT`. If any step fails, the entire operation is `ROLLED BACK`.

### 5.6. Audit Logging — Fix HIGH-S04

The `audit_logs` table is **APPEND ONLY** via `REVOKE UPDATE, DELETE`. A separate `security_events` table (also append-only) tracks authentication failures, terminal anomalies, and suspicious activity. PII in audit logs is pseudonymized (hashed) for GDPR compliance.

### 5.7. Supabase Auth — Fix CRITICAL-S02, HIGH-S03

Supabase Auth provides built-in: JWT management, token revocation, MFA (TOTP), session management, and password policies.

---

## 6. Real-time Architecture (KDS & Order Tracking)

### 6.1. Supabase Realtime Channels

**1. Database Changes (Postgres Changes):**

- KDS subscribes: INSERT/UPDATE on `kds_tickets` WHERE `station_id = my_station`
- Cashier subscribes: UPDATE on `orders` WHERE `branch_id = my_branch AND status IN ('ready', 'served')`
- Mobile (waiter) subscribes: UPDATE on `orders` WHERE `branch_id = my_branch AND created_by = me`
- Customer app subscribes: UPDATE on `orders` WHERE `id = my_order`

**2. Broadcast (ephemeral messages):**

- Table status updates: available → occupied
- Waiter notifications: "Order #45 - Table 7 is ready"
- Cashier notifications: "Order #45 - Table 7 requests the bill"

**3. Presence (who is online):**

- Display `mobile_order` terminals online (active waiters)
- Display active `cashier_stations` and KDS stations
- Manager dashboard: all devices and staff currently active

### 6.2. Realtime Channel Authorization (v2.1 new)

All Realtime subscriptions are filtered by the user's `branch_id` and `tenant_id`, enforced by RLS. Users cannot subscribe to channels outside their branch. Broadcast channels use authenticated tokens and are scoped to `branch:{branch_id}`.

```typescript
// Authenticated channel subscription with branch scoping
const channel = supabase
  .channel(`branch:${userBranchId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "orders",
      filter: `branch_id=eq.${userBranchId}`,
    },
    handleOrderUpdate
  )
  .subscribe();
```

### 6.3. Split POS + KDS Flow (Detailed)

**Phase 1: Order (Waiter — Mobile)** → Waiter opens PWA → selects table → selects items → confirms order → INSERTs `orders` + `order_items` with `terminal_id` = mobile device, `pos_session_id` = NULL

**Phase 2: Kitchen (KDS)** → Supabase trigger creates `kds_tickets` per station → KDS displays new order → Chef starts → Chef marks ready → Trigger updates `orders.status` = 'ready'

**Phase 3: Notification (Realtime)** → Waiter gets push notification → Brings food → Updates `orders.status` = 'served'

**Phase 4: Payment (Cashier)** → Cashier sees served orders → Applies discount/voucher → INSERTs `payment` → UPDATEs `orders.pos_session_id` → Prints receipt → Trigger deducts stock + adds loyalty points

---

## 7. POS Offline Mode (PWA + Service Worker)

### 7.1. Mobile Order (Waiter) — Offline Strategy

- Service Worker caches: menu data, table layout, UI assets
- IndexedDB stores: pending orders (draft), local table status
- When offline: Waiter can still create orders → saved to IndexedDB with `idempotency_key` + `terminal_id`
- When online: Background Sync API sends pending orders to server
- Server checks `idempotency_key` → rejects duplicates (HTTP 409)
- No sensitive data (payment, customer PII) stored on mobile
- Offline data: menu items, table map, pending orders only

### 7.2. Cashier Station — Offline Strategy

- Service Worker caches: full UI + menu + pending orders from mobile
- IndexedDB stores: unpaid orders, pending payments, pos_session data
- When offline: Cashier can process **cash only** payments, saves to IndexedDB
- Card/eWallet: **REQUIRES network** — explicit code enforcement:

```typescript
if (!navigator.onLine && method !== "cash") {
  throw new PaymentError("Card and eWallet payments require network connection");
}
```

- When online: Background Sync sends pending payments + orders to server
- Server checks `idempotency_key` on both orders and payments
- Reconciliation: When closing shift, system reconciles offline transactions vs server
- If offline payment sync fails after 48h: alert manager, require manual reconciliation
- Offline data expiry: auto-clear only AFTER confirmed successful sync, never time-based deletion of unsynced data

### 7.3. Offline Data Security (v2.1 hardened)

**Encryption:** IndexedDB data encrypted using Web Crypto API (AES-256-GCM)

**Key Derivation (PBKDF2 with OWASP parameters):**

```typescript
const key = await crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    salt: crypto.getRandomValues(new Uint8Array(16)), // Random salt per session
    iterations: 600_000, // OWASP 2023 minimum for SHA-256
    hash: "SHA-256",
  },
  await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey",
  ]),
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);
```

> For future hardening, consider migrating to **Argon2id** via libsodium.js WASM library for GPU-attack resistance.

**Key Lifecycle:**

- New encryption key generated on every app launch (re-encrypts all offline data)
- Key cleared from memory after 15 minutes of inactivity (screen lock)
- Password re-entry required to unlock
- Secure key erasure: overwrite key bytes with random data before deletion

**Remote Wipe:**

- Manager disables terminal (`pos_terminals.is_active = false`) → device cannot log in
- Force logout clears all IndexedDB data + encryption keys
- Lost device: manager disables terminal immediately

---

## 8. Authentication & Security

### 8.1. Supabase Auth (Built-in)

- Email/Password login for staff (Admin, Manager, Cashier, Chef, Waiter)
- Phone/OTP login for customers (ordering, loyalty)
- MFA (TOTP) mandatory for Manager, Admin, and Owner roles
- Session management: auto-refresh tokens, revoke on logout
- Password policies: min 12 chars, complexity rules (upper, lower, number, special)
- Rate limiting: built-in brute force protection (5 attempts per 15 minutes)

### 8.2. RBAC via RLS + Custom Claims

Roles are stored in `profiles.role` and set as Supabase custom claims. RLS policies check claims directly in SQL.

**Role Hierarchy (v2.1 new):**

```
owner > manager > [cashier, chef, waiter, inventory, hr] > customer
```

Each role inherits permissions from roles below it. The hierarchy is enforced at the application layer and documented in the role access matrix.

| Role        | Scope            | Key Permissions                                                                                   |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `owner`     | Entire tenant    | Full access: menu, pricing, HR, payroll, reports, settings, terminal management                   |
| `manager`   | 1 branch         | Branch management: staff, inventory, reports, approve discount/refund, register/disable terminals |
| `cashier`   | cashier_station  | View orders, process payments, open/close shifts, print receipts                                  |
| `chef`      | KDS station      | View and update order status on KDS kitchen display                                               |
| `waiter`    | mobile_order     | Create orders, select tables, add items, track status                                             |
| `inventory` | Inventory module | Receive/issue stock, stock-taking, create POs                                                     |
| `hr`        | HR module        | Manage employees, shifts, payroll                                                                 |
| `customer`  | Customer app     | Place orders, view loyalty, submit feedback                                                       |

**Role-Table Access Matrix (v2.1 new):**

| Table         | owner | manager       | cashier | chef | waiter      | inventory     | hr   | customer |
| ------------- | ----- | ------------- | ------- | ---- | ----------- | ------------- | ---- | -------- |
| orders        | CRUD  | CRUD (branch) | R       | R    | CR (branch) | -             | -    | R (own)  |
| payments      | CRUD  | R (branch)    | CR      | -    | -           | -             | -    | -        |
| employees     | CRUD  | R (branch)    | -       | -    | -           | -             | CRUD | -        |
| payroll_items | CRUD  | -             | -       | -    | -           | -             | CRUD | -        |
| stock_levels  | CRUD  | R (branch)    | -       | -    | -           | CRUD (branch) | -    | -        |
| customers     | CRUD  | R (branch)    | R       | -    | -           | -             | -    | R (own)  |

### 8.3. Security Measures

- **Row Level Security:** Every table has RLS, enforced at DB level
- **Security Headers:** Vercel config (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **CORS:** Explicit allowlist: `['https://admin.comtammatu.com', 'https://pos.comtammatu.com', 'https://app.comtammatu.com']`
- **Input Validation:** Zod schemas for every API endpoint + Prisma type-safe queries
- **Generic Error Responses:** Never reveal whether user exists (prevents enumeration)
- **Audit Logging:** Append-only `audit_logs` + `security_events` tables
- **Payment:** No card data stored — PCI DSS SAQ A via 3rd party tokenization (VNPay, Momo, Stripe)
- **Backup:** Supabase Pro daily backups + point-in-time recovery

---

## 9. API Security & Rate Limiting (v2.1 new)

### 9.1. Rate Limiting Strategy

Using Upstash Redis with `@upstash/ratelimit` in Next.js middleware:

| Endpoint Category                | Limit         | Window     |
| -------------------------------- | ------------- | ---------- |
| Login / Auth                     | 5 requests    | 15 minutes |
| Data queries (GET)               | 100 requests  | 1 minute   |
| Data mutations (POST/PUT/DELETE) | 30 requests   | 1 minute   |
| Payment webhooks                 | 1000 requests | 1 minute   |
| Bulk exports                     | 5 requests    | 1 hour     |
| Customer app (public)            | 20 requests   | 1 minute   |

### 9.2. DDoS Protection

- Vercel provides baseline DDoS protection on all plans
- Cloudflare DNS proxy for additional protection (if configured)
- Expensive operations (data exports) limited by date range (max 365 days) and rate limit
- Supabase Realtime subscriptions scoped to user's branch only (prevents channel enumeration)

### 9.3. Webhook Security

Payment callback webhooks verify HMAC signatures:

```typescript
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

All webhooks implement: signature verification, timestamp validation (reject > 5 min old), nonce/idempotency checking, and IP allowlisting (where provider supports it).

### 9.4. API Authentication Boundaries

| Endpoint              | Auth Required  | Notes                               |
| --------------------- | -------------- | ----------------------------------- |
| `/api/auth/*`         | No             | Login, register, password reset     |
| `/api/webhooks/*`     | HMAC signature | Payment callbacks                   |
| `/api/public/*`       | Optional       | Menu viewing, customer registration |
| `/api/*` (all others) | JWT required   | RLS enforced at DB level            |

---

## 10. Payment Security & PCI DSS Compliance (v2.1 new)

### 10.1. PCI DSS Scope: SAQ A

The system is designed for **PCI DSS SAQ A** (Self-Assessment Questionnaire A) compliance — all card data is handled exclusively by the payment provider (VNPay, Momo, Stripe). Card data **NEVER** touches our infrastructure:

**Payment Data Flow:**

1. Customer presents card → Cashier selects "Card" on POS
2. POS redirects to payment provider's hosted checkout / SDK
3. Payment provider processes card, returns token + transaction reference
4. Our system stores ONLY: `reference_no` (provider transaction ID), `method`, `amount`, `status`
5. No card numbers, CVV, expiry dates, or cardholder names stored anywhere

**Explicit Restrictions:**

- Card data NEVER appears in IndexedDB, Supabase, Vercel, or any logs
- Offline card payments are code-blocked (see Section 7.2)
- Payment tokens from providers are NOT stored (stateless integration)
- Payment provider API keys stored in Supabase Vault (server-side only)

### 10.2. Token Lifecycle

- Payment tokens are ephemeral (used once, discarded)
- No recurring billing = no stored payment methods
- If future recurring billing needed: use Stripe Customer + Payment Method API (provider-hosted)

### 10.3. PCI Compliance Checklist

- SAQ A annual self-assessment
- Payment provider PCI DSS Level 1 certification verified
- No card data in logs (Sentry data sanitization configured)
- Webhook signature verification on all payment callbacks
- Payment API keys rotated every 90 days

---

## 11. Data Privacy & GDPR Compliance (v2.1 new)

### 11.1. Data Retention Policy

| Data Type                | Retention Period                 | Action After Expiry                         |
| ------------------------ | -------------------------------- | ------------------------------------------- |
| Customer profiles        | 3 years after last purchase      | Delete (or anonymize if legal hold)         |
| Order history            | 7 years (accounting requirement) | Anonymize (remove customer_id) after 1 year |
| Loyalty transactions     | 2 years after last activity      | Delete                                      |
| Payment references       | 7 years (PCI DSS / tax)          | Delete                                      |
| Employee records         | 6 years after separation         | Delete                                      |
| Audit logs               | 7 years                          | Archive to cold storage, pseudonymize PII   |
| Security events          | 2 years                          | Delete                                      |
| Offline data (IndexedDB) | Until sync confirmed             | Auto-clear after confirmed sync             |

### 11.2. Right to Erasure (GDPR Article 17)

**Deletion Request Flow:**

1. Customer requests deletion via API (`POST /api/privacy/deletion-request`)
2. System creates `deletion_requests` record with 30-day grace period
3. Confirmation email sent to customer (option to cancel within 30 days)
4. After 30 days, scheduled Edge Function executes deletion:
   - Anonymize orders (set `customer_id = NULL`)
   - Delete loyalty transactions
   - Delete customer profile
   - Delete from Supabase Storage
   - Log deletion in audit trail (without PII)

### 11.3. Data Subject Access Request (DSAR)

`POST /api/privacy/data-export` generates a JSON/CSV export of all customer data: profile, orders, loyalty history, feedback. Delivered via secure download link (expires in 24h).

### 11.4. Audit Log Pseudonymization

Customer PII in audit logs is hashed (SHA-256) before storage. User IDs are stored directly (internal identifiers), but phone numbers and email addresses are hashed. This allows audit trail integrity while complying with GDPR deletion requirements.

### 11.5. Automatic Retention Jobs

A Supabase Edge Function runs daily (cron) to enforce retention policies: anonymize old orders, delete expired loyalty points, clean up temporary files, and process completed deletion requests.

---

## 12. Secrets Management & Key Rotation (v2.1 new)

### 12.1. Secrets Architecture

```
Vercel Environment Variables (encrypted at rest):
  - NEXT_PUBLIC_SUPABASE_URL (public)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (public, RLS-protected)
  - SUPABASE_SERVICE_ROLE_KEY (server-side only)
  - SENTRY_DSN (server-side only)
  - UPSTASH_REDIS_URL (server-side only)

Supabase Vault (server-side only, accessed via Edge Functions):
  - Payment gateway API keys (VNPay, Momo, Stripe)
  - Webhook signing secrets
  - SMTP credentials
  - Third-party integration keys

Local Development:
  - .env.local (git-ignored)
```

### 12.2. Rotation Schedule

| Secret Type               | Rotation Frequency | Method                                                         |
| ------------------------- | ------------------ | -------------------------------------------------------------- |
| Payment API keys          | Every 90 days      | Manual rotation via provider dashboard + Supabase Vault update |
| Supabase service role key | Every 180 days     | Supabase dashboard                                             |
| Webhook signing secrets   | Every 90 days      | Coordinated with payment provider                              |
| SMTP credentials          | Every 180 days     | Email provider dashboard                                       |
| Database password         | Every 180 days     | Supabase dashboard                                             |

### 12.3. Emergency Key Revocation

If a secret is compromised: (1) Immediately rotate the compromised key, (2) Audit recent activity using `security_events`, (3) Notify affected users if data breach, (4) Document incident in postmortem.

### 12.4. Sensitive Data Masking

Sentry is configured to strip sensitive headers and data:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["X-API-Key"];
      delete event.request.headers["Cookie"];
    }
    return event;
  },
});
```

---

## 13. CI/CD, DevSecOps & Supply Chain Security (v2.1 new)

### 13.1. GitHub + Vercel Auto-Deploy

**Git Branching Strategy:**

- `main` — Production (auto-deploy to comtammatu.vercel.app)
- `staging` — Staging environment (auto-deploy to staging-comtammatu.vercel.app)
- `feature/*` — Feature branches (Vercel preview deployments)

**Branch Protection Rules:** Required reviews (1+), status checks must pass, no force push to main/staging.

### 13.2. GitHub Actions Pipeline

```
Push/PR → Trigger CI Pipeline:
  1. Install dependencies (pnpm install --frozen-lockfile)
  2. Secrets scanning (TruffleHog)
  3. Dependency vulnerability scan (npm audit + Snyk)
  4. Type check (tsc --noEmit)
  5. Lint (eslint)
  6. Unit tests (vitest)
  7. RLS policy validation tests (against Supabase local)
  8. Integration tests (against Supabase local)
  9. SBOM generation (CycloneDX)
  10. Vercel auto-deploy (production on main merge)
  11. Supabase migrations (supabase db push on main)
```

### 13.3. Pre-Commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ["--baseline", ".secrets.baseline"]
```

### 13.4. Supply Chain Security

- **SBOM:** Generated on every build using CycloneDX
- **Dependency scanning:** `npm audit` + Snyk in CI pipeline
- **Dependabot:** Automated weekly patch updates, manual review for major versions
- **Pinned GitHub Actions:** All actions pinned to SHA hashes (not version tags)
- **Lock file:** `pnpm-lock.yaml` committed and used with `--frozen-lockfile`

### 13.5. Database Migrations

- Dev: `supabase start` (local PostgreSQL via Docker)
- Migration: `supabase migration new <name>` → write SQL → `supabase db push`
- Staging: Supabase Branch (preview database per PR)
- Production: `supabase db push --linked`
- Rollback: `supabase migration repair` + apply reverse migration

---

## 14. Backup, Disaster Recovery & Incident Response (v2.1 new)

### 14.1. Backup Strategy

| Component           | Backup Method                         | Frequency        | Retention |
| ------------------- | ------------------------------------- | ---------------- | --------- |
| Supabase PostgreSQL | Supabase Pro automatic backups        | Daily            | 7 days    |
| Supabase PostgreSQL | Point-in-time recovery (PITR)         | Continuous (WAL) | 7 days    |
| Supabase Storage    | Included in Supabase backup           | Daily            | 7 days    |
| Vercel deployments  | Immutable deployments (auto-retained) | Every deploy     | 30 days   |
| Git repository      | GitHub (source of truth)              | Every push       | Unlimited |

### 14.2. Disaster Recovery

- **RPO (Recovery Point Objective):** < 1 hour (PITR)
- **RTO (Recovery Time Objective):** < 2 hours
- **Recovery procedure:** Restore from Supabase PITR → Verify data integrity → Switch DNS → Validate POS connectivity
- **Cross-region:** Not required for 5-10 branches. If needed, Supabase supports read replicas.

### 14.3. Incident Response Plan

1. **Detection:** Sentry alerts, security_events monitoring, user reports
2. **Triage:** Classify severity (P1-P4), assign incident commander
3. **Containment:** Disable affected terminal/user, block IP if needed
4. **Resolution:** Fix root cause, deploy patch
5. **Communication:** Notify affected users (if data breach)
6. **Postmortem:** Document incident, identify improvements, update runbook

---

## 15. Detailed Cost Comparison

| Item              | Enterprise (v1)                | Lightweight (v2.1)             | Savings    |
| ----------------- | ------------------------------ | ------------------------------ | ---------- |
| Compute (hosting) | K8s 3 nodes: $400-600          | Vercel Pro: $20                | 95%        |
| Database          | RDS multi-instance: $750-1,200 | Supabase Pro: $25              | 97%        |
| Cache             | ElastiCache: $300-500          | Included in Supabase           | 100%       |
| Message Broker    | CloudAMQP: $100-200            | Supabase Realtime + Triggers   | 100%       |
| File Storage      | S3: $50-100                    | Supabase Storage: Included     | 100%       |
| Search            | Elasticsearch: $200-400        | PostgreSQL FTS: Included       | 100%       |
| Monitoring        | Grafana + ELK: $200-400        | Vercel Analytics + Sentry free | 100%       |
| Auth              | Custom build: dev time         | Supabase Auth: Included        | 100%       |
| Rate Limiting     | Custom Redis: $50-100          | Upstash Redis: $0-10           | 90%        |
| **TOTAL**         | **$1,800 - $3,000/mo**         | **$45 - $120/mo**              | **96-97%** |
| Team size         | 5-8 developers                 | 2-3 developers                 | 50-60%     |
| Time to MVP       | 3-4 months                     | 4-6 weeks                      | 60-70%     |

---

## 16. Conclusion

> **Development Roadmap & Migration Path** → See [`ROADMAP.md`](./ROADMAP.md)

Lightweight v2.1 delivers:

- **96-97% cost reduction:** from $1,800-3,000 down to $45-120/month
- **60-70% faster MVP:** from 3-4 months down to 4-6 weeks
- **50-60% smaller team:** from 5-8 down to 2-3 developers
- **Full feature set:** Split POS (mobile order + cashier station), KDS, Order, Inventory, HR, CRM, Loyalty
- **Production-ready security:** RLS, MFA, audit logging, idempotency, PCI DSS SAQ A, GDPR compliance
- **Hardened database:** All PostgreSQL best practices (BIGINT IDENTITY, TEXT, TIMESTAMPTZ, NUMERIC, CHECK constraints, FK indexes, composite indexes, GIN indexes)
- **API protection:** Rate limiting, DDoS protection, webhook signature verification, generic error responses
- **Secrets management:** Supabase Vault for sensitive keys, automated rotation schedule, pre-commit scanning
- **Data privacy:** GDPR right-to-erasure, data retention policies, audit log pseudonymization
- **Offline POS:** PBKDF2 600K iteration encryption, secure key lifecycle, automatic reconciliation
- **DevSecOps:** SBOM generation, dependency scanning, pinned actions, branch protection
- **Disaster recovery:** Daily backups + PITR, documented incident response plan
- **Clear migration path:** From Monolith → Microservices when scaling is needed

The system is ready to start development immediately with 2-3 developers. MVP can go live after 8 weeks.
