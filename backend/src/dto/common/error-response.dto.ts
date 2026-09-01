import { z } from "zod"

// 서버 공통 에러 메시지
export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
})

export type ErrorResponseDTO =
  z.infer<typeof errorResponseSchema>;