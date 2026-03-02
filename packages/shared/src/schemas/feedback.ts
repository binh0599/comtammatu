import { z } from "zod";

export const createFeedbackSchema = z.object({
  order_id: z.coerce.number().int().positive().optional().nullable(),
  branch_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, "Đánh giá tối thiểu 1 sao").max(5, "Đánh giá tối đa 5 sao"),
  comment: z.string().max(1000).optional().or(z.literal("")),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const respondFeedbackSchema = z.object({
  response: z.string().min(1, "Phản hồi không được để trống").max(1000),
});
export type RespondFeedbackInput = z.infer<typeof respondFeedbackSchema>;
