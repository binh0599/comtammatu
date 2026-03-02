import { z } from "zod";

export const createVoucherSchema = z.object({
  code: z
    .string()
    .min(1, "Mã voucher không được để trống")
    .max(50)
    .transform((v) => v.toUpperCase().trim()),
  type: z.enum(["percent", "fixed", "free_item"]),
  value: z.coerce.number().min(0, "Giá trị phải >= 0"),
  min_order: z.coerce
    .number()
    .min(0, "Đơn tối thiểu phải >= 0")
    .optional()
    .nullable(),
  max_discount: z.coerce
    .number()
    .min(0, "Giảm tối đa phải >= 0")
    .optional()
    .nullable(),
  valid_from: z.string().min(1, "Ngày bắt đầu không được để trống"),
  valid_to: z.string().min(1, "Ngày kết thúc không được để trống"),
  max_uses: z.coerce.number().int().min(1, "Số lần sử dụng tối thiểu 1").optional().nullable(),
  is_active: z.boolean().default(true),
  description: z.string().max(500).optional().or(z.literal("")),
  branch_ids: z.array(z.coerce.number().int().positive()).optional(),
});
export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;

export const updateVoucherSchema = createVoucherSchema.partial();
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
