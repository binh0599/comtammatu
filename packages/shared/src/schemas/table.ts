import { z } from "zod";

export const createTableSchema = z.object({
  branch_id: z.coerce.number().int().positive(),
  number: z.coerce.number().int().positive("Số bàn phải lớn hơn 0"),
  capacity: z.coerce.number().int().min(1, "Sức chứa tối thiểu 1").optional(),
  zone_id: z.coerce.number().int().positive("Vui lòng chọn khu vực"),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial();
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

export const createReservationSchema = z.object({
  table_id: z.coerce.number().int().positive(),
  customer_name: z.string().min(1, "Tên khách không được để trống").max(200),
  customer_phone: z.string().min(1, "Số điện thoại không được để trống").max(20),
  guest_count: z.coerce.number().int().min(1, "Số khách tối thiểu 1"),
  reserved_at: z.string().min(1, "Vui lòng chọn thời gian"),
  notes: z.string().max(500).optional(),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
