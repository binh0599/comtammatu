import { z } from "zod";

// ===== Register Terminal =====

export const registerTerminalSchema = z.object({
  branch_id: z.number().int().positive(),
  name: z.string().min(1, "Tên thiết bị không được để trống").max(100),
  type: z.enum(["mobile_order", "cashier_station"]),
  device_fingerprint: z.string().min(1).max(255),
  peripheral_config: z.record(z.unknown()).optional(),
});

export type RegisterTerminalInput = z.infer<typeof registerTerminalSchema>;

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
