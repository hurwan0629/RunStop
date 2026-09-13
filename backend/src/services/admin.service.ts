import type {
  AdminUserListQueryDTO,
  AdminUserListResponseDTO,
} from "../dto/admin/admin-user-list.dto.js";

import { logger } from "../logging/logger.js";

import {
  countFilteredAdminUsers,
  findAdminUsers,
  summarizeAdminUsers,
  findAdminUserDetail,
  findAdminUserRunningSummary,
  findRecentInquiriesByUserIdx,
  updateAdminUserStatus,
  findAdminDashboardRecentInquiries,
  findAdminDashboardSummary,
} from "../repositories/admin.repository.js";

import type { AdminUserStatusUpdateInput } from "../dto/admin/admin-user-status.dto.js";
import type {
  AdminUserDetailResponseDTO,
} from "../dto/admin/admin-user-detail.dto.js";

import { ApiError } from "../middleware/error.js";
import type {
  AdminDashboardResponseDTO,
} from "../dto/admin/admin-dashboard.dto.js";


/**
 * 회원 목록에서는 전화번호 가운데 부분을 숨깁니다.
 */
function maskPhoneNumber(
  phone: string | null,
): string | null {
  if (!phone) {
    return null;
  }

  return phone.replace(
    /(\d{3})-?(\d{3,4})-?(\d{4})/,
    "$1-****-$3",
  );
}

/**
 * 관리자용 회원 목록을 반환합니다.
 */
export async function listAdminUsers(
  query: AdminUserListQueryDTO,
): Promise<AdminUserListResponseDTO> {
  logger.info(
    {
      serviceName: "admin",
      action: "listAdminUsers",
      page: query.page,
      limit: query.limit,
      keyword: query.keyword,
      status: query.status,
    },
    "service:start",
  );

  const [rows, total, summary] =
    await Promise.all([
      findAdminUsers(query),

      countFilteredAdminUsers(query),

      summarizeAdminUsers(),
    ]);

  const result: AdminUserListResponseDTO = {
    items: rows.map((row) => ({
      userIdx: row.userIdx,

      loginId: row.loginId,

      nickname: row.nickname,

      phoneNumber: maskPhoneNumber(row.phone),

      status: row.status,

      joinedAt: row.joinedAt.toISOString(),

      lastLoginAt:
        row.lastLoginAt?.toISOString() ?? null,
    })),

    page: query.page,

    limit: query.limit,

    total,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(total / query.limit),

    summary,
  };

  logger.info(
    {
      serviceName: "admin",
      action: "listAdminUsers",
      itemCount: result.items.length,
      total,
    },
    "service:success",
  );

  return result;
}

/**
 * 관리자 화면에서 사용할 회원 상세 정보를 반환합니다.
 */
export async function getAdminUserDetail(
  userIdx: number,
): Promise<AdminUserDetailResponseDTO> {
  logger.info(
    {
      serviceName: "admin",
      action: "getAdminUserDetail",
      userIdx,
    },
    "service:start",
  );

  const user = await findAdminUserDetail(userIdx);

  if (!user) {
    throw new ApiError({
      status: 404,
      code: "ADMIN_USER_NOT_FOUND",
      message: "회원을 찾을 수 없습니다.",
    });
  }

  const [
    runningSummary,
    recentInquiries,
  ] = await Promise.all([
    findAdminUserRunningSummary(userIdx),
    findRecentInquiriesByUserIdx(userIdx),
  ]);

  const result: AdminUserDetailResponseDTO = {
    user: {
      userIdx: user.userIdx,
      loginId: user.loginId,
      nickname: user.nickname,
      phoneNumber: user.phone,
      status: user.status,
      totalExp: user.totalExp,
      joinedAt: user.joinedAt.toISOString(),
      lastLoginAt:
        user.lastLoginAt?.toISOString() ?? null,
      suspendedUntil:
        user.suspendedUntil?.toISOString() ?? null,
    },

    runningSummary,

    recentInquiries: recentInquiries.map(
      (inquiry) => ({
        inquiryIdx: inquiry.inquiryIdx,
        title: inquiry.title,
        status: inquiry.status,
        createdAt: inquiry.createdAt.toISOString(),
      }),
    ),

    adminMemo: user.adminMemo,
  };

  logger.info(
    {
      serviceName: "admin",
      action: "getAdminUserDetail",
      userIdx,
    },
    "service:success",
  );

  return result;
}



export async function changeAdminUserStatus(
  userIdx: number,
  input: AdminUserStatusUpdateInput,
) {
  return updateAdminUserStatus(userIdx, input);
}

/**
 * 관리자 대시보드에 필요한 집계와 최근 문의를 반환합니다.
 */
export async function getAdminDashboard(): Promise<
  AdminDashboardResponseDTO
> {
  logger.info(
    {
      serviceName: "admin",
      action: "getAdminDashboard",
    },
    "service:start",
  );

  const [summary, recentInquiries] =
    await Promise.all([
      findAdminDashboardSummary(),
      findAdminDashboardRecentInquiries(),
    ]);

  const result: AdminDashboardResponseDTO = {
    summary,

    recentInquiries: recentInquiries.map(
      (inquiry) => ({
        inquiryIdx: inquiry.inquiryIdx,
        title: inquiry.title,
        status: inquiry.status,
        createdAt: inquiry.createdAt.toISOString(),
        authorNickname: inquiry.authorNickname,
        answererNickname: inquiry.answererNickname,
      }),
    ),
  };

  logger.info(
    {
      serviceName: "admin",
      action: "getAdminDashboard",
      recentInquiryCount:
        result.recentInquiries.length,
    },
    "service:success",
  );

  return result;
}