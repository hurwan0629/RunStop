import { z } from "zod";

export const inquiryAnswerSchema = z.object({
  answer: z.string().min(1),

  memo: z.string().optional(),
});

export const inquiryAnswerResponseSchema = z.object({
  idx: z.number().int(),
  status: z.literal("ANSWERED"),
  answererIdx: z.number().int(),
  answeredAt: z.string(),
});

export type InquiryAnswerDTO =
  z.infer<typeof inquiryAnswerSchema>;

export type InquiryAnswerResponseDTO =
  z.infer<typeof inquiryAnswerResponseSchema>;
