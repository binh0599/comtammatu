import { z } from "zod";

// ===== Process Cash Payment (MVP — cash only) =====

export const processPaymentSchema = z.object({
  order_id: z.number().int().positive(),
  method: z.literal("cash"), // Only cash for MVP; expand to z.enum later
  amount_tendered: z.number().positive("Số tiền phải lớn hơn 0"),
  tip: z.number().min(0).default(0),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
