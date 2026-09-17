import { z } from "zod";

export const userProfileSchema = z.object({
  weightKg: z.number().positive().nullable(),

  heightCm: z.number().positive().nullable(),

  runningSettings: z.record(
    z.string(),
    z.unknown()
  ).nullable(),

  profileImageUrl: z.string().nullable(),
});

export type UserProfileDTO =
  z.infer<typeof userProfileSchema>;