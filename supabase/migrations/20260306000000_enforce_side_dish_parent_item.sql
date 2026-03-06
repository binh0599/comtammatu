-- Enforce that order_items for side_dish category items must have a parent_item_id.
-- This prevents side dishes from being ordered independently at the database level.

CREATE OR REPLACE FUNCTION check_side_dish_has_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_type TEXT;
BEGIN
  -- Look up the category type for this menu item
  SELECT mc.type INTO v_category_type
  FROM menu_items mi
  JOIN menu_categories mc ON mc.id = mi.category_id
  WHERE mi.id = NEW.menu_item_id;

  -- If it's a side dish, it must have a parent_item_id
  IF v_category_type = 'side_dish' AND NEW.parent_item_id IS NULL THEN
    RAISE EXCEPTION 'Món kèm (%) phải được gọi cùng món chính', NEW.menu_item_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger on INSERT only (side items are never reparented)
DROP TRIGGER IF EXISTS trg_check_side_dish_has_parent ON order_items;
CREATE TRIGGER trg_check_side_dish_has_parent
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION check_side_dish_has_parent();
