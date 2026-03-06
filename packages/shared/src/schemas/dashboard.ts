import { z } from "zod";

export const dashboardLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(10);

export const dashboardDaysSchema = z
  .number()
  .int()
  .min(1)
  .max(365)
  .default(7);

export type DashboardLimitInput = z.input<typeof dashboardLimitSchema>;
export type DashboardDaysInput = z.input<typeof dashboardDaysSchema>;
