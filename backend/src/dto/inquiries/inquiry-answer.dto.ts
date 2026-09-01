import { z } from "zod";

export const inquiryAnswerSchema = z.object({
  answer: z.string().min(1),

  memo: z.string().optional(),
});

export type InquiryAnswerDTO =
  z.infer<typeof inquiryAnswerSchema>;