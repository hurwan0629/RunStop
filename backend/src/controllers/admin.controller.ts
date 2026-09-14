import type { Request, Response } from "express";
import { adminSuspensionSchema } from "../dto/admin/admin.dto.js";
import { ApiError } from "../middleware/error.js";
import { suspendUser as suspendUserRepository,
  
 } from "../repositories/admin.repository.js";




import {
  adminUserListQuerySchema,
  adminUserListResponseSchema,
} from "../dto/admin/admin-user-list.dto.js";

import {
  listAdminUsers,
  getAdminUserDetail,
  changeAdminUserStatus,  
  getAdminDashboard,
} from "../services/admin.service.js";

import { z } from "zod";

import {
  adminUserDetailResponseSchema,
} from "../dto/admin/admin-user-detail.dto.js";

import {
  adminUserStatusUpdateSchema,
} from "../dto/admin/admin-user-status.dto.js";

import {
  adminDashboardResponseSchema,
} from "../dto/admin/admin-dashboard.dto.js";

const adminUserParamsSchema = z.object({
  userIdx: z.coerce.number().int().positive(),
});

function parseAdminUserIdx(
  req: Request,
): number {
  const parsed =
    adminUserParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ADMIN_USER_PARAMS",
      message: "회원 번호가 올바르지 않습니다.",
      details: parsed.error.flatten(),
    });
  }

  return parsed.data.userIdx;
}


/**
 * 관리자용 회원 목록을 반환합니다.
 */
export async function listUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed =
    adminUserListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError({
      status: 400,

      code: "INVALID_ADMIN_USER_LIST_QUERY",

      message:
        "회원 목록 조회 조건이 올바르지 않습니다.",

      details: parsed.error.flatten(),
    });
  }

  const result =
    await listAdminUsers(parsed.data);

  res.json({
    success: true,

    data:
      adminUserListResponseSchema.parse(result),
  });
}



/**
 * 관리자용 회원 상세 정보를 반환합니다.
 */
export async function getUserDetail(
  req: Request,
  res: Response,
): Promise<void> {
  const userIdx = parseAdminUserIdx(req);

  const result = await getAdminUserDetail(
    userIdx,
  );

  res.json({
    success: true,

    data:
      adminUserDetailResponseSchema.parse(result),
  });
}

/**
 * 관리자용 회원 이용 정지 및 정지 해제 처리
 */
export async function updateUserStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const userIdx = parseAdminUserIdx(req);

  const parsed = adminUserStatusUpdateSchema.safeParse(
    req.body,
  );

  if (!parsed.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ADMIN_USER_STATUS_REQUEST",
      message: "회원 상태 변경 요청 값이 올바르지 않습니다.",
      details: parsed.error.flatten(),
    });
  }

  let result;

try {
  result = await changeAdminUserStatus(
    userIdx,
    parsed.data,
  );
} catch (error) {
  console.error(
    "회원 상태 변경 실제 오류:",
    error,
  );

  throw error;
}

  if (result.type === "NOT_FOUND") {
    throw new ApiError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "회원을 찾을 수 없습니다.",
    });
  }

  if (result.type === "WITHDRAWN") {
    throw new ApiError({
      status: 409,
      code: "WITHDRAWN_USER",
      message: "탈퇴 회원은 계정 상태를 변경할 수 없습니다.",
    });
  }

  if (result.type === "INVALID_TRANSITION") {
    throw new ApiError({
      status: 409,
      code: "INVALID_STATUS_TRANSITION",
      message: "이용 정지 상태인 회원만 정지를 해제할 수 있습니다.",
    });
  }

  res.json({
    success: true,
    data: result.data,
  });
}

export async function suspendUser(req: Request, res: Response): Promise<void> {
  const parsed = adminSuspensionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ADMIN_SUSPENSION_REQUEST",
      message: "회원 정지 요청 값이 올바르지 않습니다.",
      details: parsed.error.flatten(),
    });
  }
  const result = await suspendUserRepository(parsed.data);
  if (result.kind === "not_found") {
    throw new ApiError({ status: 404, code: "USER_NOT_FOUND", message: "회원을 찾을 수 없습니다." });
  }
  if (result.kind === "withdrawn") {
    throw new ApiError({ status: 409, code: "WITHDRAWN_USER", message: "탈퇴한 회원은 정지할 수 없습니다." });
  }
  res.json({ success: true, data: result.data });
}


/**
 * 관리자용 대시보드 정보를 반환합니다.
 */
export async function getDashboard(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await getAdminDashboard();

  res.json({
    success: true,
    data: adminDashboardResponseSchema.parse(result),
  });
}