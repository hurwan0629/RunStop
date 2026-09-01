import { z } from "zod";


// 페이지네이션이 필요한 응답에 대해서는 해당 스키마를 이용하여 응답.
// page
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
});

export type PaginationDTO =
  z.infer<typeof paginationSchema>;