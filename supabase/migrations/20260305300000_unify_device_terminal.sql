-- Unify device registration with terminal/KDS station concept
-- "Thiết bị đăng nhập" IS the POS/KDS terminal — no separate creation needed
--
-- waiter  → mobile_order
-- cashier → cashier_station
-- chef    → kds_station

-- 1. Add terminal_type to registered_devices
ALTER TABLE registered_devices
  ADD COLUMN terminal_type TEXT
    CHECK (terminal_type IN ('mobile_order', 'cashier_station', 'kds_station'));

-- 2. Add linked FKs — set when device is approved
ALTER TABLE registered_devices
  ADD COLUMN linked_terminal_id BIGINT REFERENCES pos_terminals(id) ON DELETE SET NULL,
  ADD COLUMN linked_station_id  BIGINT REFERENCES kds_stations(id)  ON DELETE SET NULL,
  ADD CONSTRAINT chk_registered_devices_one_link_target
    CHECK (NOT (linked_terminal_id IS NOT NULL AND linked_station_id IS NOT NULL)),
  ADD CONSTRAINT chk_registered_devices_terminal_type_match
    CHECK (
      (linked_terminal_id IS NOT NULL AND terminal_type IN ('mobile_order', 'cashier_station'))
      OR (linked_station_id IS NOT NULL AND terminal_type = 'kds_station')
      OR (linked_terminal_id IS NULL AND linked_station_id IS NULL)
    );

-- 3. Index for lookups by user + tenant
CREATE INDEX idx_registered_devices_user_tenant
  ON registered_devices(registered_by, tenant_id, status);

-- 4. Backfill existing approved devices based on the registrant's role
UPDATE registered_devices rd
  SET terminal_type = CASE
    WHEN p.role = 'waiter'  THEN 'mobile_order'
    WHEN p.role = 'cashier' THEN 'cashier_station'
    WHEN p.role = 'chef'    THEN 'kds_station'
  END
FROM profiles p
WHERE p.id = rd.registered_by
  AND rd.terminal_type IS NULL;
