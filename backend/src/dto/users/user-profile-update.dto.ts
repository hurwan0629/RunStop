import { z } from "zod";

export const userProfileUpdateSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),

  weightKg: z.number().positive().optional(),

  heightCm: z.number().positive().optional(),

  // Python 추천/분석 모듈로 넘길 수 있도록 JSON 객체 형태를 유지합니다.
  runningSettings: z.record(
    z.string(),
    z.unknown()
  ).optional(),
});

export type UserProfileUpdateDTO =
  z.infer<typeof userProfileUpdateSchema>;
