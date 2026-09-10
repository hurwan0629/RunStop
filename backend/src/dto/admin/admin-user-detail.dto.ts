import { z } from "zod";

import {
  adminUserStatusSchema,
} from "./admin-user-list.dto.js";

const inquiryStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "ANSWERED",
]);

export const adminUserDetailResponseSchema = z.object({
  user: z.object({
    userIdx: z.number().int().positive(),

    loginId: z.string(),

    nickname: z.string(),

    phoneNumber: z.string().nullable(),

    status: adminUserStatusSchema,

    totalExp: z.number().int(),

    joinedAt: z.string(),

    lastLoginAt: z.string().nullable(),

    suspendedUntil: z.string().nullable(),
  }),

  runningSummary: z.object({
    completedRunCount: z.number().int().nonnegative(),

    totalDistanceMeter: z.number().int().nonnegative(),
  }),

  recentInquiries: z.array(
    z.object({
      inquiryIdx: z.number().int().positive(),

      title: z.string(),

      status: inquiryStatusSchema,

      createdAt: z.string(),
    }),
  ),

  adminMemo: z.string().nullable(),
});

export type AdminUserDetailResponseDTO =
  z.infer<typeof adminUserDetailResponseSchema>;