import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
    error: "Chọn loại phiếu",
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

// ===== KDS Inventory: 86'd Toggle =====

export const toggleMenuItemAvailabilitySchema = z.object({
  menu_item_id: z.coerce.number().int().positive("Chọn món"),
  is_available: z.boolean(),
  reason: z.string().max(200).optional().or(z.literal("")),
});
export type ToggleMenuItemAvailabilityInput = z.infer<
  typeof toggleMenuItemAvailabilitySchema
>;

// ===== KDS Inventory: Quick Waste Log =====

export const quickWasteLogSchema = z.object({
  ingredient_id: z.coerce.number().int().positive("Chọn nguyên liệu"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  reason: z.enum(["expired", "spoiled", "overproduction", "other"], {
    error: "Chọn lý do",
  }),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type QuickWasteLogInput = z.infer<typeof quickWasteLogSchema>;

// ===== Stock Count (End-of-Day) =====

export const createStockCountSchema = z.object({
  items: z
    .array(
      z.object({
        ingredient_id: z.coerce.number().int().positive(),
        actual_qty: z.coerce.number().min(0, "Số lượng thực tế phải >= 0"),
        notes: z.string().max(200).optional().or(z.literal("")),
      })
    )
    .min(1, "Phải kiểm đếm ít nhất 1 nguyên liệu")
    .refine(
      (items) => {
        const ids = items.map((i) => i.ingredient_id);
        return new Set(ids).size === ids.length;
      },
      { message: "ingredient_id phải là duy nhất trong danh sách" },
    ),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreateStockCountInput = z.infer<typeof createStockCountSchema>;

export const approveStockCountSchema = z.object({
  count_id: z.coerce.number().int().positive("ID phiếu kiểm kho không hợp lệ"),
});
export type ApproveStockCountInput = z.infer<typeof approveStockCountSchema>;

// ===== Urgent Restock Request (from KDS) =====

export const urgentRestockRequestSchema = z.object({
  supplier_id: z.coerce.number().int().positive("Chọn nhà cung cấp"),
  items: z
    .array(
      z.object({
        ingredient_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
      })
    )
    .min(1, "Phải có ít nhất 1 nguyên liệu"),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type UrgentRestockRequestInput = z.infer<typeof urgentRestockRequestSchema>;

// ===== Prep List Query =====

export const prepListQuerySchema = z.object({
  target_portions: z.coerce.number().int().min(0, "Số phần phải >= 0").optional(),
});
export type PrepListQueryInput = z.infer<typeof prepListQuerySchema>;

// ===== Expiring Batches Query =====

export const expiringBatchesQuerySchema = z.object({
  days_ahead: z.coerce.number().int().positive("Số ngày phải > 0").optional(),
});
export type ExpiringBatchesQueryInput = z.infer<typeof expiringBatchesQuerySchema>;

// ===== Food Cost Report =====

export const foodCostQuerySchema = z
  .object({
    date_from: z.string().min(1, "Chọn ngày bắt đầu").regex(ISO_DATE_REGEX, "Ngày không hợp lệ (YYYY-MM-DD)"),
    date_to: z.string().min(1, "Chọn ngày kết thúc").regex(ISO_DATE_REGEX, "Ngày không hợp lệ (YYYY-MM-DD)"),
  })
  .refine(
    (data) => data.date_from <= data.date_to,
    { message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc", path: ["date_from"] },
  );
export type FoodCostQueryInput = z.infer<typeof foodCostQuerySchema>;
