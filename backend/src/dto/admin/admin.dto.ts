import { z } from "zod";

export const adminSuspensionSchema = z.object({
  userIdx: z.number().int().positive(),
  suspendedUntil: z.iso.datetime({ offset: true }).nullable().refine(
    (value) => value === null || Date.parse(value) > Date.now(),
    "정지 종료 시각은 현재보다 미래여야 합니다.",
  ),
  reason: z.string().trim().min(1).max(2000)
    .refine((value) => !/[\r\n]/.test(value), "정지 사유는 한 줄로 입력해 주세요."),
});

export type AdminSuspensionDTO = z.infer<typeof adminSuspensionSchema>;
