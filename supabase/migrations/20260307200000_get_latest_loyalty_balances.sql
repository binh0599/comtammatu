-- Bulk-fetch latest loyalty balance for a batch of customers (avoids N+1 queries)
CREATE OR REPLACE FUNCTION get_latest_loyalty_balances(customer_ids BIGINT[])
RETURNS TABLE(customer_id BIGINT, balance_after NUMERIC)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (lt.customer_id)
    lt.customer_id,
    lt.balance_after
  FROM loyalty_transactions lt
  WHERE lt.customer_id = ANY(customer_ids)
  ORDER BY lt.customer_id, lt.created_at DESC;
$$;
