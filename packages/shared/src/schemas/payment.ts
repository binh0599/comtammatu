import { z } from "zod";

// ===== Process Payment (Cash + QR/Momo) =====

export const processPaymentSchema = z
  .object({
    order_id: z.number().int().positive(),
    method: z.enum(["cash", "qr"]),
    amount_tendered: z.number().positive("Số tiền phải lớn hơn 0").optional(),
    tip: z.number().min(0).default(0),
  })
  .refine(
    (data) => data.method !== "cash" || (data.amount_tendered !== undefined && data.amount_tendered > 0),
    { message: "Số tiền khách đưa là bắt buộc khi thanh toán tiền mặt", path: ["amount_tendered"] },
  );

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
