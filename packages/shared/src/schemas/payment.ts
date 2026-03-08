import { z } from "zod";

// ===== Process Payment (Cash + QR/Momo) =====

export const processPaymentSchema = z
  .object({
    order_id: z.number().int().positive(),
    method: z.enum(["cash", "qr", "transfer"]),
    amount_tendered: z.number().positive("Số tiền phải lớn hơn 0").optional(),
    tip: z.number().min(0).default(0),
  })
  .refine(
    (data) => data.method !== "cash" || (data.amount_tendered !== undefined && data.amount_tendered > 0),
    { message: "Số tiền khách đưa là bắt buộc khi thanh toán tiền mặt", path: ["amount_tendered"] },
  );

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;

// ===== Payment Method Settings (stored in system_settings) =====

export const bankTransferConfigSchema = z.object({
  bank_id: z.string().min(1, "Mã ngân hàng là bắt buộc"),
  account_no: z.string().min(1, "Số tài khoản là bắt buộc"),
  account_name: z.string().min(1, "Tên chủ tài khoản là bắt buộc"),
  template: z.enum(["compact", "compact2", "qr_only", "print"]).default("compact2"),
});

export type BankTransferConfig = z.infer<typeof bankTransferConfigSchema>;

export const paymentMethodsConfigSchema = z.object({
  enabled_methods: z.array(z.enum(["cash", "qr", "transfer"])),
  bank_transfer: bankTransferConfigSchema.optional(),
});

export type PaymentMethodsConfig = z.infer<typeof paymentMethodsConfigSchema>;
