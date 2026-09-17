import { randomUUID } from "node:crypto";
import type { MyPageResponseDTO } from "../dto/users/my-page.dto.js";
import type { UserProfileUpdateDTO } from "../dto/users/user-profile-update.dto.js";
import type { UserUpdateResponseDTO } from "../dto/users/user-update-response.dto.js";
import { withTransaction } from "../infra/db/transaction.js";
import { logger } from "../logging/logger.js";
import { ApiError } from "../middleware/error.js";
import { countRouteBookmarksByUserIdx } from "../repositories/bookmarks.repository.js";
import { summarizeRunningSessionsByUserIdx } from "../repositories/running-sessions.repository.js";
import {
  findProfileByUserIdx,
  updateUserProfile,
  type UpdateUserProfileInput,
} from "../repositories/user-profiles.repository.js";
import {
  findUserByIdx,
  updateUser,
  withdrawUser,
  type UpdateUserInput,
} from "../repositories/users.repository.js";
import { hashPassword } from "./auth.service.js";
import { getCurrentRunningGoal } from "./goals.service.js";

/**
 * 프로필, 목표, 러닝, 즐겨찾기 데이터를 조합해 현재 사용자의 마이페이지 요약을 만듭니다.
 */
export async function getMyPageSummary(userIdx: number): Promise<MyPageResponseDTO> {
  logger.info({ serviceName: "users", action: "getMyPageSummary", userIdx }, "service:start");

  // 
  const [user, profile, currentGoalResult, runningSummary, routeBookmarkCount] = await Promise.all([
    findUserByIdx(userIdx),             // users 테이블에서 가져오기
    findProfileByUserIdx(userIdx),      // user_profiles 테이블
    getCurrentRunningGoal(userIdx),     // running_goals 테이블 (현재 진행중인 목표 상태)
    summarizeRunningSessionsByUserIdx(userIdx), // <> IN_PROGRESS인 running_sessions의 모든 total_distance를 가져와주기
    countRouteBookmarksByUserIdx(userIdx),      // 북마크된 개수 가져와주기
  ]);

  if (!user) {
    logger.warn({ serviceName: "users", action: "getMyPageSummary", userIdx }, "service:user_not_found");

    throw new ApiError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }

  // currentGoal이 있으면 현재 목표에 대해 범위가 맞는 거리 가져오기
  const currentGoal = currentGoalResult.goal;
  const progressDistance = currentGoal ? currentGoalResult.progress.distance : null;

  logger.info({
    serviceName: "users",
    action: "getMyPageSummary",
    userIdx,
    hasCurrentGoal: currentGoal !== null,
    routeBookmarkCount,
  }, "service:success");
  
    // 응답해주기 (data만 주면 users.controller.ts 의 getMyPage에서 응답)
  return {
    user: {
      idx: user.idx,
      loginId: user.loginId,
      nickname: user.nickname,
      role: user.role,
      totalExp: user.totalExp,
    },
    profile,
    currentGoal: currentGoal
      ? {
        idx: currentGoal.idx,
        goalType: currentGoal.goalType,
        startDate: currentGoal.startDate,
        endDate: currentGoal.endDate,
        progressDistance: progressDistance ?? 0,
        targetDistance: currentGoal.targetDistance,
      }
      : null,
    runningSummary,
    bookmarkSummary: {
      routeBookmarkCount,
    },
  };
}

/**
 * 현재 사용자의 프로필 수정 가능한 필드를 변경합니다.
 */
export async function updateCurrentUser(
  userIdx: number,
  updateDto: UserProfileUpdateDTO,
): Promise<UserUpdateResponseDTO> {
  logger.info({
    serviceName: "users",
    action: "updateCurrentUser",
    userIdx,
    hasNicknameUpdate: updateDto.nickname !== undefined,
    hasProfileUpdate: updateDto.weightKg !== undefined
      || updateDto.heightCm !== undefined
      || updateDto.runningSettings !== undefined,
  }, "service:start");

  // 변경 시도 데이터 4개에 대해서 값이 들어왔는지 확인하기
  const hasUserUpdate = updateDto.nickname !== undefined;
  const hasProfileUpdate = updateDto.weightKg !== undefined
    || updateDto.heightCm !== undefined
    || updateDto.runningSettings !== undefined;

  // 수정할게 없으면 취소시켜주기
  if (!hasUserUpdate && !hasProfileUpdate) {
    logger.warn({ serviceName: "users", action: "updateCurrentUser", userIdx }, "service:empty_update_request");

    throw new ApiError({
      status: 400,
      code: "EMPTY_USER_UPDATE_REQUEST",
      message: "수정할 값이 없습니다.",
    });
  }
  // userIdx로 사용자 찾아주기 (존재하는지 확인)
  const existingUser = await findUserByIdx(userIdx);

  if (!existingUser) {
    logger.warn({ serviceName: "users", action: "updateCurrentUser", userIdx }, "service:user_not_found");

    throw new ApiError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }

  // user과 userProfile을 한번에 업데이트하기 때문에 트랜잭션 함수 사용해주기
  const updated = await withTransaction(async (client) => {

    // users 테이블 수정 준비해주기
    const userInput: UpdateUserInput = {};
    
    if (updateDto.nickname !== undefined) {
      userInput.nickname = updateDto.nickname;
    }

    // user_profiles 수정 준비해주기
    const profileInput: UpdateUserProfileInput = {};

    if (updateDto.weightKg !== undefined) {
      profileInput.weightKg = updateDto.weightKg;
    }

    if (updateDto.heightCm !== undefined) {
      profileInput.heightCm = updateDto.heightCm;
    }

    if (updateDto.runningSettings !== undefined) {
      profileInput.runningSettings = updateDto.runningSettings;
    }

    // 업데이트 준비해주기

    // 업데이트 해주거나 사용자 정보를 그대로 가져와서 최종적으로 업데이트된 사용자 정보 가져와주기
    const updatedUser = hasUserUpdate
      ? await updateUser(userIdx, userInput, client)
      : await findUserByIdx(userIdx, client);

    const updatedProfile = hasProfileUpdate
      ? await updateUserProfile(userIdx, profileInput, client)
      : await findProfileByUserIdx(userIdx, client);

    
    // updated User이 실패하였다면 없다고 반환해주기
    if (!updatedUser) {
      logger.warn({ serviceName: "users", action: "updateCurrentUser", userIdx }, "service:user_not_found");

      throw new ApiError({
        status: 404,
        code: "USER_NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 수정의 경우에도 없으면 404 보내주기
    if (!updatedProfile) {
      logger.warn({ serviceName: "users", action: "updateCurrentUser", userIdx }, "service:user_profile_not_found");

      throw new ApiError({
        status: 404,
        code: "USER_PROFILE_NOT_FOUND",
        message: "사용자 프로필을 찾을 수 없습니다.",
      });
    }

    return {
      user: updatedUser,
      profile: updatedProfile,
    };
  });

  logger.info({
    serviceName: "users",
    action: "updateCurrentUser",
    userIdx,
    hasUserUpdate,
    hasProfileUpdate,
  }, "service:success");

  return {
    user: {
      idx: updated.user.idx,
      nickname: updated.user.nickname,
    },
    profile: updated.profile,
  };
}

/**
 * 오래 연결된 기록을 보존하면서 현재 사용자를 탈퇴 상태로 변경합니다.
 */
export async function withdrawCurrentUser(userIdx: number): Promise<{ withdrawn: true }> {
  logger.info({ serviceName: "users", action: "withdrawCurrentUser", userIdx }, "service:start");

  // 사용자 존재하는지 확인해주기
  const user = await findUserByIdx(userIdx);

  if (!user) {
    logger.warn({ serviceName: "users", action: "withdrawCurrentUser", userIdx }, "service:user_not_found");

    throw new ApiError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }

  // 사용자 상태 재확인
  if (user.status === "WITHDRAWN") {
    logger.warn({ serviceName: "users", action: "withdrawCurrentUser", userIdx }, "service:already_withdrawn");

    throw new ApiError({
      status: 410,
      code: "WITHDRAWN_USER",
      message: "이미 탈퇴한 사용자입니다.",
    });
  }

  // 비밀번호 없애기 취급, 
  const invalidPasswordHash = await hashPassword(`withdrawn:${userIdx}:${randomUUID()}`);
  // 아이디 사용 불가능으로 수정
  const anonymizedLoginId = `withdraw_${userIdx}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  // 상용자 값을 변경해주며 phone을 NULL로 수정해주기
  const withdrawn = await withdrawUser(userIdx, {
    anonymizedLoginId,
    invalidPasswordHash,
  });
  
  if (!withdrawn) {
    logger.error({ serviceName: "users", action: "withdrawCurrentUser", userIdx }, "service:failed");

    throw new ApiError({
      status: 409,
      code: "USER_WITHDRAW_FAILED",
      message: "회원탈퇴 처리에 실패했습니다.",
    });
  }

  logger.info({ serviceName: "users", action: "withdrawCurrentUser", userIdx }, "service:success");

  return {
    withdrawn: true,
  };
}
