import { z } from "zod";

export const createTableSchema = z.object({
  branch_id: z.coerce.number().int().positive(),
  number: z.coerce.number().int().positive("So ban phai lon hon 0"),
  capacity: z.coerce.number().int().min(1, "Suc chua toi thieu 1").optional(),
  zone_id: z.coerce.number().int().positive("Vui long chon khu vuc"),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial();
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

export const createReservationSchema = z.object({
  table_id: z.coerce.number().int().positive(),
  customer_name: z.string().min(1, "Ten khach khong duoc de trong").max(200),
  customer_phone: z.string().min(1, "So dien thoai khong duoc de trong").max(20),
  guest_count: z.coerce.number().int().min(1, "So khach toi thieu 1"),
  reserved_at: z.string().min(1, "Vui long chon thoi gian"),
  notes: z.string().max(500).optional(),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
