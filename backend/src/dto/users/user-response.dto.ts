import { z } from "zod";

export const userResponseSchema = z.object({
  idx: z.number().int(),

  loginId: z.string(),

  nickname: z.string(),

  totalExp: z.number().int(),

  role: z.enum(["USER", "ADMIN"]),

  phone: z.string().nullable(),

  status: z.enum([
    "ENABLED",
    "SUSPENDED",
    "WITHDRAWN",
  ]),

  createdAt: z.string(),
});

export type UserResponseDTO =
  z.infer<typeof userResponseSchema>;