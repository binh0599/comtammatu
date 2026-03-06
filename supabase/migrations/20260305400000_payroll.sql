-- ============================================================
-- Migration: Payroll Module
-- Date: 2026-03-05
-- Description: Add payroll_periods and payroll_entries tables
-- ============================================================

-- ============================================================
-- TABLE: payroll_periods
-- ============================================================
CREATE TABLE payroll_periods (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id),
  branch_id     BIGINT NOT NULL REFERENCES branches(id),
  name          TEXT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'calculated', 'approved', 'paid')),
  approved_by   UUID REFERENCES auth.users(id),
  approved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payroll_periods_tenant_branch_dates
    UNIQUE (tenant_id, branch_id, start_date, end_date),

  CONSTRAINT chk_payroll_periods_date_range
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_payroll_periods_tenant_id ON payroll_periods(tenant_id);
CREATE INDEX idx_payroll_periods_branch_id ON payroll_periods(branch_id);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

CREATE TRIGGER trg_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TABLE: payroll_entries
-- ============================================================
CREATE TABLE payroll_entries (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payroll_period_id BIGINT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id       BIGINT NOT NULL REFERENCES employees(id),
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id),
  total_hours       NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate       NUMERIC(12,2),
  monthly_salary    NUMERIC(14,2),
  base_pay          NUMERIC(14,2) NOT NULL DEFAULT 0,
  overtime_hours    NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_pay      NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions        NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonuses           NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay           NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payroll_entries_period_employee
    UNIQUE (payroll_period_id, employee_id)
);

CREATE INDEX idx_payroll_entries_payroll_period_id ON payroll_entries(payroll_period_id);
CREATE INDEX idx_payroll_entries_employee_id ON payroll_entries(employee_id);
CREATE INDEX idx_payroll_entries_tenant_id ON payroll_entries(tenant_id);

CREATE TRIGGER trg_payroll_entries_updated_at
  BEFORE UPDATE ON payroll_entries
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- RLS: payroll_periods
-- ============================================================
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_periods_select_staff" ON payroll_periods FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager', 'hr')
  );

CREATE POLICY "payroll_periods_insert_staff" ON payroll_periods FOR INSERT WITH CHECK (
  tenant_id = auth_tenant_id()
  AND auth_role() IN ('owner', 'manager', 'hr')
);

CREATE POLICY "payroll_periods_update_staff" ON payroll_periods FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager', 'hr')
  );

CREATE POLICY "payroll_periods_delete_staff" ON payroll_periods FOR DELETE
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager', 'hr')
  );

-- ============================================================
-- RLS: payroll_entries
-- ============================================================
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

-- Owner / manager / hr can see all entries within their tenant
CREATE POLICY "payroll_entries_select_staff" ON payroll_entries FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager', 'hr')
  );

-- Employees can see their own payroll entries
CREATE POLICY "payroll_entries_select_own" ON payroll_entries FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

CREATE POLICY "payroll_entries_insert_staff" ON payroll_entries FOR INSERT WITH CHECK (
  tenant_id = auth_tenant_id()
  AND auth_role() IN ('owner', 'manager', 'hr')
);

CREATE POLICY "payroll_entries_update_staff" ON payroll_entries FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager', 'hr')
  );

-- NOTE: No DELETE policy on payroll_entries is intentional.
-- Entries are removed only via ON DELETE CASCADE from payroll_periods.
