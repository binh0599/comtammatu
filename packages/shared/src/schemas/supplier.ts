import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp không được để trống").max(200),
  contact_name: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z
    .string()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  payment_terms: z.string().max(200).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.coerce.number().int().positive("Chọn nhà cung cấp"),
  branch_id: z.coerce.number().int().positive("Chọn chi nhánh"),
  expected_at: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        ingredient_id: z.coerce.number().int().positive("Chọn nguyên liệu"),
        quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
        unit_price: z.coerce.number().positive("Đơn giá phải lớn hơn 0"),
      })
    )
    .min(1, "Đơn mua hàng phải có ít nhất 1 mục"),
});
export type CreatePurchaseOrderInput = z.infer<
  typeof createPurchaseOrderSchema
>;

export const receivePurchaseOrderSchema = z.object({
  po_id: z.coerce.number().int().positive(),
  items: z
    .array(
      z.object({
        po_item_id: z.coerce.number().int().positive(),
        received_qty: z.coerce.number().min(0, "Số lượng nhận phải >= 0"),
      })
    )
    .min(1, "Phải có ít nhất 1 mục"),
});
export type ReceivePurchaseOrderInput = z.infer<
  typeof receivePurchaseOrderSchema
>;
