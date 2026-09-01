import { z } from "zod";

export const userProfileUpdateSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),

  phone: z.string().max(20).optional(),

  weightKg: z.number().positive().optional(),

  heightCm: z.number().positive().optional(),

  runningSettings: z.record(
    z.string(),
    z.unknown()
  ).optional(),

  profileImageUrl: z.string().optional(),
});

export type UserProfileUpdateDTO =
  z.infer<typeof userProfileUpdateSchema>;