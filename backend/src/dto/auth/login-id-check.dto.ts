import { z } from "zod";

// 로그인 아이디는 임시로 4 ~ 50 자 입니다.
export const loginIdCheckSchema = z.object({
  loginId: z.string().min(4).max(50),
});

export type LoginIdCheckDTO =
  z.infer<typeof loginIdCheckSchema>;
