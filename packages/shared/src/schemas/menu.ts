import { z } from "zod";

// ===== Menu =====

export const menuSchema = z.object({
  name: z.string().min(1, "Tên thực đơn không được để trống"),
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  is_active: z.boolean().default(true),
});

export type MenuInput = z.infer<typeof menuSchema>;

// ===== Menu Category =====

export const menuCategorySchema = z.object({
  menu_id: z.coerce.number().positive(),
  name: z.string().min(1, "Tên danh mục không được để trống"),
  sort_order: z.coerce.number().int().min(0).default(0),
  type: z.enum(["main_dish", "side_dish", "drink"]).default("main_dish"),
});

export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;

// ===== Menu Item =====

export const menuItemSchema = z.object({
  category_id: z.coerce.number().positive(),
  name: z.string().min(1, "Tên món không được để trống"),
  description: z.string().optional(),
  base_price: z.coerce.number().positive("Giá phải lớn hơn 0"),
  is_available: z.boolean().default(true),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

// ===== Available Sides for a Menu Item =====

export const menuItemAvailableSidesSchema = z.object({
  menu_item_id: z.number().int().positive(),
  side_item_ids: z.array(z.number().int().positive()).min(0),
});

export type MenuItemAvailableSidesInput = z.infer<
  typeof menuItemAvailableSidesSchema
>;

// ===== Entity ID (reusable for single-ID mutation params) =====

export const entityIdSchema = z.number().int().positive("ID không hợp lệ");
