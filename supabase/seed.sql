-- ============================================
-- Seed data for F&B CRM (Cơm tấm Má Tư)
-- v2 — Dynamic IDs, no hardcoded PKs
--
-- Auth users are NOT seeded here.
-- Owner must be created manually via SQL (see comment at bottom).
-- Other staff roles are created by Owner via the HR module.
--
-- Bugs fixed vs original seed:
--   [1] subscription_plan 'premium' → 'pro'  (CHECK constraint allows only
--       'free'|'starter'|'pro'|'enterprise')
--   [2] branch_zones.type 'indoor' → 'dining' (CHECK allows only
--       'dining'|'bar'|'outdoor'|'other')
--   [3] menu_items base_price = 0 for 'Trà Đá' → 5000  (CHECK base_price > 0)
--   [4] All hardcoded FK IDs replaced with dynamic RETURNING / subqueries
--   [5] pos_terminals seeded without registered_by/approved_by
--       (nullable FKs — profiles table empty at seed time)
-- ============================================

DO $$
DECLARE
  v_tenant_id      BIGINT;
  v_branch_q1_id   BIGINT;
  v_branch_q3_id   BIGINT;
  v_menu_id        BIGINT;
  v_cat_com_id     BIGINT;
  v_cat_pho_id     BIGINT;
  v_cat_phu_id     BIGINT;
  v_cat_uong_id    BIGINT;
  v_zone_q1f1_id   BIGINT;
  v_zone_q1f2_id   BIGINT;
  v_zone_q3in_id   BIGINT;
  v_zone_q3out_id  BIGINT;
  v_kds_bep_id     BIGINT;
  v_kds_nuoc_id    BIGINT;
BEGIN

-- ============================================================
-- 1. TENANT
-- ============================================================
INSERT INTO tenants (name, slug, subscription_plan, settings, is_active)
VALUES (
  'Cơm tấm Má Tư',
  'comtammatu',
  'pro',
  '{"currency": "VND", "timezone": "Asia/Ho_Chi_Minh", "language": "vi"}'::jsonb,
  true
)
RETURNING id INTO v_tenant_id;

-- ============================================================
-- 2. BRANCHES
-- ============================================================
INSERT INTO branches (tenant_id, name, code, address, phone, timezone, operating_hours, is_active)
VALUES (
  v_tenant_id, 'Chi nhánh Quận 1', 'Q1',
  '123 Nguyễn Huệ, Quận 1, TP.HCM', '028-1234-5678',
  'Asia/Ho_Chi_Minh', '{"open_time": "06:00", "close_time": "22:00"}'::jsonb, true
)
RETURNING id INTO v_branch_q1_id;

INSERT INTO branches (tenant_id, name, code, address, phone, timezone, operating_hours, is_active)
VALUES (
  v_tenant_id, 'Chi nhánh Quận 3', 'Q3',
  '456 Võ Văn Tần, Quận 3, TP.HCM', '028-8765-4321',
  'Asia/Ho_Chi_Minh', '{"open_time": "06:00", "close_time": "22:00"}'::jsonb, true
)
RETURNING id INTO v_branch_q3_id;

-- ============================================================
-- 3. MENU + BRANCH LINKS
-- ============================================================
INSERT INTO menus (tenant_id, name, type, is_active)
VALUES (v_tenant_id, 'Thực Đơn Chính', 'dine_in', true)
RETURNING id INTO v_menu_id;

INSERT INTO menu_branches (menu_id, branch_id) VALUES
  (v_menu_id, v_branch_q1_id),
  (v_menu_id, v_branch_q3_id);

-- ============================================================
-- 4. MENU CATEGORIES
-- ============================================================
INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Cơm', 1)
RETURNING id INTO v_cat_com_id;

INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Phở & Bún', 2)
RETURNING id INTO v_cat_pho_id;

INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Món Phụ', 3)
RETURNING id INTO v_cat_phu_id;

INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Đồ Uống', 4)
RETURNING id INTO v_cat_uong_id;

-- ============================================================
-- 5. MENU ITEMS
-- ============================================================
INSERT INTO menu_items (tenant_id, category_id, name, description, base_price, is_available) VALUES
  -- Cơm
  (v_tenant_id, v_cat_com_id, 'Cơm Tấm Sườn Nướng',  'Cơm tấm với sườn heo nướng than hồng',          45000, true),
  (v_tenant_id, v_cat_com_id, 'Cơm Tấm Sườn Bì Chả', 'Cơm tấm đặc biệt với sườn, bì, chả trứng',     55000, true),
  (v_tenant_id, v_cat_com_id, 'Cơm Tấm Sườn Ốp La',  'Cơm tấm với sườn nướng và trứng ốp la',        50000, true),
  (v_tenant_id, v_cat_com_id, 'Cơm Tấm Bì Chả',      'Cơm tấm với bì heo và chả trứng',              40000, true),
  (v_tenant_id, v_cat_com_id, 'Cơm Chiên Dương Châu', 'Cơm chiên với tôm, lạp xưởng, trứng',          45000, true),
  -- Phở & Bún
  (v_tenant_id, v_cat_pho_id, 'Phở Bò Tái',          'Phở bò tái truyền thống Nam Bộ',                50000, true),
  (v_tenant_id, v_cat_pho_id, 'Phở Bò Viên',         'Phở với bò viên thơm ngon',                     45000, true),
  (v_tenant_id, v_cat_pho_id, 'Bún Bò Huế',          'Bún bò Huế cay nồng đặc trưng',                 50000, true),
  (v_tenant_id, v_cat_pho_id, 'Bún Thịt Nướng',      'Bún với thịt heo nướng và rau sống',            45000, true),
  -- Món Phụ
  (v_tenant_id, v_cat_phu_id, 'Chả Giò Chiên',       'Chả giò giòn rụm (4 cuốn)',                     30000, true),
  (v_tenant_id, v_cat_phu_id, 'Gỏi Cuốn',            'Gỏi cuốn tôm thịt (2 cuốn)',                    25000, true),
  (v_tenant_id, v_cat_phu_id, 'Canh Chua Cá',        'Canh chua cá lóc miền Tây',                     35000, true),
  -- Đồ Uống
  -- FIX [3]: base_price phải > 0 (CHECK constraint). Đặt 5000 thay vì 0.
  (v_tenant_id, v_cat_uong_id,'Trà Đá',              'Trà đá (5.000đ)',                                 5000, true),
  (v_tenant_id, v_cat_uong_id,'Cà Phê Sữa Đá',      'Cà phê phin truyền thống',                      25000, true),
  (v_tenant_id, v_cat_uong_id,'Nước Mía',            'Nước mía tươi nguyên chất',                     20000, true),
  (v_tenant_id, v_cat_uong_id,'Sinh Tố Bơ',          'Sinh tố bơ sánh mịn',                           30000, true);

-- ============================================================
-- 6. MENU ITEM VARIANTS (lookup by name — no hardcoded item IDs)
-- ============================================================
INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment, is_available)
SELECT id, 'Phần Nhỏ',    -5000, true FROM menu_items WHERE name = 'Cơm Tấm Sườn Nướng' AND tenant_id = v_tenant_id
UNION ALL
SELECT id, 'Phần Lớn',    10000, true FROM menu_items WHERE name = 'Cơm Tấm Sườn Nướng' AND tenant_id = v_tenant_id
UNION ALL
SELECT id, 'Tô Nhỏ',      -5000, true FROM menu_items WHERE name = 'Phở Bò Tái'         AND tenant_id = v_tenant_id
UNION ALL
SELECT id, 'Tô Đặc Biệt', 15000, true FROM menu_items WHERE name = 'Phở Bò Tái'         AND tenant_id = v_tenant_id;

-- ============================================================
-- 7. MENU ITEM MODIFIERS (lookup by name)
-- ============================================================
INSERT INTO menu_item_modifiers (menu_item_id, name, options, max_selections, is_required)
SELECT id,
  'Thêm Topping',
  '[{"name": "Thêm Sườn", "price": 20000}, {"name": "Thêm Trứng Ốp La", "price": 8000}, {"name": "Thêm Bì", "price": 5000}]'::jsonb,
  3, false
FROM menu_items WHERE name = 'Cơm Tấm Sườn Nướng' AND tenant_id = v_tenant_id
UNION ALL
SELECT id,
  'Thêm Topping',
  '[{"name": "Thêm Sườn", "price": 20000}, {"name": "Thêm Trứng Ốp La", "price": 8000}]'::jsonb,
  2, false
FROM menu_items WHERE name = 'Cơm Tấm Sườn Bì Chả' AND tenant_id = v_tenant_id
UNION ALL
SELECT id,
  'Thêm Topping',
  '[{"name": "Thêm Bò Tái", "price": 15000}, {"name": "Thêm Bò Viên", "price": 10000}]'::jsonb,
  2, false
FROM menu_items WHERE name = 'Phở Bò Tái' AND tenant_id = v_tenant_id;

-- ============================================================
-- 8. BRANCH ZONES
-- FIX [2]: type 'indoor' → 'dining'  (CHECK: 'dining'|'bar'|'outdoor'|'other')
-- ============================================================
INSERT INTO branch_zones (branch_id, name, type, table_count)
VALUES (v_branch_q1_id, 'Tầng 1', 'dining', 4)
RETURNING id INTO v_zone_q1f1_id;

INSERT INTO branch_zones (branch_id, name, type, table_count)
VALUES (v_branch_q1_id, 'Tầng 2', 'dining', 3)
RETURNING id INTO v_zone_q1f2_id;

INSERT INTO branch_zones (branch_id, name, type, table_count)
VALUES (v_branch_q3_id, 'Khu Trong', 'dining', 3)
RETURNING id INTO v_zone_q3in_id;

INSERT INTO branch_zones (branch_id, name, type, table_count)
VALUES (v_branch_q3_id, 'Khu Ngoài', 'outdoor', 2)
RETURNING id INTO v_zone_q3out_id;

-- ============================================================
-- 9. TABLES
-- ============================================================
INSERT INTO tables (branch_id, zone_id, number, capacity, status) VALUES
  -- Q1 — Tầng 1
  (v_branch_q1_id, v_zone_q1f1_id, 1, 4, 'available'),
  (v_branch_q1_id, v_zone_q1f1_id, 2, 4, 'available'),
  (v_branch_q1_id, v_zone_q1f1_id, 3, 6, 'available'),
  (v_branch_q1_id, v_zone_q1f1_id, 4, 2, 'available'),
  -- Q1 — Tầng 2
  (v_branch_q1_id, v_zone_q1f2_id, 5, 8, 'available'),
  (v_branch_q1_id, v_zone_q1f2_id, 6, 4, 'available'),
  (v_branch_q1_id, v_zone_q1f2_id, 7, 4, 'available'),
  -- Q3 — Khu Trong
  (v_branch_q3_id, v_zone_q3in_id,  1, 4, 'available'),
  (v_branch_q3_id, v_zone_q3in_id,  2, 4, 'available'),
  (v_branch_q3_id, v_zone_q3in_id,  3, 6, 'available'),
  -- Q3 — Khu Ngoài
  (v_branch_q3_id, v_zone_q3out_id, 4, 2, 'available'),
  (v_branch_q3_id, v_zone_q3out_id, 5, 4, 'available');

-- ============================================================
-- 10. LOYALTY TIERS
-- ============================================================
INSERT INTO loyalty_tiers (tenant_id, name, min_points, discount_pct, benefits, sort_order) VALUES
  (v_tenant_id, 'Thành Viên',  0,    0,  '{"welcome_drink": false}'::jsonb, 1),
  (v_tenant_id, 'Bạc',       500,    5,  '{"welcome_drink": true, "birthday_discount": 10}'::jsonb, 2),
  (v_tenant_id, 'Vàng',     2000,   10,  '{"welcome_drink": true, "birthday_discount": 20, "priority_seating": true}'::jsonb, 3),
  (v_tenant_id, 'Kim Cương', 5000,  15,  '{"welcome_drink": true, "birthday_discount": 30, "priority_seating": true, "free_delivery": true}'::jsonb, 4);

-- ============================================================
-- 11. SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (tenant_id, key, value) VALUES
  (v_tenant_id, 'currency',       '"VND"'),
  (v_tenant_id, 'timezone',       '"Asia/Ho_Chi_Minh"'),
  (v_tenant_id, 'tax_rate',       '10'),
  (v_tenant_id, 'service_charge', '5'),
  (v_tenant_id, 'receipt_header', '"COM TAM MA TU - Hương vị quê nhà"'),
  (v_tenant_id, 'receipt_footer', '"Cảm ơn quý khách! Hẹn gặp lại!"');

-- ============================================================
-- 12. POS TERMINALS
-- FIX [5]: registered_by / approved_by omitted (nullable FK to profiles;
--           profiles table is empty at seed time — owner not seeded)
-- ============================================================
INSERT INTO pos_terminals (branch_id, name, type, device_fingerprint, is_active) VALUES
  (v_branch_q1_id, 'Máy tính thu ngân 1',   'cashier_station', 'cashier-dev-001', true),
  (v_branch_q1_id, 'Điện thoại phục vụ 1',  'mobile_order',    'waiter-dev-001',  true);

-- ============================================================
-- 13. KDS STATIONS (Q1 only — Q3 configured by owner after login)
-- ============================================================
INSERT INTO kds_stations (branch_id, name, display_config, is_active)
VALUES (v_branch_q1_id, 'Bếp Chính', '{"columns": 4, "theme": "dark"}'::jsonb, true)
RETURNING id INTO v_kds_bep_id;

INSERT INTO kds_stations (branch_id, name, display_config, is_active)
VALUES (v_branch_q1_id, 'Quầy Nước', '{"columns": 3, "theme": "dark"}'::jsonb, true)
RETURNING id INTO v_kds_nuoc_id;

-- Link stations to categories
INSERT INTO kds_station_categories (station_id, category_id) VALUES
  (v_kds_bep_id,  v_cat_com_id),
  (v_kds_bep_id,  v_cat_pho_id),
  (v_kds_nuoc_id, v_cat_phu_id),
  (v_kds_nuoc_id, v_cat_uong_id);

-- ============================================================
-- 14. KDS TIMING RULES
-- ============================================================
INSERT INTO kds_timing_rules (station_id, category_id, prep_time_min, warning_min, critical_min) VALUES
  (v_kds_bep_id,  v_cat_com_id,  15, 12, 20),
  (v_kds_bep_id,  v_cat_pho_id,  15, 12, 20),
  (v_kds_nuoc_id, v_cat_phu_id,   5,  4,  8),
  (v_kds_nuoc_id, v_cat_uong_id,  5,  4,  8);

END $$;

-- ============================================================
-- HOW TO CREATE OWNER ACCOUNT (manual step after db reset)
-- ============================================================
-- 1. Get the real tenant_id:
--    SELECT id FROM tenants WHERE slug = 'comtammatu';
--
-- 2. Create owner via Supabase Auth (Dashboard → Authentication → Add user)
--    OR via SQL:
--
-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, raw_user_meta_data, created_at, updated_at,
--   confirmation_token, recovery_token, email_change_token_new, email_change
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated', 'authenticated',
--   'owner@comtammatu.vn',
--   crypt('YourPassword123!', gen_salt('bf')),
--   NOW(),
--   jsonb_build_object(
--     'full_name', 'Nguyen Van Owner',
--     'tenant_id', <tenant_id_from_step_1>,
--     'role',      'owner'
--   ),
--   NOW(), NOW(), '', '', '', ''
-- );
--
-- The handle_new_user() trigger auto-creates the profiles row.
-- ============================================================
