-- Grant table-level permissions to authenticated and anon roles.
-- RLS policies (already in place) control ROW-level access.
-- Without these GRANTs, all queries fail with "permission denied" before RLS even runs.

-- ── authenticated: full CRUD on all operational tables ────────────────────────

GRANT SELECT, UPDATE               ON profiles                TO authenticated;
GRANT SELECT                       ON tenants                 TO authenticated;
GRANT SELECT                       ON branches                TO authenticated;
GRANT SELECT                       ON branch_zones            TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON tables                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menus                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_branches         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_categories       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_item_variants    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_item_modifiers   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_terminals         TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON pos_sessions            TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON orders                  TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON order_items             TO authenticated;
GRANT SELECT, INSERT               ON order_discounts         TO authenticated;
GRANT SELECT, INSERT               ON order_status_history    TO authenticated;
GRANT SELECT, INSERT               ON payments                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kds_stations          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kds_station_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON kds_tickets             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kds_timing_rules      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ingredients           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_ingredients    TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON stock_levels            TO authenticated;
GRANT SELECT, INSERT               ON stock_movements         TO authenticated;
GRANT SELECT, INSERT               ON waste_logs              TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON purchase_orders         TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON purchase_order_items    TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON customers               TO authenticated;
GRANT SELECT                       ON loyalty_tiers           TO authenticated;
GRANT SELECT, INSERT               ON loyalty_transactions    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vouchers              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON voucher_branches      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns             TO authenticated;
GRANT SELECT, INSERT               ON customer_feedback       TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON employees               TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON shifts                  TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON shift_assignments       TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON attendance_records      TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON leave_requests          TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON payroll_periods         TO authenticated;
GRANT SELECT, INSERT               ON payroll_items           TO authenticated;
GRANT SELECT, INSERT               ON audit_logs              TO authenticated;
GRANT SELECT, INSERT               ON security_events         TO authenticated;
GRANT SELECT, INSERT               ON deletion_requests       TO authenticated;
GRANT SELECT, INSERT, UPDATE       ON notifications           TO authenticated;
GRANT SELECT, UPDATE               ON system_settings         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON printer_configs       TO authenticated;

-- ── anon: read-only on public-facing tables ───────────────────────────────────

GRANT SELECT ON menus              TO anon;
GRANT SELECT ON menu_categories    TO anon;
GRANT SELECT ON menu_items         TO anon;
GRANT SELECT ON menu_item_variants TO anon;
GRANT SELECT ON menu_item_modifiers TO anon;
GRANT SELECT ON branches           TO anon;
GRANT SELECT ON loyalty_tiers      TO anon;
GRANT SELECT ON vouchers           TO anon;
GRANT INSERT ON customers          TO anon;   -- new customer self-registration
