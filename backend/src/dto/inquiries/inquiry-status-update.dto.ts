// 처리 상태 변경
// inquiries.idx, status 가 필요.
import { z } from "zod";

export const inquiryStatusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "ANSWERED",
  ]),
});

export type InquiryStatusUpdateDTO =
  z.infer<typeof inquiryStatusUpdateSchema>;