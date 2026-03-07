import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Ten chien dich khong duoc de trong").max(200),
  type: z.enum(["email", "sms", "push"]),
  target_segment: z
    .object({
      loyalty_tier_ids: z.array(z.coerce.number().int().positive()).optional(),
      min_total_spent: z.coerce.number().min(0).optional(),
      min_visits: z.coerce.number().int().min(0).optional(),
      gender: z.enum(["M", "F", "Other"]).optional(),
    })
    .optional(),
  content: z.object({
    subject: z.string().max(200).optional(),
    body: z.string().min(1, "Noi dung khong duoc de trong").max(5000),
    cta_url: z.string().url().optional().or(z.literal("")),
  }),
  scheduled_at: z.string().datetime().optional().or(z.literal("")),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const customerOrderItemSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(99),
  variant_id: z.coerce.number().int().positive().optional(),
  modifiers: z.array(z.coerce.number().int().positive()).optional(),
  notes: z.string().max(200).optional().or(z.literal("")),
});

export const customerPlaceOrderSchema = z.object({
  branch_id: z.coerce.number().int().positive(),
  type: z.enum(["dine_in", "takeaway"]),
  table_id: z.coerce.number().int().positive().optional(),
  items: z.array(customerOrderItemSchema).min(1, "Phai co it nhat 1 mon"),
  notes: z.string().max(500).optional().or(z.literal("")),
  voucher_code: z.string().optional().or(z.literal("")),
});
export type CustomerPlaceOrderInput = z.infer<typeof customerPlaceOrderSchema>;

export const analyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchIds: z.array(z.coerce.number().int().positive()).optional(),
});
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

export const forecastQuerySchema = z.object({
  ingredient_id: z.coerce.number().int().positive().optional(),
  days_ahead: z.coerce.number().int().min(1).max(30).default(7),
  branch_id: z.coerce.number().int().positive().optional(),
});
export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;

export const staffPerformanceQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branch_id: z.coerce.number().int().positive().optional(),
  role: z.enum(["waiter", "cashier", "chef"]).optional(),
});
export type StaffPerformanceQueryInput = z.infer<
  typeof staffPerformanceQuerySchema
>;
