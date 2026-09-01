import { z } from "zod";

export const inquiryListItemSchema = z.object({
  idx: z.number().int(),

  title: z.string(),

  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "ANSWERED",
  ]),

  createdAt: z.string(),
});

export type InquiryListItemDTO =
  z.infer<typeof inquiryListItemSchema>;