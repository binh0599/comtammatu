import { z } from "zod";

// ===== Register Device (auto on login) =====

export const registerDeviceSchema = z.object({
  device_fingerprint: z.string().min(1).max(255),
  device_name: z.string().max(255).default(""),
  user_agent: z.string().max(500).optional(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

// ===== Approve Device (admin action) =====

export const approveDeviceSchema = z.object({
  device_id: z.number().int().positive(),
});

export type ApproveDeviceInput = z.infer<typeof approveDeviceSchema>;

// ===== Reject Device (admin action) =====

export const rejectDeviceSchema = z.object({
  device_id: z.number().int().positive(),
});

export type RejectDeviceInput = z.infer<typeof rejectDeviceSchema>;

// ===== Update Device KDS Categories (admin action) =====

export const updateDeviceCategoriesSchema = z.object({
  device_id: z.number().int().positive(),
  category_ids: z.array(z.number().int().positive()).min(1, "Phải chọn ít nhất 1 danh mục"),
});

export type UpdateDeviceCategoriesInput = z.infer<typeof updateDeviceCategoriesSchema>;
