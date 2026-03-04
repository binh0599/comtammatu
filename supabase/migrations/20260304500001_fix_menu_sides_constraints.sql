-- =============================================================================
-- Migration: Fix menu_item_available_sides constraints and RLS
-- 1. Add identity PK, convert composite PK to unique constraint
-- 2. Add side_item_id tenant check to RLS policies
-- 3. Split FOR ALL policy into action-specific policies matching GRANTs
-- 4. Add composite FK for parent_item_id + order_id on order_items
-- =============================================================================

-- 1. Add identity PK to menu_item_available_sides
--    Drop existing composite PK, add id column, re-add as unique constraint
ALTER TABLE menu_item_available_sides DROP CONSTRAINT menu_item_available_sides_pkey;

ALTER TABLE menu_item_available_sides
  ADD COLUMN id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY;

ALTER TABLE menu_item_available_sides
  ADD CONSTRAINT uq_menu_item_available_sides UNIQUE (menu_item_id, side_item_id);

-- 2. Fix RLS: add side_item_id tenant check and split FOR ALL into specific policies

-- Drop existing policies
DROP POLICY IF EXISTS "available_sides_select_tenant" ON menu_item_available_sides;
DROP POLICY IF EXISTS "available_sides_manage_manager" ON menu_item_available_sides;

-- New SELECT policy: check both menu_item_id and side_item_id belong to tenant
CREATE POLICY "available_sides_select_tenant" ON menu_item_available_sides
  FOR SELECT
  TO authenticated
  USING (
    menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND side_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
  );

-- Split manage into INSERT and DELETE (matching GRANT: SELECT, INSERT, DELETE)
CREATE POLICY "available_sides_insert_manager" ON menu_item_available_sides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND side_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager')
  );

CREATE POLICY "available_sides_delete_manager" ON menu_item_available_sides
  FOR DELETE
  TO authenticated
  USING (
    menu_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND side_item_id IN (SELECT id FROM menu_items WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager')
  );

-- 3. Add composite FK for parent_item_id + order_id on order_items
--    First add unique constraint on (id, order_id) for the composite FK target
ALTER TABLE order_items
  ADD CONSTRAINT uq_order_items_id_order_id UNIQUE (id, order_id);

-- Drop existing simple FK on parent_item_id
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_parent_item_id_fkey;

-- Add composite FK: (parent_item_id, order_id) references order_items(id, order_id)
ALTER TABLE order_items
  ADD CONSTRAINT order_items_parent_item_order_fk
  FOREIGN KEY (parent_item_id, order_id) REFERENCES order_items(id, order_id) ON DELETE CASCADE;

-- Update index to include order_id
DROP INDEX IF EXISTS idx_order_items_parent;
CREATE INDEX idx_order_items_parent ON order_items(parent_item_id, order_id) WHERE parent_item_id IS NOT NULL;
