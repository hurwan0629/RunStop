// 처리 상태 변경
// inquiries.idx, status 가 필요.
import { z } from "zod";
import { inquiryStatusSchema } from "./inquiry-list.dto.js";

export const inquiryStatusUpdateSchema = z.object({
  status: inquiryStatusSchema,
});

export const inquiryStatusUpdateResponseSchema = z.object({
  idx: z.number().int(),
  status: inquiryStatusSchema,
});

export type InquiryStatusUpdateDTO =
  z.infer<typeof inquiryStatusUpdateSchema>;

export type InquiryStatusUpdateResponseDTO =
  z.infer<typeof inquiryStatusUpdateResponseSchema>;
