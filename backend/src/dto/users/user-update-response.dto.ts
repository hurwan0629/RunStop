import { z } from "zod";

export const userUpdateResponseSchema = z.object({
  user: z.object({
    idx: z.number().int(),
    nickname: z.string(),
  }),

  profile: z.object({
    weightKg: z.number().positive().nullable(),
    heightCm: z.number().positive().nullable(),
    runningSettings: z.record(z.string(), z.unknown()).nullable(),
    profileImageUrl: z.string().nullable(),
  }),
});

export type UserUpdateResponseDTO =
  z.infer<typeof userUpdateResponseSchema>;
