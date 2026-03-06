-- Remove the side dish parent enforcement trigger (side dishes can now be ordered independently)
DROP TRIGGER IF EXISTS trg_check_side_dish_has_parent ON order_items;
DROP FUNCTION IF EXISTS check_side_dish_has_parent();
