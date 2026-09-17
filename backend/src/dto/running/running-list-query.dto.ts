import { z } from "zod";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const runningListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export type RunningListQueryDTO =
  z.infer<typeof runningListQuerySchema>;
