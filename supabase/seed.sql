-- ============================================
-- Seed data for F&B CRM (Com Tam Ma Tu)
-- Run: supabase db reset (applies migrations + seed)
-- ============================================

-- 1. TENANT
INSERT INTO tenants (name, slug, subscription_plan, settings, is_active)
VALUES (
  'Com Tam Ma Tu',
  'comtammatu',
  'premium',
  '{"currency": "VND", "timezone": "Asia/Ho_Chi_Minh", "language": "vi"}'::jsonb,
  true
);

-- 2. BRANCHES (use tenant_id = 1)
INSERT INTO branches (tenant_id, name, code, address, phone, timezone, operating_hours, is_active) VALUES
  (1, 'Chi nhánh Quận 1', 'Q1', '123 Nguyễn Huệ, Quận 1, TP.HCM', '028-1234-5678', 'Asia/Ho_Chi_Minh', '{"open_time": "06:00", "close_time": "22:00"}'::jsonb, true),
  (1, 'Chi nhánh Quận 3', 'Q3', '456 Võ Văn Tần, Quận 3, TP.HCM', '028-8765-4321', 'Asia/Ho_Chi_Minh', '{"open_time": "06:00", "close_time": "22:00"}'::jsonb, true);

-- 3. AUTH USERS (6 test accounts)
-- Password for all: Test1234!
-- The handle_new_user trigger auto-creates profiles

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  -- Owner
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'owner@comtammatu.vn', crypt('Test1234!', gen_salt('bf')),
   NOW(), '{"full_name": "Nguyen Van Owner", "tenant_id": 1, "role": "owner"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),

  -- Manager
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'manager@comtammatu.vn', crypt('Test1234!', gen_salt('bf')),
   NOW(), '{"full_name": "Tran Thi Manager", "tenant_id": 1, "role": "manager"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),

  -- Cashier
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'cashier@comtammatu.vn', crypt('Test1234!', gen_salt('bf')),
   NOW(), '{"full_name": "Le Van Cashier", "tenant_id": 1, "role": "cashier"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),

  -- Chef
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'chef@comtammatu.vn', crypt('Test1234!', gen_salt('bf')),
   NOW(), '{"full_name": "Pham Van Chef", "tenant_id": 1, "role": "chef"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),

  -- Waiter
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'waiter@comtammatu.vn', crypt('Test1234!', gen_salt('bf')),
   NOW(), '{"full_name": "Hoang Thi Waiter", "tenant_id": 1, "role": "waiter"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),

  -- Customer
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'customer@comtammatu.vn', crypt('Test1234!', gen_salt('bf')),
   NOW(), '{"full_name": "Vo Van Customer", "tenant_id": 1, "role": "customer"}'::jsonb,
   NOW(), NOW(), '', '', '', '');

-- Update profiles with branch assignments
UPDATE profiles SET branch_id = 1
WHERE id IN (SELECT id FROM auth.users WHERE email IN ('cashier@comtammatu.vn', 'chef@comtammatu.vn', 'waiter@comtammatu.vn'));

-- 4. MENU
INSERT INTO menus (tenant_id, name, type, is_active) VALUES
  (1, 'Thực Đơn Chính', 'dine_in', true);

-- Link menu to both branches (junction table)
INSERT INTO menu_branches (menu_id, branch_id) VALUES
  (1, 1),
  (1, 2);

-- 5. MENU CATEGORIES (belong to menu, not tenant)
INSERT INTO menu_categories (menu_id, name, sort_order) VALUES
  (1, 'Cơm', 1),
  (1, 'Phở & Bún', 2),
  (1, 'Món Phụ', 3),
  (1, 'Đồ Uống', 4);

-- 6. MENU ITEMS (Vietnamese dishes, VND prices)
INSERT INTO menu_items (tenant_id, category_id, name, description, base_price, is_available) VALUES
  -- Cơm (category 1)
  (1, 1, 'Cơm Tấm Sườn Nướng', 'Cơm tấm với sườn heo nướng than hồng', 45000, true),
  (1, 1, 'Cơm Tấm Sườn Bì Chả', 'Cơm tấm đặc biệt với sườn, bì, chả trứng', 55000, true),
  (1, 1, 'Cơm Tấm Sườn Ốp La', 'Cơm tấm với sườn nướng và trứng ốp la', 50000, true),
  (1, 1, 'Cơm Tấm Bì Chả', 'Cơm tấm với bì heo và chả trứng', 40000, true),
  (1, 1, 'Cơm Chiên Dương Châu', 'Cơm chiên với tôm, lạp xưởng, trứng', 45000, true),
  -- Phở & Bún (category 2)
  (1, 2, 'Phở Bò Tái', 'Phở bò tái truyền thống Nam Bộ', 50000, true),
  (1, 2, 'Phở Bò Viên', 'Phở với bò viên thơm ngon', 45000, true),
  (1, 2, 'Bún Bò Huế', 'Bún bò Huế cay nồng đặc trưng', 50000, true),
  (1, 2, 'Bún Thịt Nướng', 'Bún với thịt heo nướng và rau sống', 45000, true),
  -- Món Phụ (category 3)
  (1, 3, 'Chả Giò Chiên', 'Chả giò giòn rụm (4 cuốn)', 30000, true),
  (1, 3, 'Gỏi Cuốn', 'Gỏi cuốn tôm thịt (2 cuốn)', 25000, true),
  (1, 3, 'Canh Chua Cá', 'Canh chua cá lóc miền Tây', 35000, true),
  -- Đồ Uống (category 4)
  (1, 4, 'Trà Đá', 'Trà đá miễn phí', 0, true),
  (1, 4, 'Cà Phê Sữa Đá', 'Cà phê phin truyền thống', 25000, true),
  (1, 4, 'Nước Mía', 'Nước mía tươi nguyên chất', 20000, true),
  (1, 4, 'Sinh Tố Bơ', 'Sinh tố bơ sánh mịn', 30000, true);

-- 7. MENU ITEM VARIANTS
INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment, is_available) VALUES
  (1, 'Phần Nhỏ', -5000, true),
  (1, 'Phần Lớn', 10000, true),
  (6, 'Tô Nhỏ', -5000, true),
  (6, 'Tô Đặc Biệt', 15000, true);

-- 8. MENU ITEM MODIFIERS (JSONB options structure)
INSERT INTO menu_item_modifiers (menu_item_id, name, options, max_selections, is_required) VALUES
  (1, 'Thêm Topping', '[{"name": "Thêm Sườn", "price": 20000}, {"name": "Thêm Trứng Ốp La", "price": 8000}, {"name": "Thêm Bì", "price": 5000}]'::jsonb, 3, false),
  (2, 'Thêm Topping', '[{"name": "Thêm Sườn", "price": 20000}, {"name": "Thêm Trứng Ốp La", "price": 8000}]'::jsonb, 2, false),
  (6, 'Thêm Topping', '[{"name": "Thêm Bò Tái", "price": 15000}, {"name": "Thêm Bò Viên", "price": 10000}]'::jsonb, 2, false);

-- 9. BRANCH ZONES & TABLES
INSERT INTO branch_zones (branch_id, name, type, table_count) VALUES
  (1, 'Tầng 1', 'indoor', 4),
  (1, 'Tầng 2', 'indoor', 3),
  (2, 'Khu Trong', 'indoor', 3),
  (2, 'Khu Ngoài', 'outdoor', 2);

INSERT INTO tables (branch_id, zone_id, number, capacity, status) VALUES
  -- Branch 1, Floor 1
  (1, 1, 1, 4, 'available'),
  (1, 1, 2, 4, 'available'),
  (1, 1, 3, 6, 'available'),
  (1, 1, 4, 2, 'available'),
  -- Branch 1, Floor 2
  (1, 2, 5, 8, 'available'),
  (1, 2, 6, 4, 'available'),
  (1, 2, 7, 4, 'available'),
  -- Branch 2, Indoor
  (2, 3, 1, 4, 'available'),
  (2, 3, 2, 4, 'available'),
  (2, 3, 3, 6, 'available'),
  -- Branch 2, Outdoor
  (2, 4, 4, 2, 'available'),
  (2, 4, 5, 4, 'available');

-- 10. LOYALTY TIERS
INSERT INTO loyalty_tiers (tenant_id, name, min_points, discount_pct, benefits, sort_order) VALUES
  (1, 'Thành Viên', 0, 0, '{"welcome_drink": false}'::jsonb, 1),
  (1, 'Bạc', 500, 5, '{"welcome_drink": true, "birthday_discount": 10}'::jsonb, 2),
  (1, 'Vàng', 2000, 10, '{"welcome_drink": true, "birthday_discount": 20, "priority_seating": true}'::jsonb, 3),
  (1, 'Kim Cương', 5000, 15, '{"welcome_drink": true, "birthday_discount": 30, "priority_seating": true, "free_delivery": true}'::jsonb, 4);

-- 11. SYSTEM SETTINGS
INSERT INTO system_settings (tenant_id, key, value) VALUES
  (1, 'currency', '"VND"'),
  (1, 'timezone', '"Asia/Ho_Chi_Minh"'),
  (1, 'tax_rate', '10'),
  (1, 'service_charge', '5'),
  (1, 'receipt_header', '"COM TAM MA TU - Hương vị quê nhà"'),
  (1, 'receipt_footer', '"Cảm ơn quý khách! Hẹn gặp lại!"');
