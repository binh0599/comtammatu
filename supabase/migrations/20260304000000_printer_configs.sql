-- ============================================================
-- Printer Configuration for POS Terminals & KDS Stations
-- ============================================================

CREATE TABLE printer_configs (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id         BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('thermal_usb', 'thermal_network', 'browser')),

  -- Connection details (USB: vendor_id/product_id; Network: host/port)
  connection_config JSONB NOT NULL DEFAULT '{}',

  -- Format
  paper_width_mm    INT NOT NULL DEFAULT 80 CHECK (paper_width_mm IN (58, 80)),
  encoding          TEXT NOT NULL DEFAULT 'utf-8',

  -- Assignment (one printer per terminal/station)
  assigned_to_type  TEXT CHECK (assigned_to_type IN ('pos_terminal', 'kds_station')),
  assigned_to_id    BIGINT,

  -- Behavior
  auto_print        BOOLEAN NOT NULL DEFAULT false,
  print_delay_ms    INT NOT NULL DEFAULT 500 CHECK (print_delay_ms BETWEEN 0 AND 5000),

  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_tested_at    TIMESTAMPTZ,
  test_status       TEXT CHECK (test_status IN ('connected', 'error', 'untested')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One printer per assignment slot
  CONSTRAINT uq_printer_assignment UNIQUE (branch_id, assigned_to_type, assigned_to_id)
);

-- Indexes
CREATE INDEX idx_printer_configs_branch ON printer_configs(branch_id);
CREATE INDEX idx_printer_configs_assigned ON printer_configs(assigned_to_type, assigned_to_id)
  WHERE is_active = true;

-- Auto-update timestamp trigger
CREATE TRIGGER trg_printer_configs_updated_at
  BEFORE UPDATE ON printer_configs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE printer_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "printer_configs_branch_isolation"
  ON printer_configs
  FOR ALL
  USING (
    branch_id IN (
      SELECT p.branch_id FROM profiles p WHERE p.id = auth.uid()
    )
  );
