import type { Request, Response, NextFunction } from "express";
import { myPageResponseSchema } from "../dto/users/my-page.dto.js";
import { userProfileUpdateSchema } from "../dto/users/user-profile-update.dto.js";
import { userUpdateResponseSchema } from "../dto/users/user-update-response.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  getMyPageSummary,
  updateCurrentUser,
  withdrawCurrentUser,
} from "../services/users.service.js";

/**
 * 현재 사용자의 마이페이지 요약 정보를 반환합니다.
 */
export async function getMyPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 미들웨어에서 req.user을 넣어주어야하는데 이게 들어가있지 않으면 에러 보내주기
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  // user.service 에서 사용자의 마이페이지 렌더링 응답 DTO 만들어서 받아주기
  // dto/users/my-page.dto.js - MyPageResponseDTO
  const myPage = await getMyPageSummary(req.user.idx);

  // 바로 응답해주기
  res.json({
    success: true,
    data: myPageResponseSchema.parse(myPage),
  });
}

/**
 * 현재 사용자의 수정 가능한 프로필 필드를 변경합니다.
 */
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  // authenticate에서 req.user이 주입되지 않으면 에러 띄워주기
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  // 사용자 프로필 요청 스키마와 일치하는지 확인 
  const parseResult = userProfileUpdateSchema.safeParse(req.body);

  // success=true가 아니면 에러 내주기
  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_USER_UPDATE_REQUEST",
      message: "내 정보 수정 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  // 사용자 정보 idx를 이용해서 업데이트 시도해주기
  const updated = await updateCurrentUser(req.user.idx, parseResult.data);

  res.json({
    success: true,
    data: userUpdateResponseSchema.parse(updated),
  });
}

/**
 * 관계형 서비스 기록을 보존하면서 현재 사용자를 탈퇴 처리합니다.
 */
export async function withdrawMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  const result = await withdrawCurrentUser(req.user.idx);

  res.json({
    success: true,
    data: result,
  });
}
