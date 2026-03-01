import { z } from "zod";

// ===== Create KDS Station =====

export const createKdsStationSchema = z.object({
  branch_id: z.number().int().positive(),
  name: z.string().min(1, "Tên bếp không được để trống").max(100),
  category_ids: z
    .array(z.number().int().positive())
    .min(1, "Phải chọn ít nhất 1 danh mục"),
  display_config: z.record(z.unknown()).optional(),
});

export type CreateKdsStationInput = z.infer<typeof createKdsStationSchema>;

// ===== Update KDS Station =====

export const updateKdsStationSchema = z.object({
  station_id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  category_ids: z.array(z.number().int().positive()).min(1).optional(),
  display_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateKdsStationInput = z.infer<typeof updateKdsStationSchema>;

// ===== Bump KDS Ticket =====

export const bumpTicketSchema = z.object({
  ticket_id: z.number().int().positive(),
  status: z.enum(["preparing", "ready"]),
});

export type BumpTicketInput = z.infer<typeof bumpTicketSchema>;
