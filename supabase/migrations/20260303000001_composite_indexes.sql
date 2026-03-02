-- Sprint 3: Composite indexes for hot-path POS queries
-- These cover the most frequent query patterns in cashier/payment flows.

-- order_discounts: queried by (order_id, type) in voucher apply/remove/check
CREATE INDEX IF NOT EXISTS idx_order_discounts_order_type
  ON order_discounts (order_id, type);

-- payments: queried by (pos_session_id, method, status) in close-session cash total
CREATE INDEX IF NOT EXISTS idx_payments_session_method_status
  ON payments (pos_session_id, method, status);
