-- Performance indexes for common query patterns
-- Skipped indexes that already exist in initial schema:
--   idx_order_items_status (order_id, status) — covers order items by order
--   idx_audit_logs_tenant_created (tenant_id, created_at DESC) — covers audit log queries
--   idx_profiles_role (tenant_id, role) — covers RBAC queries

-- Orders: active orders per branch (partial index for KDS/POS dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_branch_active ON orders (branch_id, status, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled');

-- Orders: completed orders by date range (reports)
CREATE INDEX IF NOT EXISTS idx_orders_branch_completed ON orders (branch_id, created_at DESC)
  WHERE status = 'completed';

-- KDS tickets: pending tickets per station (KDS board query)
CREATE INDEX IF NOT EXISTS idx_kds_tickets_station_pending ON kds_tickets (station_id, created_at ASC)
  WHERE status IN ('pending', 'preparing');

-- Security events: by tenant + severity (security module)
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_severity ON security_events (tenant_id, severity, created_at DESC);

-- Stock levels: composite for low stock alerts
CREATE INDEX IF NOT EXISTS idx_stock_levels_branch ON stock_levels (branch_id, ingredient_id);

-- Payments: by order + status (payment lookup)
CREATE INDEX IF NOT EXISTS idx_payments_order_status ON payments (order_id, status);

-- Loyalty transactions: by customer with date ordering (loyalty history)
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions (customer_id, created_at DESC);
