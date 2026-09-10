import { z } from "zod";

const reasonSchema = z
  .string()
  .trim()
  .min(1, "사유를 입력해주세요.")
  .max(2000, "사유는 2000자 이하여야 합니다.");

export const adminUserStatusUpdateSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("SUSPENDED"),
      suspendedUntil: z.iso.datetime({ offset: true }).nullable(),
      reason: reasonSchema,
    }),
    z.object({
      status: z.literal("ENABLED"),
      reason: reasonSchema,
    }),
  ],
);

export type AdminUserStatusUpdateInput = z.infer<
  typeof adminUserStatusUpdateSchema
>;