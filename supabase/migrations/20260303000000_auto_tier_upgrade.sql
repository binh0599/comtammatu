-- Auto-upgrade/downgrade loyalty tier when points balance changes
-- Trigger fires AFTER INSERT on loyalty_transactions

CREATE OR REPLACE FUNCTION auto_upgrade_loyalty_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_new_tier_id BIGINT;
  v_old_tier_name TEXT;
  v_new_tier_name TEXT;
BEGIN
  -- Get customer's current tier info
  SELECT c.id, c.tenant_id, c.loyalty_tier_id,
         COALESCE(lt.name, 'Không') AS tier_name
  INTO v_customer
  FROM customers c
  LEFT JOIN loyalty_tiers lt ON lt.id = c.loyalty_tier_id
  WHERE c.id = NEW.customer_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_old_tier_name := v_customer.tier_name;

  -- Find the highest applicable tier for the new balance
  SELECT id, name
  INTO v_new_tier_id, v_new_tier_name
  FROM loyalty_tiers
  WHERE tenant_id = v_customer.tenant_id
    AND min_points <= NEW.balance_after
  ORDER BY min_points DESC
  LIMIT 1;

  -- If no tier qualifies, set to NULL (below all tiers)
  IF NOT FOUND THEN
    v_new_tier_id := NULL;
    v_new_tier_name := 'Không';
  END IF;

  -- Update if different (handles both upgrade and downgrade)
  IF v_new_tier_id IS DISTINCT FROM v_customer.loyalty_tier_id THEN
    UPDATE customers
    SET loyalty_tier_id = v_new_tier_id
    WHERE id = NEW.customer_id;

    -- Log security event for tier change
    INSERT INTO security_events (
      tenant_id, event_type, severity, details
    ) VALUES (
      v_customer.tenant_id,
      CASE
        WHEN v_new_tier_id IS NULL THEN 'loyalty_tier_removed'
        WHEN v_customer.loyalty_tier_id IS NULL THEN 'loyalty_tier_assigned'
        ELSE 'loyalty_tier_changed'
      END,
      'info',
      jsonb_build_object(
        'customer_id', v_customer.id,
        'old_tier_id', v_customer.loyalty_tier_id,
        'new_tier_id', v_new_tier_id,
        'old_tier_name', v_old_tier_name,
        'new_tier_name', v_new_tier_name,
        'balance_after', NEW.balance_after,
        'triggered_by', 'auto_upgrade_trigger'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on loyalty_transactions
CREATE TRIGGER trg_auto_upgrade_loyalty_tier
  AFTER INSERT ON loyalty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_upgrade_loyalty_tier();

-- Add comment for documentation
COMMENT ON FUNCTION auto_upgrade_loyalty_tier() IS
  'Automatically upgrades or downgrades customer loyalty tier based on points balance after each transaction';
