-- ============================================================
-- Com Tam Ma Tu F&B CRM — Schema v2.2 Upgrade
-- Migration: 20260228000002_schema_v2_2.sql
-- Baseline:  20260228000000_initial_schema.sql (v2.1)
-- Architecture: docs/F&B_CRM_Lightweight_Architecture_v2.2.md
--
-- v2.2 Changes Applied:
--   [P1] Array columns (BIGINT[]) replaced with junction tables
--        for referential integrity and proper RLS enforcement:
--        - menus.branches[]      → menu_branches (table)
--        - kds_stations.categories[] → kds_station_categories (table)
--        - vouchers.branches[]   → voucher_branches (table)
--   [P1] Redundant and low-value indexes removed (INDEX POLICY)
--   [P1] RLS enabled + policies added for all new junction tables
--   [P2] NOTE: Customer counter async trigger (total_visits/total_spent)
--        to be added in a future migration when payment flow is built
-- ============================================================

-- ============================================================
-- PART 1: ARRAY COLUMNS → JUNCTION TABLES
--
-- BIGINT[] arrays have no referential integrity, no FK enforcement,
-- and cannot be filtered by RLS policies on the referenced table.
-- Replace all three with proper many-to-many junction tables.
-- ============================================================

-- --------------------------------------------------------------
-- 1a. menus.branches → menu_branches
-- --------------------------------------------------------------
DROP INDEX IF EXISTS idx_menus_branches;       -- GIN on array, no longer needed

ALTER TABLE menus DROP COLUMN IF EXISTS branches;

CREATE TABLE menu_branches (
  menu_id   BIGINT NOT NULL REFERENCES menus(id)    ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_id, branch_id)
);

-- --------------------------------------------------------------
-- 1b. kds_stations.categories → kds_station_categories
-- --------------------------------------------------------------
DROP INDEX IF EXISTS idx_kds_stations_categories;  -- GIN on array, no longer needed

ALTER TABLE kds_stations DROP COLUMN IF EXISTS categories;

CREATE TABLE kds_station_categories (
  station_id  BIGINT NOT NULL REFERENCES kds_stations(id)    ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (station_id, category_id)
);

-- --------------------------------------------------------------
-- 1c. vouchers.branches → voucher_branches
-- --------------------------------------------------------------
DROP INDEX IF EXISTS idx_vouchers_branches;    -- GIN on array, no longer needed

ALTER TABLE vouchers DROP COLUMN IF EXISTS branches;

CREATE TABLE voucher_branches (
  voucher_id BIGINT NOT NULL REFERENCES vouchers(id)  ON DELETE CASCADE,
  branch_id  BIGINT NOT NULL REFERENCES branches(id)  ON DELETE CASCADE,
  PRIMARY KEY (voucher_id, branch_id)
);

-- ============================================================
-- PART 2: INDEX POLICY — DROP REDUNDANT / LOW-VALUE INDEXES
--
-- INDEX POLICY (v2.2 — apply to all future schema changes):
--   1. Do NOT create indexes preemptively for tables expected to
--      remain small (< 10K rows per tenant/branch)
--   2. Always create indexes for known hot-path queries
--      (POS, KDS, payments, order lookup)
--   3. UNIQUE constraints create implicit B-tree indexes —
--      never duplicate them with an explicit CREATE INDEX
--   4. Monitor slow queries via Supabase Dashboard → Query Performance
--      and add targeted indexes reactively
-- ============================================================

-- Redundant: tenants.slug is UNIQUE (implicit B-tree index covers lookups)
DROP INDEX IF EXISTS idx_tenants_slug;

-- Low-value: < 20 branches per tenant — table scan is negligible
DROP INDEX IF EXISTS idx_branches_tenant_active;

-- Low-value: < 100 categories per tenant — sort handled in-memory
DROP INDEX IF EXISTS idx_menu_categories_sort;

-- Redundant: pos_terminals.device_fingerprint is UNIQUE (implicit B-tree)
DROP INDEX IF EXISTS idx_pos_terminals_device_fingerprint;

-- Redundant: orders.idempotency_key is UNIQUE (implicit B-tree)
DROP INDEX IF EXISTS idx_orders_idempotency;

-- Redundant: payments.idempotency_key is UNIQUE (implicit B-tree)
DROP INDEX IF EXISTS idx_payments_idempotency;

-- Low-value: < 50 timing rules per branch — tiny table, sequential scan fine
DROP INDEX IF EXISTS idx_kds_timing_station_id;
DROP INDEX IF EXISTS idx_kds_timing_category_id;

-- Low-value: < 30 shifts per branch — sequential scan negligible
DROP INDEX IF EXISTS idx_shifts_branch_id;

-- Low-value: < 10 loyalty tiers per tenant — tiny lookup table
DROP INDEX IF EXISTS idx_loyalty_tiers_tenant_id;

-- Not needed: security_events has no tenant-scoped RLS; global queries
-- use event_type + severity indexes (kept). Add back if tenant-reporting needed.
DROP INDEX IF EXISTS idx_security_events_tenant;

-- Low-value: < 50 settings per tenant — sequential scan fine
DROP INDEX IF EXISTS idx_system_settings_tenant_id;

-- ============================================================
-- PART 3: RLS FOR NEW JUNCTION TABLES
-- All tables must have RLS — enforce tenant isolation.
-- ============================================================

ALTER TABLE menu_branches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_station_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_branches       ENABLE ROW LEVEL SECURITY;

-- ---- menu_branches ----
-- Accessible by any tenant member; managed by owner/manager.
CREATE POLICY "menu_branches_select_tenant" ON menu_branches
  FOR SELECT
  USING (menu_id IN (SELECT id FROM menus WHERE tenant_id = auth_tenant_id()));

CREATE POLICY "menu_branches_all_manager" ON menu_branches
  FOR ALL
  USING (
    menu_id IN (SELECT id FROM menus WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager')
  );

-- ---- kds_station_categories ----
-- Accessible by branch staff; managed by owner/manager (across all branches).
CREATE POLICY "kds_station_cat_select_branch" ON kds_station_categories
  FOR SELECT
  USING (station_id IN (SELECT id FROM kds_stations WHERE branch_id = auth_branch_id()));

CREATE POLICY "kds_station_cat_all_manager" ON kds_station_categories
  FOR ALL
  USING (
    station_id IN (
      SELECT s.id FROM kds_stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.tenant_id = auth_tenant_id()
    )
    AND auth_role() IN ('owner', 'manager')
  );

-- ---- voucher_branches ----
-- Accessible by any tenant member; managed by owner/manager.
CREATE POLICY "voucher_branches_select_tenant" ON voucher_branches
  FOR SELECT
  USING (voucher_id IN (SELECT id FROM vouchers WHERE tenant_id = auth_tenant_id()));

CREATE POLICY "voucher_branches_all_manager" ON voucher_branches
  FOR ALL
  USING (
    voucher_id IN (SELECT id FROM vouchers WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager')
  );
