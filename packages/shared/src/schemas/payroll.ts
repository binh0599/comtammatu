import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Verify that a YYYY-MM-DD string is a real calendar date (rejects e.g. 2023-02-30). */
export function isRealDate(d: string): boolean {
  const [y, m, day] = d.split("-").map(Number);
  if (y === undefined || m === undefined || day === undefined) return false;
  const dt = new Date(Date.UTC(y, m - 1, day));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === day
  );
}

export const createPayrollPeriodSchema = z
  .object({
    branch_id: z.coerce.number().int().positive("Chọn chi nhánh"),
    name: z.string().min(1, "Tên kỳ lương không được để trống").max(100),
    start_date: z
      .string()
      .regex(isoDateRegex, "Ngày bắt đầu không hợp lệ (YYYY-MM-DD)")
      .refine(isRealDate, "Ngày bắt đầu không hợp lệ"),
    end_date: z
      .string()
      .regex(isoDateRegex, "Ngày kết thúc không hợp lệ (YYYY-MM-DD)")
      .refine(isRealDate, "Ngày kết thúc không hợp lệ"),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
    path: ["end_date"],
  });
export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;

export const payrollPeriodIdSchema = z.coerce
  .number()
  .int()
  .positive("ID kỳ lương không hợp lệ");

export const updatePayrollEntrySchema = z.object({
  id: z.coerce.number().int().positive(),
  overtime_hours: z.coerce.number().min(0, "Không được âm").optional(),
  overtime_pay: z.coerce.number().min(0, "Không được âm").optional(),
  deductions: z.coerce.number().min(0, "Không được âm").optional(),
  bonuses: z.coerce.number().min(0, "Không được âm").optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;
