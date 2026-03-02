import { z } from "zod";

export const createCustomerSchema = z.object({
  full_name: z.string().min(1, "Tên không được để trống").max(200),
  phone: z.string().min(10, "Số điện thoại không hợp lệ").max(20),
  email: z
    .string()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["M", "F", "Other"]).optional(),
  birthday: z.string().optional().or(z.literal("")),
  source: z.enum(["pos", "app", "website"]).optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z
    .string()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["M", "F", "Other"]).optional().nullable(),
  birthday: z.string().optional().or(z.literal("")).nullable(),
  source: z.enum(["pos", "app", "website"]).optional().nullable(),
  loyalty_tier_id: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createLoyaltyTierSchema = z.object({
  name: z.string().min(1, "Tên hạng không được để trống").max(100),
  min_points: z.coerce.number().int().min(0, "Điểm tối thiểu phải >= 0"),
  discount_pct: z.coerce
    .number()
    .min(0)
    .max(100, "Giảm giá tối đa 100%")
    .optional(),
  benefits: z.string().max(1000).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(1).optional(),
});
export type CreateLoyaltyTierInput = z.infer<typeof createLoyaltyTierSchema>;

export const updateLoyaltyTierSchema = createLoyaltyTierSchema.partial();
export type UpdateLoyaltyTierInput = z.infer<typeof updateLoyaltyTierSchema>;

export const adjustLoyaltyPointsSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  points: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, "Điểm phải khác 0"),
  type: z.enum(["earn", "redeem", "adjust"]),
  reference_type: z.string().optional(),
  reference_id: z.coerce.number().optional(),
});
export type AdjustLoyaltyPointsInput = z.infer<
  typeof adjustLoyaltyPointsSchema
>;
