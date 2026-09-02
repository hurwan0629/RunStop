// 요청에 상세 정보
// idx, created_at, inquiry_type, users_idx, 
// status, title, content, answered_at, answerer_idx, 
// memo, answer
import { z } from "zod";
import { inquiryStatusSchema } from "./inquiry-list.dto.js";

export const inquiryDetailSchema = z.object({
  idx: z.number().int(),

  title: z.string(),
  content: z.string(),

  status: inquiryStatusSchema,

  answer: z.string().nullable(),

  createdAt: z.string(),
  answeredAt: z.string().nullable(),
});

export type InquiryDetailDTO =
  z.infer<typeof inquiryDetailSchema>;
