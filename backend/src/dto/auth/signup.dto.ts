import { z } from "zod";

export const signupSchema = z.object({
  loginId: z.string().min(4).max(50),
  password: z.string().min(8).max(100),
  nickname: z.string().min(1).max(30),
  phone: z.string().min(10).max(20),
  verificationId: z.string().uuid(),

  profile: z.object({
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
  }).optional(),
});

export type SignupDTO =
  z.infer<typeof signupSchema>;
