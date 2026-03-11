import { z } from "zod";

// ===== Open POS Session =====

export const openSessionSchema = z.object({
  terminal_id: z.number().int().positive(),
  opening_amount: z.number().min(0, "Số tiền đầu ca không được âm"),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

// ===== Close POS Session =====

export const closeSessionSchema = z.object({
  session_id: z.number().int().positive(),
  closing_amount: z.number().min(0, "Số tiền cuối ca không được âm"),
  notes: z.string().max(500).optional(),
});

export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
