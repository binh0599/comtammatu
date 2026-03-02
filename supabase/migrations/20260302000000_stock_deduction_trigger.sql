-- ============================================
-- Stock Auto-Deduction on Order Completion
-- When an order is marked 'completed', automatically:
--   1. Look up recipe for each order_item's menu_item
--   2. Calculate ingredient deduction (qty × order_qty × (1 + waste%/100))
--   3. Insert stock_movements (type='out', reference_type='order')
--   4. Deduct from stock_levels (never below 0)
-- ============================================

CREATE OR REPLACE FUNCTION deduct_stock_on_order_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item         RECORD;
  v_recipe_ing   RECORD;
  v_recipe_id    BIGINT;
  v_deduct_qty   NUMERIC(14,4);
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- Loop through each order_item
    FOR v_item IN
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP

      -- Find recipe for this menu_item (may not exist)
      SELECT r.id INTO v_recipe_id
      FROM recipes r
      WHERE r.menu_item_id = v_item.menu_item_id;

      -- Skip items without recipes
      IF v_recipe_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Loop through recipe ingredients
      FOR v_recipe_ing IN
        SELECT ri.ingredient_id, ri.quantity, ri.waste_pct
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = v_recipe_id
      LOOP

        -- Calculate deduction: recipe_qty × order_qty × (1 + waste%)
        v_deduct_qty := v_recipe_ing.quantity
                        * v_item.quantity
                        * (1 + v_recipe_ing.waste_pct / 100);

        -- Insert stock movement record (audit trail)
        INSERT INTO stock_movements (
          ingredient_id,
          branch_id,
          type,
          quantity,
          reference_type,
          reference_id,
          notes,
          created_by,
          created_at
        ) VALUES (
          v_recipe_ing.ingredient_id,
          NEW.branch_id,
          'out',
          v_deduct_qty,
          'order',
          NEW.id,
          'Tu dong tru kho — Don #' || COALESCE(NEW.order_number, NEW.id::TEXT),
          NEW.created_by,
          NOW()
        );

        -- Deduct from stock_levels (never go below 0, increment version)
        UPDATE stock_levels
        SET quantity = GREATEST(0, quantity - v_deduct_qty),
            version  = version + 1,
            updated_at = NOW()
        WHERE ingredient_id = v_recipe_ing.ingredient_id
          AND branch_id = NEW.branch_id;

        -- If no stock_level row exists, skip silently
        -- (ingredient not tracked at this branch)

      END LOOP; -- recipe_ingredients
    END LOOP; -- order_items
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER trg_deduct_stock_on_order_completion
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION deduct_stock_on_order_completion();

-- Add comment for documentation
COMMENT ON FUNCTION deduct_stock_on_order_completion() IS
  'Auto-deducts ingredient stock when an order is completed, based on recipes and waste percentages.';
