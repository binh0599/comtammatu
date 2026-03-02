import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Tên nguyên liệu không được để trống").max(200),
  sku: z.string().max(50).optional().or(z.literal("")),
  unit: z.string().min(1, "Đơn vị không được để trống"),
  category: z.string().max(100).optional().or(z.literal("")),
  min_stock: z.coerce.number().min(0, "Tối thiểu phải >= 0").optional(),
  max_stock: z.coerce.number().min(0, "Tối đa phải >= 0").optional(),
  cost_price: z.coerce.number().min(0, "Giá phải >= 0").optional(),
  is_active: z.boolean().default(true),
});
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = createIngredientSchema.partial();
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

export const createStockMovementSchema = z.object({
  ingredient_id: z.coerce.number().int().positive("Chọn nguyên liệu"),
  branch_id: z.coerce.number().int().positive("Chọn chi nhánh"),
  type: z.enum(["in", "out", "transfer", "waste", "adjust"], {
    required_error: "Chọn loại phiếu",
  }),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  cost_at_time: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreateStockMovementInput = z.infer<
  typeof createStockMovementSchema
>;

export const createRecipeSchema = z.object({
  menu_item_id: z.coerce.number().int().positive("Chọn món"),
  yield_qty: z.coerce.number().positive().optional(),
  yield_unit: z.string().optional().or(z.literal("")),
  ingredients: z
    .array(
      z.object({
        ingredient_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
        unit: z.string().min(1, "Đơn vị không được để trống"),
        waste_pct: z.coerce.number().min(0).max(100).default(0),
      })
    )
    .min(1, "Công thức phải có ít nhất 1 nguyên liệu"),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
