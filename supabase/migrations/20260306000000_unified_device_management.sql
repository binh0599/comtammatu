-- Unified Device Management
-- Login device = POS/KDS device. No separate terminal/station creation needed.
-- pos_terminals phased out (nullable terminal_id), kds_stations auto-created on approval.

-- ============================================================
-- 1. Extend registered_devices with device_type + terminal_type
-- ============================================================

ALTER TABLE registered_devices
  ADD COLUMN device_type    TEXT CHECK (device_type IN ('pos', 'kds')),
  ADD COLUMN terminal_type  TEXT CHECK (terminal_type IN ('mobile_order', 'cashier_station')),
  ADD COLUMN linked_station_id BIGINT REFERENCES kds_stations(id) ON DELETE SET NULL;

-- POS devices must specify terminal_type
ALTER TABLE registered_devices
  ADD CONSTRAINT chk_pos_requires_terminal_type
  CHECK (device_type != 'pos' OR terminal_type IS NOT NULL);

CREATE INDEX idx_reg_devices_linked_station
  ON registered_devices(linked_station_id)
  WHERE linked_station_id IS NOT NULL;

-- ============================================================
-- 2. Phase out pos_terminals: make terminal_id NULLABLE
--    Existing rows keep their values; new records won't write it.
-- ============================================================

ALTER TABLE orders       ALTER COLUMN terminal_id DROP NOT NULL;
ALTER TABLE pos_sessions ALTER COLUMN terminal_id DROP NOT NULL;
ALTER TABLE payments     ALTER COLUMN terminal_id DROP NOT NULL;

-- ============================================================
-- 3. Allow printer_configs to be assigned to registered_device
-- ============================================================

ALTER TABLE printer_configs
  DROP CONSTRAINT IF EXISTS printer_configs_assigned_to_type_check;

ALTER TABLE printer_configs
  ADD CONSTRAINT printer_configs_assigned_to_type_check
  CHECK (assigned_to_type IN ('pos_terminal', 'kds_station', 'registered_device'));
