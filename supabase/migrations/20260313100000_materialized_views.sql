-- ============================================================================
-- CQRS Materialized Views for Reports & Analytics
-- ============================================================================
-- Purpose: Pre-compute expensive aggregate queries for fast dashboard/report loads
-- Refresh: Daily via Vercel cron job /api/cron/refresh-views (2:30 AM UTC)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. mv_daily_revenue — Revenue, order count, avg ticket per branch per day
-- ---------------------------------------------------------------------------
-- Used by: getReportData, getBranchAnalytics, dashboard stats

CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
  o.branch_id,
  DATE(o.created_at AT TIME ZONE 'UTC') AS report_date,
  COUNT(DISTINCT o.id) AS order_count,
  COALESCE(SUM(p.amount + p.tip), 0)::NUMERIC(14,2) AS total_revenue,
  COALESCE(SUM(p.tip), 0)::NUMERIC(14,2) AS total_tips,
  CASE
    WHEN COUNT(DISTINCT o.id) > 0
    THEN (COALESCE(SUM(p.amount + p.tip), 0) / COUNT(DISTINCT o.id))::NUMERIC(14,2)
    ELSE 0
  END AS avg_ticket
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed' AND p.paid_at IS NOT NULL
WHERE o.status = 'completed'
GROUP BY o.branch_id, DATE(o.created_at AT TIME ZONE 'UTC');

CREATE UNIQUE INDEX idx_mv_daily_revenue_branch_date
  ON mv_daily_revenue (branch_id, report_date);

-- ---------------------------------------------------------------------------
-- 2. mv_daily_payment_methods — Payment method breakdown per branch per day
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW mv_daily_payment_methods AS
SELECT
  o.branch_id,
  DATE(p.paid_at AT TIME ZONE 'UTC') AS report_date,
  p.method,
  COUNT(*) AS payment_count,
  COALESCE(SUM(p.amount + p.tip), 0)::NUMERIC(14,2) AS method_total
FROM payments p
JOIN orders o ON o.id = p.order_id AND o.status = 'completed'
WHERE p.status = 'completed' AND p.paid_at IS NOT NULL
GROUP BY o.branch_id, DATE(p.paid_at AT TIME ZONE 'UTC'), p.method;

CREATE UNIQUE INDEX idx_mv_daily_payment_methods_pk
  ON mv_daily_payment_methods (branch_id, report_date, method);

-- ---------------------------------------------------------------------------
-- 3. mv_daily_order_type_mix — Order type breakdown per branch per day
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW mv_daily_order_type_mix AS
SELECT
  o.branch_id,
  DATE(o.created_at AT TIME ZONE 'UTC') AS report_date,
  COALESCE(o.type, 'dine_in') AS order_type,
  COUNT(*) AS type_count,
  COALESCE(SUM(o.total), 0)::NUMERIC(14,2) AS type_revenue
FROM orders o
WHERE o.status = 'completed'
GROUP BY o.branch_id, DATE(o.created_at AT TIME ZONE 'UTC'), COALESCE(o.type, 'dine_in');

CREATE UNIQUE INDEX idx_mv_daily_order_type_mix_pk
  ON mv_daily_order_type_mix (branch_id, report_date, order_type);

-- ---------------------------------------------------------------------------
-- 4. mv_item_popularity — Top-selling items per branch per day
-- ---------------------------------------------------------------------------
-- Used by: getReportData (topItems), getCategoryMix

CREATE MATERIALIZED VIEW mv_item_popularity AS
SELECT
  o.branch_id,
  DATE(o.created_at AT TIME ZONE 'UTC') AS report_date,
  oi.menu_item_id,
  mi.name AS item_name,
  mc.name AS category_name,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.item_total)::NUMERIC(14,2) AS total_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
JOIN menu_items mi ON mi.id = oi.menu_item_id
LEFT JOIN menu_categories mc ON mc.id = mi.category_id
GROUP BY o.branch_id, DATE(o.created_at AT TIME ZONE 'UTC'), oi.menu_item_id, mi.name, mc.name;

CREATE UNIQUE INDEX idx_mv_item_popularity_pk
  ON mv_item_popularity (branch_id, report_date, menu_item_id);

CREATE INDEX idx_mv_item_popularity_category
  ON mv_item_popularity (branch_id, report_date, category_name);

-- ---------------------------------------------------------------------------
-- 5. mv_staff_performance — Per-employee KPIs per day
-- ---------------------------------------------------------------------------
-- Used by: getStaffPerformance
-- Waiter: orders.created_by → orders created + total items
-- Cashier: payments.pos_session_id → pos_sessions.cashier_id → payments processed
-- Chef: no per-chef attribution available (kds_tickets lacks bumped_by)
--   → station-level avg prep time only

CREATE MATERIALIZED VIEW mv_staff_performance AS
WITH waiter_stats AS (
  SELECT
    o.created_by AS profile_id,
    DATE(o.created_at AT TIME ZONE 'UTC') AS report_date,
    COUNT(*) AS orders_created,
    COALESCE(SUM(oi_agg.total_items), 0) AS total_items
  FROM orders o
  LEFT JOIN (
    SELECT order_id, SUM(quantity) AS total_items
    FROM order_items
    GROUP BY order_id
  ) oi_agg ON oi_agg.order_id = o.id
  WHERE o.created_by IS NOT NULL
  GROUP BY o.created_by, DATE(o.created_at AT TIME ZONE 'UTC')
),
cashier_stats AS (
  SELECT
    ps.cashier_id AS profile_id,
    DATE(p.paid_at AT TIME ZONE 'UTC') AS report_date,
    COUNT(*) AS payments_processed
  FROM payments p
  JOIN pos_sessions ps ON ps.id = p.pos_session_id
  WHERE p.status = 'completed'
    AND p.paid_at IS NOT NULL
    AND ps.cashier_id IS NOT NULL
  GROUP BY ps.cashier_id, DATE(p.paid_at AT TIME ZONE 'UTC')
)
SELECT
  COALESCE(w.profile_id, c.profile_id) AS profile_id,
  COALESCE(w.report_date, c.report_date) AS report_date,
  COALESCE(w.orders_created, 0) AS orders_created,
  COALESCE(w.total_items, 0) AS total_items_served,
  COALESCE(c.payments_processed, 0) AS payments_processed
FROM waiter_stats w
FULL OUTER JOIN cashier_stats c
  ON c.profile_id = w.profile_id AND c.report_date = w.report_date;

CREATE UNIQUE INDEX idx_mv_staff_performance_pk
  ON mv_staff_performance (profile_id, report_date);

-- ---------------------------------------------------------------------------
-- 6. mv_inventory_usage — Daily ingredient usage from completed orders
-- ---------------------------------------------------------------------------
-- Used by: getDemandForecast (replaces complex orders→order_items→recipes→recipe_ingredients chain)

CREATE MATERIALIZED VIEW mv_inventory_usage AS
SELECT
  o.branch_id,
  DATE(o.created_at AT TIME ZONE 'UTC') AS report_date,
  ri.ingredient_id,
  SUM(oi.quantity * ri.quantity * (1 + COALESCE(ri.waste_pct, 0) / 100.0))::NUMERIC(14,4) AS total_usage
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
JOIN recipes r ON r.menu_item_id = oi.menu_item_id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
GROUP BY o.branch_id, DATE(o.created_at AT TIME ZONE 'UTC'), ri.ingredient_id;

CREATE UNIQUE INDEX idx_mv_inventory_usage_pk
  ON mv_inventory_usage (branch_id, report_date, ingredient_id);

CREATE INDEX idx_mv_inventory_usage_ingredient
  ON mv_inventory_usage (ingredient_id, report_date);

-- ---------------------------------------------------------------------------
-- 7. mv_peak_hours — Order count per branch per day-of-week per hour
-- ---------------------------------------------------------------------------
-- Used by: getPeakHoursAnalysis

CREATE MATERIALIZED VIEW mv_peak_hours AS
SELECT
  o.branch_id,
  EXTRACT(DOW FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT AS day_of_week,
  EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT AS hour_of_day,
  COUNT(*) AS order_count
FROM orders o
WHERE o.status NOT IN ('cancelled', 'draft')
  AND EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN 6 AND 23
GROUP BY o.branch_id,
  EXTRACT(DOW FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh');

CREATE UNIQUE INDEX idx_mv_peak_hours_pk
  ON mv_peak_hours (branch_id, day_of_week, hour_of_day);

-- ---------------------------------------------------------------------------
-- RPC function to refresh all materialized views
-- ---------------------------------------------------------------------------
-- Called by Vercel cron /api/cron/refresh-views

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_payment_methods;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_order_type_mix;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_item_popularity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_usage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_peak_hours;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO authenticated;

-- ---------------------------------------------------------------------------
-- Initial data population
-- ---------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW mv_daily_revenue;
REFRESH MATERIALIZED VIEW mv_daily_payment_methods;
REFRESH MATERIALIZED VIEW mv_daily_order_type_mix;
REFRESH MATERIALIZED VIEW mv_item_popularity;
REFRESH MATERIALIZED VIEW mv_staff_performance;
REFRESH MATERIALIZED VIEW mv_inventory_usage;
REFRESH MATERIALIZED VIEW mv_peak_hours;
