import { z } from "zod";

export const deletionRequestSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal("")),
});
export type DeletionRequestInput = z.infer<typeof deletionRequestSchema>;
