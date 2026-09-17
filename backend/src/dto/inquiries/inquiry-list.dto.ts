import { z } from "zod";

export const inquiryStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "ANSWERED",
]);

export const inquiryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: inquiryStatusSchema.optional(),
});

export const inquiryListItemSchema = z.object({
  idx: z.number().int(),

  title: z.string(),

  status: inquiryStatusSchema,

  createdAt: z.string(),
});

export const inquiryListResponseSchema = z.object({
  items: z.array(inquiryListItemSchema),
  page: z.number().int(),
  limit: z.number().int(),
});

export type InquiryListItemDTO =
  z.infer<typeof inquiryListItemSchema>;

export type InquiryListQueryDTO =
  z.infer<typeof inquiryListQuerySchema>;

export type InquiryListResponseDTO =
  z.infer<typeof inquiryListResponseSchema>;
