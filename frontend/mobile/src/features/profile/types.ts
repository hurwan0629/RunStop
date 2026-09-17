export type UserRole = 'USER' | 'ADMIN';

export interface MyPageSummary {
  user: {
    idx: number;
    loginId: string;
    nickname: string;
    role: UserRole;
    totalExp: number;
  };
  profile: {
    weightKg: number | null;
    heightCm: number | null;
    runningSettings: Record<string, unknown> | null;
    profileImageUrl: string | null;
  } | null;
  currentGoal: {
    idx: number;
    goalType: 'WEEKLY' | 'MONTHLY';
    startDate: string;
    endDate: string;
    progressDistance: number;
    targetDistance: number;
  } | null;
  runningSummary: {
    totalCount: number;
    totalDistance: number;
    bestPace: number | null;
  };
  bookmarkSummary: {
    routeBookmarkCount: number;
  };
}

export interface WithdrawResponse {
  withdrawn: true;
}

export interface UpdateProfileRequest {
  nickname?: string;
  weightKg?: number;
  heightCm?: number;
  runningSettings?: Record<string, unknown>;
}

export interface UpdateProfileResponse {
  user: { idx: number; nickname: string };
  profile: NonNullable<MyPageSummary['profile']>;
}
