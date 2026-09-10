import { z } from "zod";

/**
 * service.users 테이블에서 사용하는 회원 상태
 */
export const adminUserStatusSchema = z.enum([
  "ENABLED",
  "SUSPENDED",
  "WITHDRAWN",
]);

/**
 * GET /api/admin/users 쿼리스트링 검증
 */
export const adminUserListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  keyword: z.string()
    .trim()
    .max(50)
    .optional(),

  status: adminUserStatusSchema.optional(),
});

/**
 * 회원 목록의 회원 한 명
 */
export const adminUserListItemSchema = z.object({
  userIdx: z.number().int().positive(),

  loginId: z.string(),

  nickname: z.string(),

  phoneNumber: z.string().nullable(),

  status: adminUserStatusSchema,

  joinedAt: z.string(),

  lastLoginAt: z.string().nullable(),
});

/**
 * 상태별 회원 수
 */
export const adminUserSummarySchema = z.object({
  total: z.number().int().nonnegative(),

  enabled: z.number().int().nonnegative(),

  suspended: z.number().int().nonnegative(),

  withdrawn: z.number().int().nonnegative(),
});

/**
 * 최종 응답 data 검증
 */
export const adminUserListResponseSchema = z.object({
  items: z.array(adminUserListItemSchema),

  page: z.number().int().positive(),

  limit: z.number().int().positive(),

  total: z.number().int().nonnegative(),

  totalPages: z.number().int().nonnegative(),

  summary: adminUserSummarySchema,
});

export type AdminUserStatus =
  z.infer<typeof adminUserStatusSchema>;

export type AdminUserListQueryDTO =
  z.infer<typeof adminUserListQuerySchema>;

export type AdminUserListResponseDTO =
  z.infer<typeof adminUserListResponseSchema>;