-- ============================================
-- Seed data for F&B CRM (Cơm tấm Má Tư)
-- v3 — Single branch (Đất Đỏ), menu from PDF
--
-- Changes vs v2:
--   [1] Single branch: Chi nhánh Đất Đỏ only
--   [2] No auth users seeded (owner creates manually)
--   [3] Menu updated to match actual Menu.pdf
--   [4] No POS terminals seeded (owner configures after login)
--   [5] No KDS stations seeded (owner configures after login)
--   [6] Removed Phở & Bún category (not on menu)
--   [7] Address updated: Phước Sơn, Xã Đất Đỏ
--   [8] Phone updated: 0772 818 172
-- ============================================

DO $$
DECLARE
  v_tenant_id      BIGINT;
  v_branch_dd_id   BIGINT;
  v_menu_id        BIGINT;
  v_cat_com_id     BIGINT;   -- Cơm Sườn Cốt Lết & Cơm Sườn Cây
  v_cat_khac_id    BIGINT;   -- Món Khác
  v_cat_them_id    BIGINT;   -- Món Thêm
  v_cat_uong_id    BIGINT;   -- Giải Khát
  v_zone_trong_id  BIGINT;
  v_zone_ngoai_id  BIGINT;
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
-- 2. BRANCH (single: Đất Đỏ)
-- ============================================================
INSERT INTO branches (tenant_id, name, code, address, phone, timezone, operating_hours, is_active)
VALUES (
  v_tenant_id, 'Chi nhánh Đất Đỏ', 'DD',
  'Phước Sơn, Xã Đất Đỏ, TP.Hồ Chí Minh', '0772-818-172',
  'Asia/Ho_Chi_Minh', '{"open_time": "06:00", "close_time": "22:00"}'::jsonb, true
)
RETURNING id INTO v_branch_dd_id;

-- ============================================================
-- 3. MENU + BRANCH LINK
-- ============================================================
INSERT INTO menus (tenant_id, name, type, is_active)
VALUES (v_tenant_id, 'Thực Đơn Chính', 'dine_in', true)
RETURNING id INTO v_menu_id;

INSERT INTO menu_branches (menu_id, branch_id) VALUES
  (v_menu_id, v_branch_dd_id);

-- ============================================================
-- 4. MENU CATEGORIES
-- ============================================================
INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Cơm Tấm', 1)
RETURNING id INTO v_cat_com_id;

INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Món Khác', 2)
RETURNING id INTO v_cat_khac_id;

INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Món Thêm', 3)
RETURNING id INTO v_cat_them_id;

INSERT INTO menu_categories (menu_id, name, sort_order)
VALUES (v_menu_id, 'Giải Khát', 4)
RETURNING id INTO v_cat_uong_id;

-- ============================================================
-- 5. MENU ITEMS (from Menu.pdf)
-- ============================================================
INSERT INTO menu_items (tenant_id, category_id, name, description, base_price, is_available) VALUES
  -- Cơm Tấm (main dishes)
  (v_tenant_id, v_cat_com_id,  'Cơm Sườn Cốt Lết',       'Cơm tấm với sườn cốt lết nướng',                35000, true),
  (v_tenant_id, v_cat_com_id,  'Cơm Sườn Cây',            'Cơm tấm với sườn cây nướng',                    40000, true),
  -- Món Khác
  (v_tenant_id, v_cat_khac_id, 'Cơm Tấm Bì',             'Cơm tấm với bì heo',                            20000, true),
  (v_tenant_id, v_cat_khac_id, 'Cơm Tấm Chả',            'Cơm tấm với chả trứng',                         20000, true),
  (v_tenant_id, v_cat_khac_id, 'Cơm Tấm Trứng Ốp La',   'Cơm tấm với trứng ốp la',                       20000, true),
  -- Món Thêm
  (v_tenant_id, v_cat_them_id, 'Chả',                     'Thêm chả trứng',                                 7000, true),
  (v_tenant_id, v_cat_them_id, 'Bì',                      'Thêm bì heo',                                    7000, true),
  (v_tenant_id, v_cat_them_id, 'Trứng Ốp La',            'Thêm trứng ốp la',                                5000, true),
  (v_tenant_id, v_cat_them_id, 'Cơm Thêm',               'Thêm cơm tấm',                                   5000, true),
  -- Giải Khát
  (v_tenant_id, v_cat_uong_id, 'Nước Ngọt',              'Pepsi / 7Up',                                    15000, true),
  (v_tenant_id, v_cat_uong_id, 'Nước Suối',              'Nước suối đóng chai',                            10000, true),
  (v_tenant_id, v_cat_uong_id, 'Nước Cam',               'Nước cam tươi',                                  15000, true),
  (v_tenant_id, v_cat_uong_id, 'Rau Má',                 'Rau má tươi xay',                                10000, true),
  (v_tenant_id, v_cat_uong_id, 'Rau Má Sữa',            'Rau má xay với sữa',                             15000, true),
  (v_tenant_id, v_cat_uong_id, 'Trà Tắc',               'Trà tắc (quất) tươi',                            15000, true),
  (v_tenant_id, v_cat_uong_id, 'Trà Đá',                'Trà đá',                                          2000, true);

-- ============================================================
-- 6. MENU ITEM MODIFIERS (Món ăn kèm for main dishes)
-- Cơm Sườn Cốt Lết: +Bì 7k, +Chả 7k, +Trứng Ốp La 5k
-- Cơm Sườn Cây:     +Bì 7k, +Chả 7k, +Trứng Ốp La 5k
-- ============================================================
INSERT INTO menu_item_modifiers (menu_item_id, name, options, max_selections, is_required)
SELECT id,
  'Món Ăn Kèm',
  '[{"name": "Bì", "price": 7000}, {"name": "Chả", "price": 7000}, {"name": "Trứng Ốp La", "price": 5000}]'::jsonb,
  3, false
FROM menu_items WHERE name = 'Cơm Sườn Cốt Lết' AND tenant_id = v_tenant_id
UNION ALL
SELECT id,
  'Món Ăn Kèm',
  '[{"name": "Bì", "price": 7000}, {"name": "Chả", "price": 7000}, {"name": "Trứng Ốp La", "price": 5000}]'::jsonb,
  3, false
FROM menu_items WHERE name = 'Cơm Sườn Cây' AND tenant_id = v_tenant_id;

-- ============================================================
-- 7. BRANCH ZONES
-- ============================================================
INSERT INTO branch_zones (branch_id, name, type, table_count)
VALUES (v_branch_dd_id, 'Khu Trong', 'dining', 4)
RETURNING id INTO v_zone_trong_id;

INSERT INTO branch_zones (branch_id, name, type, table_count)
VALUES (v_branch_dd_id, 'Khu Ngoài', 'outdoor', 3)
RETURNING id INTO v_zone_ngoai_id;

-- ============================================================
-- 8. TABLES
-- ============================================================
INSERT INTO tables (branch_id, zone_id, number, capacity, status) VALUES
  -- Khu Trong
  (v_branch_dd_id, v_zone_trong_id, 1, 4, 'available'),
  (v_branch_dd_id, v_zone_trong_id, 2, 4, 'available'),
  (v_branch_dd_id, v_zone_trong_id, 3, 6, 'available'),
  (v_branch_dd_id, v_zone_trong_id, 4, 2, 'available'),
  -- Khu Ngoài
  (v_branch_dd_id, v_zone_ngoai_id, 5, 4, 'available'),
  (v_branch_dd_id, v_zone_ngoai_id, 6, 4, 'available'),
  (v_branch_dd_id, v_zone_ngoai_id, 7, 2, 'available');

-- ============================================================
-- 9. LOYALTY TIERS
-- ============================================================
INSERT INTO loyalty_tiers (tenant_id, name, min_points, discount_pct, benefits, sort_order) VALUES
  (v_tenant_id, 'Thành Viên',  0,    0,  '{"welcome_drink": false}'::jsonb, 1),
  (v_tenant_id, 'Bạc',       500,    5,  '{"welcome_drink": true, "birthday_discount": 10}'::jsonb, 2),
  (v_tenant_id, 'Vàng',     2000,   10,  '{"welcome_drink": true, "birthday_discount": 20, "priority_seating": true}'::jsonb, 3),
  (v_tenant_id, 'Kim Cương', 5000,  15,  '{"welcome_drink": true, "birthday_discount": 30, "priority_seating": true, "free_delivery": true}'::jsonb, 4);

-- ============================================================
-- 10. SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (tenant_id, key, value) VALUES
  (v_tenant_id, 'currency',       '"VND"'),
  (v_tenant_id, 'timezone',       '"Asia/Ho_Chi_Minh"'),
  (v_tenant_id, 'tax_rate',       '10'),
  (v_tenant_id, 'service_charge', '5'),
  (v_tenant_id, 'receipt_header', '"CƠM TẤM MÁ TƯ - Thịt tươi 100% - Cơm tấm đúng chất"'),
  (v_tenant_id, 'receipt_footer', '"Cảm ơn quý khách! Hẹn gặp lại!"');

-- ============================================================
-- NO POS TERMINALS (owner configures after login)
-- NO KDS STATIONS (owner configures after login)
-- ============================================================

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
