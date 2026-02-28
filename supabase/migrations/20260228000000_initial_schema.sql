-- ============================================================
-- Com Tam Ma Tu F&B CRM — Initial Schema v2.1
-- Migration: 20260228000000_initial_schema.sql
-- Architecture: docs/F&B_CRM_Lightweight_Architecture_v2.1.md
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auth context helpers (SECURITY DEFINER to avoid RLS recursion)
-- Uses plpgsql for deferred name resolution (profiles table created later)
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS BIGINT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION auth_branch_id()
RETURNS BIGINT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (SELECT branch_id FROM profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$;

-- ============================================================
-- TIER 1: tenants
-- ============================================================

CREATE TABLE tenants (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  logo_url          TEXT,
  settings          JSONB,
  subscription_plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (subscription_plan IN ('free', 'starter', 'pro', 'enterprise')),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active) WHERE is_active = true;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TIER 2: loyalty_tiers, branches, menus, ingredients,
--         suppliers, campaigns, vouchers
-- (all depend only on tenants)
-- ============================================================

CREATE TABLE loyalty_tiers (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id    BIGINT NOT NULL,
  name         TEXT NOT NULL,
  min_points   INT NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) CHECK (discount_pct >= 0 AND discount_pct <= 100),
  benefits     JSONB,
  sort_order   INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_loyalty_tiers_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_loyalty_tiers_tenant_id ON loyalty_tiers(tenant_id);

-- ----

CREATE TABLE branches (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  address         TEXT NOT NULL,
  phone           TEXT NOT NULL,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  operating_hours JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_branches_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uniq_branch_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX idx_branches_tenant_active ON branches(tenant_id, is_active);

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE menus (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  branches   BIGINT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_menus_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX idx_menus_active ON menus(tenant_id, is_active);
CREATE INDEX idx_menus_branches ON menus USING GIN(branches);

CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE ingredients (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  name        TEXT NOT NULL,
  sku         TEXT,
  unit        TEXT NOT NULL,
  category    TEXT,
  min_stock   NUMERIC(14,4),
  max_stock   NUMERIC(14,4),
  cost_price  NUMERIC(12,4),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_ingredients_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT chk_stock_thresholds CHECK (min_stock >= 0 AND (max_stock IS NULL OR max_stock >= min_stock)),
  CONSTRAINT chk_cost_price CHECK (cost_price IS NULL OR cost_price >= 0)
);

CREATE INDEX idx_ingredients_tenant_id ON ingredients(tenant_id);
CREATE INDEX idx_ingredients_sku ON ingredients(tenant_id, sku);

CREATE TRIGGER trg_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE suppliers (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     BIGINT NOT NULL,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  payment_terms TEXT,
  rating        INT CHECK (rating >= 1 AND rating <= 5),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE campaigns (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  target_segment   JSONB,
  content          JSONB,
  scheduled_at     TIMESTAMPTZ,
  sent_count       INT DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sent', 'completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_campaigns_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status, scheduled_at DESC);

-- ----

CREATE TABLE vouchers (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id    BIGINT NOT NULL,
  code         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'free_item')),
  value        NUMERIC(12,2) NOT NULL CHECK (value > 0),
  min_order    NUMERIC(12,2),
  max_discount NUMERIC(12,2),
  valid_from   TIMESTAMPTZ NOT NULL,
  valid_to     TIMESTAMPTZ NOT NULL,
  max_uses     INT,
  used_count   INT NOT NULL DEFAULT 0,
  branches     BIGINT[],
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_vouchers_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uniq_voucher_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_voucher_dates CHECK (valid_from <= valid_to),
  CONSTRAINT chk_voucher_uses CHECK (used_count <= max_uses OR max_uses IS NULL)
);

CREATE INDEX idx_vouchers_tenant_id ON vouchers(tenant_id);
CREATE INDEX idx_vouchers_code ON vouchers(tenant_id, code);
CREATE INDEX idx_vouchers_active ON vouchers(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_vouchers_branches ON vouchers USING GIN(branches);

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TIER 3: profiles, branch_zones, menu_categories, customers
-- ============================================================

CREATE TABLE profiles (
  id         UUID PRIMARY KEY,   -- Maps to auth.users.id
  tenant_id  BIGINT NOT NULL,
  branch_id  BIGINT,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL
    CHECK (role IN ('owner', 'manager', 'cashier', 'chef', 'waiter', 'inventory', 'hr', 'customer')),
  avatar_url TEXT,
  settings   JSONB,
  is_active  BOOLEAN NOT NULL DEFAULT true,
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

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE branch_zones (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id   BIGINT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('dining', 'bar', 'outdoor', 'other')),
  table_count INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_zones_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX idx_branch_zones_branch_id ON branch_zones(branch_id);

-- ----

CREATE TABLE menu_categories (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_id    BIGINT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT,
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_categories_menu FOREIGN KEY (menu_id)
    REFERENCES menus(id) ON DELETE CASCADE
);

CREATE INDEX idx_menu_categories_menu_id ON menu_categories(menu_id);
CREATE INDEX idx_menu_categories_sort ON menu_categories(menu_id, sort_order);

-- ----

CREATE TABLE customers (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  full_name       TEXT NOT NULL,
  gender          TEXT CHECK (gender IN ('M', 'F', 'Other')),
  birthday        DATE,
  source          TEXT CHECK (source IN ('pos', 'app', 'website')),
  first_visit     DATE,
  last_visit      DATE,
  total_visits    INT NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  total_spent     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  loyalty_tier_id BIGINT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_customers_tier FOREIGN KEY (loyalty_tier_id)
    REFERENCES loyalty_tiers(id),
  CONSTRAINT uniq_customer_phone UNIQUE (tenant_id, phone),
  CONSTRAINT uniq_customer_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_tier_id ON customers(loyalty_tier_id);
CREATE INDEX idx_customers_last_visit ON customers(tenant_id, last_visit DESC);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TIER 4: tables, menu_items, pos_terminals, kds_stations,
--         employees, payroll_periods, purchase_orders
-- ============================================================

CREATE TABLE tables (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zone_id     BIGINT NOT NULL,
  branch_id   BIGINT NOT NULL,
  number      INT NOT NULL,
  capacity    INT,
  status      TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  qr_code_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_tables_zone FOREIGN KEY (zone_id)
    REFERENCES branch_zones(id) ON DELETE CASCADE,
  CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uniq_table_in_zone UNIQUE (zone_id, number)
);

CREATE INDEX idx_tables_zone_id ON tables(zone_id);
CREATE INDEX idx_tables_branch_id ON tables(branch_id);
CREATE INDEX idx_tables_status ON tables(branch_id, status);

-- ----

CREATE TABLE menu_items (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id  BIGINT NOT NULL,
  tenant_id    BIGINT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  base_price   NUMERIC(12,2) NOT NULL,
  image_url    TEXT,
  prep_time_min INT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  allergens    TEXT[],
  nutrition    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_items_category FOREIGN KEY (category_id)
    REFERENCES menu_categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT chk_price_positive CHECK (base_price > 0),
  CONSTRAINT chk_prep_time_valid CHECK (prep_time_min IS NULL OR prep_time_min >= 0)
);

CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_available ON menu_items(category_id, is_available) WHERE is_available = true;
CREATE INDEX idx_menu_items_allergens ON menu_items USING GIN(allergens);
CREATE INDEX idx_menu_items_fts ON menu_items USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE pos_terminals (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id          BIGINT NOT NULL,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('mobile_order', 'cashier_station')),
  device_fingerprint TEXT NOT NULL UNIQUE,
  peripheral_config  JSONB,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  last_seen_at       TIMESTAMPTZ,
  registered_by      UUID,
  approved_by        UUID,
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

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

CREATE TRIGGER trg_pos_terminals_updated_at
  BEFORE UPDATE ON pos_terminals
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE kds_stations (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id      BIGINT NOT NULL,
  name           TEXT NOT NULL,
  display_config JSONB,
  categories     BIGINT[],
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_kds_stations_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX idx_kds_stations_branch_id ON kds_stations(branch_id);
CREATE INDEX idx_kds_stations_categories ON kds_stations USING GIN(categories);

-- ----

CREATE TABLE employees (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id       UUID NOT NULL UNIQUE,
  tenant_id        BIGINT NOT NULL,
  branch_id        BIGINT NOT NULL,
  position         TEXT NOT NULL,
  department       TEXT,
  hire_date        DATE NOT NULL,
  employment_type  TEXT NOT NULL CHECK (employment_type IN ('full', 'part', 'contract')),
  hourly_rate      NUMERIC(12,2) CHECK (hourly_rate IS NULL OR hourly_rate > 0),
  monthly_salary   NUMERIC(14,2) CHECK (monthly_salary IS NULL OR monthly_salary > 0),
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  emergency_contact JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_employees_profile FOREIGN KEY (profile_id)
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id)
);

CREATE INDEX idx_employees_profile_id ON employees(profile_id);
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_employees_branch_id ON employees(branch_id);
CREATE INDEX idx_employees_status ON employees(branch_id, status);

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE payroll_periods (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id    BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'completed')),
  total        NUMERIC(14,2),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payroll_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_processor FOREIGN KEY (processed_by)
    REFERENCES profiles(id),
  CONSTRAINT chk_payroll_dates CHECK (period_start < period_end)
);

CREATE INDEX idx_payroll_periods_tenant_id ON payroll_periods(tenant_id);
CREATE INDEX idx_payroll_periods_date_range ON payroll_periods(period_start, period_end);

-- ----

CREATE TABLE purchase_orders (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  branch_id   BIGINT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  total       NUMERIC(14,2),
  ordered_at  TIMESTAMPTZ,
  expected_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by  UUID NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_po_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id)
    REFERENCES suppliers(id),
  CONSTRAINT fk_po_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id),
  CONSTRAINT fk_po_creator FOREIGN KEY (created_by)
    REFERENCES profiles(id),
  CONSTRAINT chk_po_dates CHECK (ordered_at IS NULL OR expected_at IS NULL OR ordered_at <= expected_at)
);

CREATE INDEX idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_branch_id ON purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status, created_at DESC);

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TIER 5: menu_item_variants, menu_item_modifiers, recipes,
--         stock_levels, pos_sessions, shifts, payroll_items,
--         loyalty_transactions
-- ============================================================

CREATE TABLE menu_item_variants (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id     BIGINT NOT NULL,
  name             TEXT NOT NULL,
  price_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available     BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_variants_item FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_variants_item_id ON menu_item_variants(menu_item_id);

-- ----

CREATE TABLE menu_item_modifiers (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id   BIGINT NOT NULL,
  name           TEXT NOT NULL,
  options        JSONB,
  max_selections INT,
  is_required    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_modifiers_item FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_modifiers_item_id ON menu_item_modifiers(menu_item_id);

-- ----

CREATE TABLE recipes (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id BIGINT NOT NULL UNIQUE,
  yield_qty    NUMERIC(14,4),
  yield_unit   TEXT,
  total_cost   NUMERIC(14,4),
  version      INT NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_recipes_item FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipes_menu_item_id ON recipes(menu_item_id);

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE stock_levels (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingredient_id BIGINT NOT NULL,
  branch_id     BIGINT NOT NULL,
  quantity      NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  version       INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_stock_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uniq_stock_location UNIQUE (ingredient_id, branch_id)
);

CREATE INDEX idx_stock_levels_ingredient_id ON stock_levels(ingredient_id);
CREATE INDEX idx_stock_levels_branch_id ON stock_levels(branch_id);
CREATE INDEX idx_stock_levels_version ON stock_levels(ingredient_id, branch_id, version);

-- Enforce cashier_station for pos_sessions
CREATE OR REPLACE FUNCTION check_cashier_station_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pos_terminals
    WHERE id = NEW.terminal_id AND type = 'cashier_station'
  ) THEN
    RAISE EXCEPTION 'Only cashier_station terminals can open POS sessions';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE pos_sessions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id       BIGINT NOT NULL,
  terminal_id     BIGINT NOT NULL,
  cashier_id      UUID NOT NULL,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  opening_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_amount  NUMERIC(14,2),
  expected_amount NUMERIC(14,2),
  difference      NUMERIC(14,2),
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'suspended')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_sessions_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_terminal FOREIGN KEY (terminal_id)
    REFERENCES pos_terminals(id),
  CONSTRAINT fk_sessions_cashier FOREIGN KEY (cashier_id)
    REFERENCES profiles(id)
);

CREATE INDEX idx_pos_sessions_branch_id ON pos_sessions(branch_id);
CREATE INDEX idx_pos_sessions_terminal_id ON pos_sessions(terminal_id);
CREATE INDEX idx_pos_sessions_cashier_id ON pos_sessions(cashier_id);
CREATE INDEX idx_pos_sessions_open ON pos_sessions(branch_id, status) WHERE status = 'open';
CREATE INDEX idx_pos_sessions_opened_at ON pos_sessions(opened_at DESC);

CREATE TRIGGER enforce_cashier_station_session
  BEFORE INSERT ON pos_sessions
  FOR EACH ROW EXECUTE FUNCTION check_cashier_station_session();

CREATE TRIGGER trg_pos_sessions_updated_at
  BEFORE UPDATE ON pos_sessions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE shifts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id     BIGINT NOT NULL,
  name          TEXT NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  break_min     INT,
  max_employees INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_shifts_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT chk_shift_times CHECK (start_time < end_time)
);

CREATE INDEX idx_shifts_branch_id ON shifts(branch_id);

-- ----

CREATE TABLE payroll_items (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_id    BIGINT NOT NULL,
  employee_id  BIGINT NOT NULL,
  base_pay     NUMERIC(14,2) CHECK (base_pay IS NULL OR base_pay >= 0),
  overtime_pay NUMERIC(14,2) CHECK (overtime_pay IS NULL OR overtime_pay >= 0),
  tips         NUMERIC(14,2) CHECK (tips IS NULL OR tips >= 0),
  bonuses      NUMERIC(14,2) CHECK (bonuses IS NULL OR bonuses >= 0),
  deductions   JSONB,
  tax          NUMERIC(14,2) CHECK (tax IS NULL OR tax >= 0),
  net_pay      NUMERIC(14,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payroll_items_period FOREIGN KEY (period_id)
    REFERENCES payroll_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_items_employee FOREIGN KEY (employee_id)
    REFERENCES employees(id)
);

CREATE INDEX idx_payroll_items_period_id ON payroll_items(period_id);
CREATE INDEX idx_payroll_items_employee_id ON payroll_items(employee_id);

-- ----

CREATE TABLE loyalty_transactions (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id    BIGINT NOT NULL,
  points         INT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust')),
  reference_type TEXT,
  reference_id   BIGINT,
  balance_after  INT,
  expires_at     DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_loyalty_trans_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(customer_id, type);
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);

-- ============================================================
-- TIER 6: orders, recipe_ingredients, purchase_order_items,
--         stock_movements, waste_logs, kds_timing_rules,
--         shift_assignments, attendance_records, leave_requests
-- ============================================================

CREATE TABLE orders (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number    TEXT NOT NULL,
  branch_id       BIGINT NOT NULL,
  table_id        BIGINT,
  customer_id     BIGINT,
  terminal_id     BIGINT NOT NULL,
  pos_session_id  BIGINT,
  type            TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_charge  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id)
    REFERENCES tables(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_terminal FOREIGN KEY (terminal_id)
    REFERENCES pos_terminals(id),
  CONSTRAINT fk_orders_session FOREIGN KEY (pos_session_id)
    REFERENCES pos_sessions(id),
  CONSTRAINT fk_orders_creator FOREIGN KEY (created_by)
    REFERENCES profiles(id),
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

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE recipe_ingredients (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id     BIGINT NOT NULL,
  ingredient_id BIGINT NOT NULL,
  quantity      NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  unit          TEXT NOT NULL,
  waste_pct     NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (waste_pct >= 0 AND waste_pct <= 100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_recipe_ing_recipe FOREIGN KEY (recipe_id)
    REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ing_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients(id)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- ----

CREATE TABLE purchase_order_items (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id         BIGINT NOT NULL,
  ingredient_id BIGINT NOT NULL,
  quantity      NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12,4) NOT NULL CHECK (unit_price > 0),
  received_qty  NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_po_items_po FOREIGN KEY (po_id)
    REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients(id)
);

CREATE INDEX idx_po_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_ingredient_id ON purchase_order_items(ingredient_id);

-- ----

CREATE TABLE stock_movements (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingredient_id  BIGINT NOT NULL,
  branch_id      BIGINT NOT NULL,
  type           TEXT NOT NULL
    CHECK (type IN ('in', 'out', 'transfer', 'waste', 'adjust')),
  quantity       NUMERIC(14,4) NOT NULL,
  reference_type TEXT,
  reference_id   BIGINT,
  cost_at_time   NUMERIC(14,4),
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_movement_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients(id),
  CONSTRAINT fk_movement_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id),
  CONSTRAINT fk_movement_user FOREIGN KEY (created_by)
    REFERENCES profiles(id)
);

CREATE INDEX idx_stock_movements_ingredient_id ON stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_branch_id ON stock_movements(branch_id);
CREATE INDEX idx_stock_movements_type_date ON stock_movements(ingredient_id, branch_id, type, created_at DESC);

-- ----

CREATE TABLE waste_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingredient_id BIGINT NOT NULL,
  branch_id     BIGINT NOT NULL,
  quantity      NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  reason        TEXT NOT NULL
    CHECK (reason IN ('expired', 'spoiled', 'overproduction', 'other')),
  notes         TEXT,
  logged_by     UUID NOT NULL,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_waste_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients(id),
  CONSTRAINT fk_waste_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id),
  CONSTRAINT fk_waste_user FOREIGN KEY (logged_by)
    REFERENCES profiles(id)
);

CREATE INDEX idx_waste_logs_ingredient_id ON waste_logs(ingredient_id);
CREATE INDEX idx_waste_logs_branch_id ON waste_logs(branch_id);
CREATE INDEX idx_waste_logs_reason ON waste_logs(reason, logged_at DESC);

-- ----

CREATE TABLE kds_timing_rules (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id    BIGINT NOT NULL,
  category_id   BIGINT NOT NULL,
  prep_time_min INT NOT NULL CHECK (prep_time_min > 0),
  warning_min   INT,
  critical_min  INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_timing_station FOREIGN KEY (station_id)
    REFERENCES kds_stations(id) ON DELETE CASCADE,
  CONSTRAINT fk_timing_category FOREIGN KEY (category_id)
    REFERENCES menu_categories(id) ON DELETE CASCADE,
  CONSTRAINT uniq_station_category UNIQUE (station_id, category_id)
);

CREATE INDEX idx_kds_timing_station_id ON kds_timing_rules(station_id);
CREATE INDEX idx_kds_timing_category_id ON kds_timing_rules(category_id);

-- ----

CREATE TABLE shift_assignments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id    BIGINT NOT NULL,
  employee_id BIGINT NOT NULL,
  date        DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'no_show')),
  swap_with   BIGINT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_assignment_shift FOREIGN KEY (shift_id)
    REFERENCES shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_employee FOREIGN KEY (employee_id)
    REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_swap FOREIGN KEY (swap_with)
    REFERENCES shift_assignments(id) ON DELETE SET NULL,
  CONSTRAINT uniq_shift_assignment UNIQUE (shift_id, employee_id, date)
);

CREATE INDEX idx_assignment_shift_id ON shift_assignments(shift_id);
CREATE INDEX idx_assignment_employee_id ON shift_assignments(employee_id);
CREATE INDEX idx_assignment_date ON shift_assignments(date, status);

-- ----

CREATE TABLE attendance_records (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id    BIGINT NOT NULL,
  branch_id      BIGINT NOT NULL,
  date           DATE NOT NULL,
  clock_in       TIMESTAMPTZ,
  clock_out      TIMESTAMPTZ,
  hours_worked   NUMERIC(5,2) CHECK (hours_worked IS NULL OR hours_worked >= 0),
  overtime_hours NUMERIC(5,2) CHECK (overtime_hours IS NULL OR overtime_hours >= 0),
  status         TEXT CHECK (status IN ('present', 'absent', 'late', 'early_leave')),
  source         TEXT NOT NULL
    CHECK (source IN ('qr', 'manual', 'pos_session', 'terminal_login')),
  terminal_id    BIGINT,
  pos_session_id BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id)
    REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id),
  CONSTRAINT fk_attendance_terminal FOREIGN KEY (terminal_id)
    REFERENCES pos_terminals(id),
  CONSTRAINT fk_attendance_session FOREIGN KEY (pos_session_id)
    REFERENCES pos_sessions(id),
  CONSTRAINT uniq_attendance_daily UNIQUE (employee_id, date)
);

CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_branch_id ON attendance_records(branch_id);
CREATE INDEX idx_attendance_date ON attendance_records(date, status);

-- ----

CREATE TABLE leave_requests (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  type        TEXT NOT NULL
    CHECK (type IN ('annual', 'sick', 'unpaid', 'maternity')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INT NOT NULL CHECK (days > 0),
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id)
    REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_approver FOREIGN KEY (approved_by)
    REFERENCES profiles(id),
  CONSTRAINT chk_leave_dates CHECK (start_date <= end_date)
);

CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ============================================================
-- TIER 7: order_items, order_discounts, order_status_history,
--         payments, customer_feedback
-- ============================================================

-- Enforce cashier_station for payments
CREATE OR REPLACE FUNCTION check_cashier_station_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pos_terminals
    WHERE id = NEW.terminal_id AND type = 'cashier_station'
  ) THEN
    RAISE EXCEPTION 'Only cashier_station terminals can process payments';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE order_items (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id       BIGINT NOT NULL,
  menu_item_id   BIGINT NOT NULL,
  variant_id     BIGINT,
  quantity       INT NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(12,2) NOT NULL,
  item_total     NUMERIC(14,2) NOT NULL,
  modifiers      JSONB,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent_to_kds', 'preparing', 'ready', 'served', 'cancelled')),
  kds_station_id BIGINT,
  sent_to_kds_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id),
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id)
    REFERENCES menu_item_variants(id),
  CONSTRAINT fk_order_items_station FOREIGN KEY (kds_station_id)
    REFERENCES kds_stations(id) ON DELETE SET NULL,
  CONSTRAINT chk_item_price_positive CHECK (unit_price > 0 AND item_total >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_id ON order_items(menu_item_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX idx_order_items_station_id ON order_items(kds_station_id);
CREATE INDEX idx_order_items_status ON order_items(order_id, status);

-- ----

CREATE TABLE order_discounts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   BIGINT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'voucher')),
  value      NUMERIC(12,2) NOT NULL CHECK (value > 0),
  reason     TEXT,
  applied_by UUID,
  voucher_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_discounts_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_discounts_applier FOREIGN KEY (applied_by)
    REFERENCES profiles(id),
  CONSTRAINT fk_discounts_voucher FOREIGN KEY (voucher_id)
    REFERENCES vouchers(id)
);

CREATE INDEX idx_order_discounts_order_id ON order_discounts(order_id);
CREATE INDEX idx_order_discounts_voucher_id ON order_discounts(voucher_id);

-- ----

CREATE TABLE order_status_history (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    BIGINT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID,
  terminal_id BIGINT,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_history_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by)
    REFERENCES profiles(id),
  CONSTRAINT fk_history_terminal FOREIGN KEY (terminal_id)
    REFERENCES pos_terminals(id)
);

CREATE INDEX idx_order_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_history_created_at ON order_status_history(created_at DESC);

-- ----

CREATE TABLE payments (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id        BIGINT NOT NULL,
  pos_session_id  BIGINT NOT NULL,
  terminal_id     BIGINT NOT NULL,
  method          TEXT NOT NULL
    CHECK (method IN ('cash', 'card', 'ewallet', 'qr')),
  provider        TEXT,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  tip             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tip >= 0),
  reference_no    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at         TIMESTAMPTZ,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_session FOREIGN KEY (pos_session_id)
    REFERENCES pos_sessions(id),
  CONSTRAINT fk_payments_terminal FOREIGN KEY (terminal_id)
    REFERENCES pos_terminals(id)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_session_id ON payments(pos_session_id);
CREATE INDEX idx_payments_terminal_id ON payments(terminal_id);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX idx_payments_method ON payments(method, created_at DESC);

CREATE TRIGGER enforce_cashier_station_payment
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION check_cashier_station_payment();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ----

CREATE TABLE customer_feedback (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  BIGINT,
  order_id     BIGINT,
  branch_id    BIGINT NOT NULL,
  rating       INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  response     TEXT,
  responded_by UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_feedback_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id),
  CONSTRAINT fk_feedback_responder FOREIGN KEY (responded_by)
    REFERENCES profiles(id)
);

CREATE INDEX idx_feedback_customer_id ON customer_feedback(customer_id);
CREATE INDEX idx_feedback_order_id ON customer_feedback(order_id);
CREATE INDEX idx_feedback_branch_id ON customer_feedback(branch_id);
CREATE INDEX idx_feedback_rating ON customer_feedback(branch_id, rating);

-- ============================================================
-- TIER 8: kds_tickets, audit_logs, security_events,
--         deletion_requests, notifications, system_settings
-- ============================================================

CREATE TABLE kds_tickets (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     BIGINT NOT NULL,
  station_id   BIGINT NOT NULL,
  items        JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'ready')),
  priority     INT,
  accepted_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  color_code   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_kds_tickets_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_kds_tickets_station FOREIGN KEY (station_id)
    REFERENCES kds_stations(id) ON DELETE CASCADE
);

CREATE INDEX idx_kds_tickets_order_id ON kds_tickets(order_id);
CREATE INDEX idx_kds_tickets_station_id ON kds_tickets(station_id);
CREATE INDEX idx_kds_tickets_status ON kds_tickets(station_id, status);
CREATE INDEX idx_kds_tickets_created_at ON kds_tickets(created_at DESC);

-- ----

CREATE TABLE audit_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     BIGINT NOT NULL,
  user_id       UUID NOT NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   BIGINT NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES profiles(id)
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(tenant_id, resource_type, resource_id);

-- APPEND ONLY: revoke UPDATE/DELETE at table-privilege level
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- ----

CREATE TABLE security_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   BIGINT,
  event_type  TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  source_ip   INET,
  user_id     UUID,
  terminal_id BIGINT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX idx_security_events_tenant ON security_events(tenant_id, created_at DESC);

-- APPEND ONLY
REVOKE UPDATE, DELETE ON security_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON security_events FROM authenticated;
GRANT SELECT, INSERT ON security_events TO authenticated;

-- ----

CREATE TABLE deletion_requests (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id           BIGINT NOT NULL,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cancelled', 'completed')),
  completed_at          TIMESTAMPTZ,
  processed_by          UUID,

  CONSTRAINT fk_deletion_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id)
);

CREATE INDEX idx_deletion_requests_status ON deletion_requests(status, scheduled_deletion_at);

-- ----

CREATE TABLE notifications (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  user_id     UUID,
  customer_id BIGINT,
  channel     TEXT NOT NULL
    CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ----

CREATE TABLE system_settings (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  key        TEXT NOT NULL,
  value      JSONB,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_settings_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by)
    REFERENCES profiles(id),
  CONSTRAINT uniq_setting_key UNIQUE (tenant_id, key)
);

CREATE INDEX idx_system_settings_tenant_id ON system_settings(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_zones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus                ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_terminals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_discounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_stations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_timing_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings      ENABLE ROW LEVEL SECURITY;

-- ---- tenants ----
CREATE POLICY "tenants_select_own" ON tenants FOR SELECT
  USING (id = auth_tenant_id());
CREATE POLICY "tenants_update_owner" ON tenants FOR UPDATE
  USING (id = auth_tenant_id() AND auth_role() = 'owner');

-- ---- branches ----
CREATE POLICY "branches_select_tenant" ON branches FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "branches_all_manager" ON branches FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- branch_zones ----
CREATE POLICY "zones_select_tenant" ON branch_zones FOR SELECT
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "zones_all_manager" ON branch_zones FOR ALL
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- tables ----
CREATE POLICY "tables_select_branch" ON tables FOR SELECT
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tables_update_staff" ON tables FOR UPDATE
  USING (branch_id = auth_branch_id());
CREATE POLICY "tables_all_manager" ON tables FOR ALL
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- profiles ----
CREATE POLICY "profiles_select_tenant" ON profiles FOR SELECT
  USING (id = auth.uid() OR tenant_id = auth_tenant_id());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "profiles_all_manager" ON profiles FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- menus ----
CREATE POLICY "menus_select_tenant" ON menus FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "menus_all_manager" ON menus FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- menu_categories ----
CREATE POLICY "menu_categories_select_tenant" ON menu_categories FOR SELECT
  USING (menu_id IN (SELECT id FROM menus WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "menu_categories_all_manager" ON menu_categories FOR ALL
  USING (menu_id IN (SELECT id FROM menus WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- menu_items ----
CREATE POLICY "menu_items_select_tenant" ON menu_items FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "menu_items_all_manager" ON menu_items FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- menu_item_variants ----
CREATE POLICY "variants_select_tenant" ON menu_item_variants FOR SELECT
  USING (menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "variants_all_manager" ON menu_item_variants FOR ALL
  USING (menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- menu_item_modifiers ----
CREATE POLICY "modifiers_select_tenant" ON menu_item_modifiers FOR SELECT
  USING (menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "modifiers_all_manager" ON menu_item_modifiers FOR ALL
  USING (menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- pos_terminals ----
CREATE POLICY "terminals_select_tenant" ON pos_terminals FOR SELECT
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "terminals_all_manager" ON pos_terminals FOR ALL
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- pos_sessions ----
CREATE POLICY "sessions_select_branch" ON pos_sessions FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "sessions_insert_cashier" ON pos_sessions FOR INSERT WITH CHECK (
  branch_id = auth_branch_id()
  AND auth_role() IN ('cashier', 'manager', 'owner')
);
CREATE POLICY "sessions_update_cashier" ON pos_sessions FOR UPDATE
  USING (branch_id = auth_branch_id() AND auth_role() IN ('cashier', 'manager', 'owner'));

-- ---- orders ----
CREATE POLICY "orders_select_branch" ON orders FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "orders_insert_staff" ON orders FOR INSERT WITH CHECK (
  branch_id = auth_branch_id()
  AND auth_role() IN ('waiter', 'cashier', 'manager', 'owner')
);
CREATE POLICY "orders_update_staff" ON orders FOR UPDATE
  USING (branch_id = auth_branch_id()
    AND auth_role() IN ('waiter', 'cashier', 'manager', 'owner'));

-- ---- order_items ----
CREATE POLICY "order_items_select_branch" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE branch_id = auth_branch_id()));
CREATE POLICY "order_items_all_staff" ON order_items FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE branch_id = auth_branch_id())
    AND auth_role() IN ('waiter', 'cashier', 'manager', 'owner', 'chef'));

-- ---- order_discounts ----
CREATE POLICY "discounts_select_branch" ON order_discounts FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE branch_id = auth_branch_id()));
CREATE POLICY "discounts_all_cashier" ON order_discounts FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE branch_id = auth_branch_id())
    AND auth_role() IN ('cashier', 'manager', 'owner'));

-- ---- order_status_history ----
CREATE POLICY "order_history_select_branch" ON order_status_history FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE branch_id = auth_branch_id()));
CREATE POLICY "order_history_insert_staff" ON order_status_history FOR INSERT WITH CHECK (
  order_id IN (SELECT id FROM orders WHERE branch_id = auth_branch_id())
);

-- ---- payments ----
CREATE POLICY "payments_select_branch" ON payments FOR SELECT
  USING (pos_session_id IN (SELECT id FROM pos_sessions WHERE branch_id = auth_branch_id()));
CREATE POLICY "payments_insert_cashier" ON payments FOR INSERT WITH CHECK (
  auth_role() IN ('cashier', 'manager', 'owner')
  AND EXISTS (
    SELECT 1 FROM pos_terminals WHERE id = terminal_id AND type = 'cashier_station'
  )
);
CREATE POLICY "payments_update_manager" ON payments FOR UPDATE
  USING (pos_session_id IN (SELECT id FROM pos_sessions WHERE branch_id = auth_branch_id())
    AND auth_role() IN ('manager', 'owner'));

-- ---- kds_stations ----
CREATE POLICY "kds_stations_select_branch" ON kds_stations FOR SELECT
  USING (branch_id = auth_branch_id());
CREATE POLICY "kds_stations_all_manager" ON kds_stations FOR ALL
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));

-- ---- kds_tickets ----
CREATE POLICY "kds_tickets_select_branch" ON kds_tickets FOR SELECT
  USING (station_id IN (SELECT id FROM kds_stations WHERE branch_id = auth_branch_id()));
CREATE POLICY "kds_tickets_insert_staff" ON kds_tickets FOR INSERT WITH CHECK (
  station_id IN (SELECT id FROM kds_stations WHERE branch_id = auth_branch_id())
);
CREATE POLICY "kds_tickets_update_chef" ON kds_tickets FOR UPDATE
  USING (station_id IN (SELECT id FROM kds_stations WHERE branch_id = auth_branch_id())
    AND auth_role() IN ('chef', 'manager', 'owner'));

-- ---- kds_timing_rules ----
CREATE POLICY "kds_timing_select_branch" ON kds_timing_rules FOR SELECT
  USING (station_id IN (SELECT id FROM kds_stations WHERE branch_id = auth_branch_id()));
CREATE POLICY "kds_timing_all_manager" ON kds_timing_rules FOR ALL
  USING (station_id IN (
    SELECT s.id FROM kds_stations s
    JOIN branches b ON s.branch_id = b.id
    WHERE b.tenant_id = auth_tenant_id()
  ) AND auth_role() IN ('owner', 'manager'));

-- ---- ingredients ----
CREATE POLICY "ingredients_select_tenant" ON ingredients FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "ingredients_all_inventory" ON ingredients FOR ALL
  USING (tenant_id = auth_tenant_id()
    AND auth_role() IN ('inventory', 'manager', 'owner'));

-- ---- suppliers ----
CREATE POLICY "suppliers_select_tenant" ON suppliers FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "suppliers_all_inventory" ON suppliers FOR ALL
  USING (tenant_id = auth_tenant_id()
    AND auth_role() IN ('inventory', 'manager', 'owner'));

-- ---- recipes ----
CREATE POLICY "recipes_select_tenant" ON recipes FOR SELECT
  USING (menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "recipes_all_manager" ON recipes FOR ALL
  USING (menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('manager', 'owner'));

-- ---- recipe_ingredients ----
CREATE POLICY "recipe_ing_select_tenant" ON recipe_ingredients FOR SELECT
  USING (recipe_id IN (
    SELECT r.id FROM recipes r
    JOIN menu_items m ON r.menu_item_id = m.id
    WHERE m.tenant_id = auth_tenant_id()
  ));
CREATE POLICY "recipe_ing_all_manager" ON recipe_ingredients FOR ALL
  USING (recipe_id IN (
    SELECT r.id FROM recipes r
    JOIN menu_items m ON r.menu_item_id = m.id
    WHERE m.tenant_id = auth_tenant_id()
  ) AND auth_role() IN ('manager', 'owner'));

-- ---- stock_levels ----
CREATE POLICY "stock_levels_select_branch" ON stock_levels FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager'));
CREATE POLICY "stock_levels_update_inventory" ON stock_levels FOR UPDATE
  USING (branch_id = auth_branch_id()
    AND auth_role() IN ('inventory', 'manager', 'owner'));
CREATE POLICY "stock_levels_insert_inventory" ON stock_levels FOR INSERT WITH CHECK (
  branch_id = auth_branch_id()
  AND auth_role() IN ('inventory', 'manager', 'owner')
);

-- ---- stock_movements ----
CREATE POLICY "stock_movements_select_branch" ON stock_movements FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager'));
CREATE POLICY "stock_movements_insert_inventory" ON stock_movements FOR INSERT WITH CHECK (
  branch_id = auth_branch_id()
  AND auth_role() IN ('inventory', 'manager', 'owner')
);

-- ---- waste_logs ----
CREATE POLICY "waste_logs_select_branch" ON waste_logs FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager'));
CREATE POLICY "waste_logs_insert_inventory" ON waste_logs FOR INSERT WITH CHECK (
  branch_id = auth_branch_id()
  AND auth_role() IN ('inventory', 'manager', 'owner')
);

-- ---- purchase_orders ----
CREATE POLICY "po_select_tenant" ON purchase_orders FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "po_all_inventory" ON purchase_orders FOR ALL
  USING (tenant_id = auth_tenant_id()
    AND auth_role() IN ('inventory', 'manager', 'owner'));

-- ---- purchase_order_items ----
CREATE POLICY "po_items_select_tenant" ON purchase_order_items FOR SELECT
  USING (po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "po_items_all_inventory" ON purchase_order_items FOR ALL
  USING (po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('inventory', 'manager', 'owner'));

-- ---- customers ----
CREATE POLICY "customers_select_tenant" ON customers FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "customers_all_staff" ON customers FOR ALL
  USING (tenant_id = auth_tenant_id()
    AND auth_role() IN ('cashier', 'manager', 'owner'));

-- ---- loyalty_tiers ----
CREATE POLICY "loyalty_tiers_select_tenant" ON loyalty_tiers FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "loyalty_tiers_all_manager" ON loyalty_tiers FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- loyalty_transactions ----
CREATE POLICY "loyalty_trans_select_tenant" ON loyalty_transactions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "loyalty_trans_insert_staff" ON loyalty_transactions FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE tenant_id = auth_tenant_id())
  AND auth_role() IN ('cashier', 'manager', 'owner')
);

-- ---- vouchers ----
CREATE POLICY "vouchers_select_tenant" ON vouchers FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "vouchers_all_manager" ON vouchers FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- campaigns ----
CREATE POLICY "campaigns_select_tenant" ON campaigns FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "campaigns_all_manager" ON campaigns FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));

-- ---- customer_feedback ----
CREATE POLICY "feedback_select_branch" ON customer_feedback FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager'));
CREATE POLICY "feedback_insert_any" ON customer_feedback FOR INSERT WITH CHECK (
  branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
);
CREATE POLICY "feedback_update_manager" ON customer_feedback FOR UPDATE
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('manager', 'owner'));

-- ---- employees ----
CREATE POLICY "employees_select_branch" ON employees FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager'));
CREATE POLICY "employees_all_hr" ON employees FOR ALL
  USING (tenant_id = auth_tenant_id()
    AND auth_role() IN ('hr', 'manager', 'owner'));

-- ---- shifts ----
CREATE POLICY "shifts_select_branch" ON shifts FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager'));
CREATE POLICY "shifts_all_manager" ON shifts FOR ALL
  USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('manager', 'owner', 'hr'));

-- ---- shift_assignments ----
CREATE POLICY "assignments_select_branch" ON shift_assignments FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE branch_id = auth_branch_id())
    OR auth_role() IN ('owner', 'manager', 'hr'));
CREATE POLICY "assignments_all_hr" ON shift_assignments FOR ALL
  USING (employee_id IN (SELECT id FROM employees WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('manager', 'owner', 'hr'));

-- ---- attendance_records ----
CREATE POLICY "attendance_select_branch" ON attendance_records FOR SELECT
  USING (branch_id = auth_branch_id() OR auth_role() IN ('owner', 'manager', 'hr'));
CREATE POLICY "attendance_insert_staff" ON attendance_records FOR INSERT WITH CHECK (
  branch_id = auth_branch_id()
);

-- ---- leave_requests ----
CREATE POLICY "leave_select_own_or_hr" ON leave_requests FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR auth_role() IN ('owner', 'manager', 'hr')
  );
CREATE POLICY "leave_insert_employee" ON leave_requests FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  OR auth_role() IN ('manager', 'owner', 'hr')
);
CREATE POLICY "leave_update_hr" ON leave_requests FOR UPDATE
  USING (auth_role() IN ('manager', 'owner', 'hr'));

-- ---- payroll_periods ----
CREATE POLICY "payroll_periods_select_hr" ON payroll_periods FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('hr', 'owner', 'manager'));
CREATE POLICY "payroll_periods_all_hr" ON payroll_periods FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('hr', 'owner'));

-- ---- payroll_items ----
CREATE POLICY "payroll_items_select_hr" ON payroll_items FOR SELECT
  USING (period_id IN (SELECT id FROM payroll_periods WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('hr', 'owner', 'manager'));
CREATE POLICY "payroll_items_all_hr" ON payroll_items FOR ALL
  USING (period_id IN (SELECT id FROM payroll_periods WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('hr', 'owner'));

-- ---- audit_logs ----
CREATE POLICY "audit_select_manager" ON audit_logs FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));
CREATE POLICY "audit_insert_authenticated" ON audit_logs FOR INSERT WITH CHECK (
  tenant_id = auth_tenant_id()
);

-- ---- security_events ----
CREATE POLICY "security_events_select_owner" ON security_events FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager'));
CREATE POLICY "security_events_insert_any" ON security_events FOR INSERT WITH CHECK (true);

-- ---- deletion_requests ----
CREATE POLICY "deletion_requests_select_manager" ON deletion_requests FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager'));
CREATE POLICY "deletion_requests_insert_any" ON deletion_requests FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE tenant_id = auth_tenant_id())
);

-- ---- notifications ----
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid()
    OR (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'manager')));
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_system" ON notifications FOR INSERT WITH CHECK (
  tenant_id = auth_tenant_id()
);

-- ---- system_settings ----
CREATE POLICY "settings_select_tenant" ON system_settings FOR SELECT
  USING (tenant_id = auth_tenant_id());
CREATE POLICY "settings_all_owner" ON system_settings FOR ALL
  USING (tenant_id = auth_tenant_id() AND auth_role() = 'owner');

-- ============================================================
-- SUPABASE REALTIME PUBLICATION
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE kds_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
