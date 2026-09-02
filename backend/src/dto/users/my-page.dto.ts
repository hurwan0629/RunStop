import { z } from "zod";

export const myPageResponseSchema = z.object({
  user: z.object({
    idx: z.number().int(),
    loginId: z.string(),
    nickname: z.string(),
    role: z.enum(["USER", "ADMIN"]),
    totalExp: z.number().int(),
  }),

  profile: z.object({
    weightKg: z.number().positive().nullable(),
    heightCm: z.number().positive().nullable(),
    runningSettings: z.record(z.string(), z.unknown()).nullable(),
    profileImageUrl: z.string().nullable(),
  }).nullable(),

  currentGoal: z.object({
    idx: z.number().int(),
    goalType: z.enum(["WEEKLY", "MONTHLY"]),
    startDate: z.string(),
    endDate: z.string(),
    progressDistance: z.number().int(),
    targetDistance: z.number().int(),
  }).nullable(),

  runningSummary: z.object({
    totalCount: z.number().int(),
    totalDistance: z.number().int(),
    bestPace: z.number().int().nullable(),
  }),

  bookmarkSummary: z.object({
    routeBookmarkCount: z.number().int(),
  }),
});

export type MyPageResponseDTO =
  z.infer<typeof myPageResponseSchema>;
