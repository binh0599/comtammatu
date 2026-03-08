-- Migration: Add tables and columns needed for mobile app Edge Functions
-- Adds: idempotency_keys, checkins, delivery_orders, customer_addresses, rewards
-- Modifies: customers (add auth_user_id, points columns, version), loyalty_tiers (add tier_code, multiplier, cashback)

----------------------------------------------------------------------
-- 1. idempotency_keys — Prevent duplicate POST processing
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'processing',  -- processing | completed
  response_body   JSONB,
  response_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Service role only (Edge Functions use admin client)
CREATE POLICY "idempotency_keys_service_only"
  ON idempotency_keys FOR ALL
  USING (false)
  WITH CHECK (false);

----------------------------------------------------------------------
-- 2. customers — Add columns for mobile app loyalty
----------------------------------------------------------------------
-- auth_user_id links Supabase Auth user to customer record
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);
-- Points tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_points    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS available_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_points  INTEGER NOT NULL DEFAULT 0;
-- Optimistic locking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS version         INTEGER NOT NULL DEFAULT 0;
-- Avatar
ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url      TEXT;
-- Streak tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS streak_days     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_checkin_date DATE;

----------------------------------------------------------------------
-- 3. loyalty_tiers — Add tier_code, point_multiplier, cashback_percent
----------------------------------------------------------------------
ALTER TABLE loyalty_tiers ADD COLUMN IF NOT EXISTS tier_code         TEXT;
ALTER TABLE loyalty_tiers ADD COLUMN IF NOT EXISTS point_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 1.0;
ALTER TABLE loyalty_tiers ADD COLUMN IF NOT EXISTS cashback_percent  NUMERIC(4,2) NOT NULL DEFAULT 0.0;

-- Seed tier_code values based on existing names
UPDATE loyalty_tiers SET tier_code = 'bronze'  WHERE name = 'Thành Viên' AND tier_code IS NULL;
UPDATE loyalty_tiers SET tier_code = 'silver'  WHERE name = 'Bạc'        AND tier_code IS NULL;
UPDATE loyalty_tiers SET tier_code = 'gold'    WHERE name = 'Vàng'       AND tier_code IS NULL;
UPDATE loyalty_tiers SET tier_code = 'diamond' WHERE name = 'Kim Cương'  AND tier_code IS NULL;

-- Seed multiplier & cashback
UPDATE loyalty_tiers SET point_multiplier = 1.0, cashback_percent = 0.0  WHERE tier_code = 'bronze';
UPDATE loyalty_tiers SET point_multiplier = 1.2, cashback_percent = 1.0  WHERE tier_code = 'silver';
UPDATE loyalty_tiers SET point_multiplier = 1.5, cashback_percent = 3.0  WHERE tier_code = 'gold';
UPDATE loyalty_tiers SET point_multiplier = 2.0, cashback_percent = 5.0  WHERE tier_code = 'diamond';

----------------------------------------------------------------------
-- 4. loyalty_transactions — Add description column
----------------------------------------------------------------------
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS description TEXT;
-- Add tenant_id for RLS
ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES tenants(id);

----------------------------------------------------------------------
-- 5. checkins — Track customer check-ins at branches
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkins (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id     BIGINT NOT NULL REFERENCES customers(id),
  branch_id       BIGINT NOT NULL REFERENCES branches(id),
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  method          TEXT NOT NULL,  -- qr_code | geolocation
  device_fingerprint TEXT,
  points_earned   INTEGER NOT NULL DEFAULT 5,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_customer_read_own"
  ON checkins FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 6. rewards — Redeemable items for loyalty points
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rewards (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  description     TEXT,
  points_required INTEGER NOT NULL,
  image_url       TEXT,
  stock           INTEGER,  -- NULL = unlimited
  min_tier_id     BIGINT REFERENCES loyalty_tiers(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_read_active"
  ON rewards FOR SELECT
  USING (is_active = true);

----------------------------------------------------------------------
-- 7. redemptions — Track point redemptions
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS redemptions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id     BIGINT NOT NULL REFERENCES customers(id),
  reward_id       BIGINT NOT NULL REFERENCES rewards(id),
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  points_deducted INTEGER NOT NULL,
  voucher_code    TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',  -- active | used | expired
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemptions_customer_read_own"
  ON redemptions FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 8. customer_addresses — Saved delivery addresses
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_addresses (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id     BIGINT NOT NULL REFERENCES customers(id),
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  label           TEXT NOT NULL DEFAULT 'Nhà',
  full_address    TEXT NOT NULL,
  latitude        NUMERIC(10,7) NOT NULL,
  longitude       NUMERIC(10,7) NOT NULL,
  phone           TEXT,
  note            TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_addresses_customer_own"
  ON customer_addresses FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 9. delivery_orders — Delivery-specific order data
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_orders (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id),
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  address_id      BIGINT REFERENCES customer_addresses(id),
  delivery_address JSONB,  -- Snapshot of address at time of order
  delivery_fee    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  driver_id       UUID REFERENCES auth.users(id),
  driver_latitude  NUMERIC(10,7),
  driver_longitude NUMERIC(10,7),
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_orders_customer_read_own"
  ON delivery_orders FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id IN (
        SELECT id FROM customers WHERE auth_user_id = auth.uid()
      )
    )
  );

----------------------------------------------------------------------
-- 10. branches — Add lat/lng for geolocation check-in
----------------------------------------------------------------------
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC(5,2) DEFAULT 8.0;

----------------------------------------------------------------------
-- Grant permissions to authenticated role
----------------------------------------------------------------------
GRANT SELECT, INSERT ON idempotency_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkins TO authenticated;
GRANT SELECT ON rewards TO authenticated;
GRANT SELECT, INSERT ON redemptions TO authenticated;
GRANT ALL ON customer_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON delivery_orders TO authenticated;

-- Service role bypasses RLS so no explicit grants needed for service_role
