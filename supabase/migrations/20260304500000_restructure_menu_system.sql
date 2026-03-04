-- =============================================================================
-- Migration: Restructure Menu System
-- Adds category types (main_dish, side_dish, drink),
-- side dish linking table, parent_item_id on order_items
-- =============================================================================

-- 1. Add type column to menu_categories
ALTER TABLE menu_categories
  ADD COLUMN type TEXT NOT NULL DEFAULT 'main_dish'
    CHECK (type IN ('main_dish', 'side_dish', 'drink'));

CREATE INDEX idx_menu_categories_type ON menu_categories(menu_id, type);

-- 2. Create junction table: which side items are available for which main items
CREATE TABLE menu_item_available_sides (
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  side_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, side_item_id),
  CONSTRAINT chk_no_self_reference CHECK (menu_item_id != side_item_id)
);

CREATE INDEX idx_available_sides_main ON menu_item_available_sides(menu_item_id);
CREATE INDEX idx_available_sides_side ON menu_item_available_sides(side_item_id);

-- 3. Add parent_item_id to order_items (links side dish order items to their main dish order item)
ALTER TABLE order_items
  ADD COLUMN parent_item_id BIGINT REFERENCES order_items(id) ON DELETE CASCADE;

CREATE INDEX idx_order_items_parent ON order_items(parent_item_id) WHERE parent_item_id IS NOT NULL;

-- 4. RLS for menu_item_available_sides
ALTER TABLE menu_item_available_sides ENABLE ROW LEVEL SECURITY;

-- Select: any authenticated user in the same tenant can see available sides
CREATE POLICY "available_sides_select_tenant" ON menu_item_available_sides
  FOR SELECT
  TO authenticated
  USING (
    menu_item_id IN (
      SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id()
    )
  );

-- Insert/Update/Delete: only owner/manager
CREATE POLICY "available_sides_manage_manager" ON menu_item_available_sides
  FOR ALL
  TO authenticated
  USING (
    menu_item_id IN (
      SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id()
    )
    AND auth_role() IN ('owner', 'manager')
  )
  WITH CHECK (
    menu_item_id IN (
      SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id()
    )
    AND auth_role() IN ('owner', 'manager')
  );

-- 5. Grant table permissions to authenticated role
GRANT SELECT, INSERT, DELETE ON menu_item_available_sides TO authenticated;

-- 6. Apply update_timestamp trigger to menu_categories (already exists for other tables)
CREATE TRIGGER set_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Add updated_at column to menu_categories (it was missing)
ALTER TABLE menu_categories
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
