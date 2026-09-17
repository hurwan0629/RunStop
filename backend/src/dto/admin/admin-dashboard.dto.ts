import { z } from "zod";

const dashboardInquiryStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "ANSWERED",
]);

export const adminDashboardResponseSchema = z.object({
  summary: z.object({
    totalUsers: z.number().int().nonnegative(),

    todayJoinedUsers: z.number().int().nonnegative(),

    pendingInquiries: z.number().int().nonnegative(),

    todayAnsweredInquiries: z.number().int().nonnegative(),
  }),

  recentInquiries: z.array(
    z.object({
      inquiryIdx: z.number().int().positive(),

      title: z.string(),

      status: dashboardInquiryStatusSchema,

      createdAt: z.string(),

      authorNickname: z.string(),

      answererNickname: z.string().nullable(),
    }),
  ),
});

export type AdminDashboardResponseDTO =
  z.infer<typeof adminDashboardResponseSchema>;