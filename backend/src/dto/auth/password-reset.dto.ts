import { z } from "zod";

export const passwordResetSchema = z.object({
  verificationId: z.string().uuid(),
  newPassword: z.string().min(8).max(100),
});

export type PasswordResetDTO =
  z.infer<typeof passwordResetSchema>;
