import { z } from "zod";

// ===== Printer Configuration Schemas =====

export const PRINTER_TYPES = ["thermal_usb", "thermal_network", "browser"] as const;
export type PrinterType = (typeof PRINTER_TYPES)[number];

export const PAPER_WIDTHS = [58, 80] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];

export const PRINTER_TEST_STATUSES = ["connected", "error", "untested"] as const;
export type PrinterTestStatus = (typeof PRINTER_TEST_STATUSES)[number];

// USB connection config
export const usbConnectionConfigSchema = z.object({
  vendor_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  device_serial: z.string().optional(),
});
export type UsbConnectionConfig = z.infer<typeof usbConnectionConfigSchema>;

// Network connection config
export const networkConnectionConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(["http", "https", "raw"]).default("raw"),
});
export type NetworkConnectionConfig = z.infer<typeof networkConnectionConfigSchema>;

// Create printer config
export const createPrinterConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(PRINTER_TYPES),
  connection_config: z.record(z.string(), z.unknown()).default({}),
  paper_width_mm: z.coerce.number().refine(
    (v) => v === 58 || v === 80,
    "Khổ giấy phải là 58mm hoặc 80mm",
  ),
  encoding: z.string().default("utf-8"),
  auto_print: z.boolean().default(false),
  print_delay_ms: z.coerce.number().int().min(0).max(5000).default(500),
  assigned_to_type: z.enum(["pos_terminal", "kds_station"]).nullish(),
  assigned_to_id: z.coerce.number().int().positive().nullish(),
});
export type CreatePrinterConfigInput = z.infer<typeof createPrinterConfigSchema>;

// Update printer config (partial)
export const updatePrinterConfigSchema = createPrinterConfigSchema.partial();
export type UpdatePrinterConfigInput = z.infer<typeof updatePrinterConfigSchema>;

// Assign printer to terminal or station
export const assignPrinterSchema = z.object({
  printer_config_id: z.coerce.number().int().positive(),
  assigned_to_type: z.enum(["pos_terminal", "kds_station"]),
  assigned_to_id: z.coerce.number().int().positive(),
});
export type AssignPrinterInput = z.infer<typeof assignPrinterSchema>;
