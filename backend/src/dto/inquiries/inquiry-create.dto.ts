// 사용자가 문의를 넣는 것
// 사용자 idx, title, content, type만 있으면 됨
import { z } from "zod";

export const inquiryCreateSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
});

export type InquiryCreateDTO =
  z.infer<typeof inquiryCreateSchema>;