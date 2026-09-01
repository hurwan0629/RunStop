import { z } from "zod";

export const authResponseSchema = z.object({
  accessToken: z.string(),

  user: z.object({
    idx: z.number().int(),
    nickname: z.string(),
    role: z.enum(["USER", "ADMIN"]),
  }),
});

export type AuthResponseDTO =
  z.infer<typeof authResponseSchema>;