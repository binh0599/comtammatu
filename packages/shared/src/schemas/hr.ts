import { z } from "zod";

export const createEmployeeSchema = z.object({
  profile_id: z.string().uuid("Profile ID không hợp lệ"),
  branch_id: z.coerce.number().int().positive("Chọn chi nhánh"),
  position: z.string().min(1, "Vị trí không được để trống").max(100),
  department: z.string().max(100).optional().or(z.literal("")),
  hire_date: z.string().min(1, "Ngày vào làm không được để trống"),
  employment_type: z.enum(["full", "part", "contract"], {
    required_error: "Chọn loại hợp đồng",
  }),
  hourly_rate: z.coerce.number().positive().optional(),
  monthly_salary: z.coerce.number().positive().optional(),
  emergency_contact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relationship: z.string().optional(),
    })
    .optional(),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  position: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional().or(z.literal("")),
  branch_id: z.coerce.number().int().positive().optional(),
  employment_type: z.enum(["full", "part", "contract"]).optional(),
  hourly_rate: z.coerce.number().positive().optional().nullable(),
  monthly_salary: z.coerce.number().positive().optional().nullable(),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
  emergency_contact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relationship: z.string().optional(),
    })
    .optional(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const createShiftSchema = z.object({
  branch_id: z.coerce.number().int().positive("Chọn chi nhánh"),
  name: z.string().min(1, "Tên ca không được để trống").max(100),
  start_time: z.string().min(1, "Giờ bắt đầu không được để trống"),
  end_time: z.string().min(1, "Giờ kết thúc không được để trống"),
  break_min: z.coerce.number().int().min(0).optional(),
  max_employees: z.coerce.number().int().positive().optional(),
});
export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const createShiftAssignmentSchema = z.object({
  shift_id: z.coerce.number().int().positive("Chọn ca"),
  employee_id: z.coerce.number().int().positive("Chọn nhân viên"),
  date: z.string().min(1, "Ngày không được để trống"),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreateShiftAssignmentInput = z.infer<
  typeof createShiftAssignmentSchema
>;

export const createLeaveRequestSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  type: z.enum(["annual", "sick", "unpaid", "maternity"], {
    required_error: "Chọn loại nghỉ",
  }),
  start_date: z.string().min(1, "Ngày bắt đầu không được để trống"),
  end_date: z.string().min(1, "Ngày kết thúc không được để trống"),
  days: z.coerce.number().int().positive("Số ngày phải lớn hơn 0"),
  reason: z.string().max(500).optional().or(z.literal("")),
});
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const approveLeaveRequestSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["approved", "rejected"]),
});
export type ApproveLeaveRequestInput = z.infer<
  typeof approveLeaveRequestSchema
>;
