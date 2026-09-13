import { z } from "zod";

export const inquirySummaryResponseSchema = z.object({
  total: z.number().int().nonnegative(),

  pending: z.number().int().nonnegative(),

  inProgress: z.number().int().nonnegative(),

  answered: z.number().int().nonnegative(),
});

export type InquirySummaryResponseDTO =
  z.infer<typeof inquirySummaryResponseSchema>;