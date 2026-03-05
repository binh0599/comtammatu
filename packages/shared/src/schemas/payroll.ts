import { z } from "zod";

export const createPayrollPeriodSchema = z.object({
  branch_id: z.coerce.number().int().positive("Chọn chi nhánh"),
  name: z.string().min(1, "Tên kỳ lương không được để trống").max(100),
  start_date: z.string().min(1, "Ngày bắt đầu không được để trống"),
  end_date: z.string().min(1, "Ngày kết thúc không được để trống"),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;

export const updatePayrollEntrySchema = z.object({
  id: z.coerce.number().int().positive(),
  overtime_hours: z.coerce.number().min(0, "Không được âm").optional(),
  overtime_pay: z.coerce.number().min(0, "Không được âm").optional(),
  deductions: z.coerce.number().min(0, "Không được âm").optional(),
  bonuses: z.coerce.number().min(0, "Không được âm").optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;
