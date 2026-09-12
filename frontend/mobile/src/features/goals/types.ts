export type GoalType = 'WEEKLY' | 'MONTHLY';
export type GoalStatus =
  | 'ACTIVE'
  | 'SUCCESS'
  | 'FAILED'
  | 'STOPPED';

export interface RunningGoal {
  idx: number;
  goalType: GoalType;
  targetDistance: number;
  status: GoalStatus;
  startDate: string;
  endDate: string;
  finishedAt?: string | null;
}

export interface GoalProgress {
  distance: number;
  rate: number;
}

export interface CurrentGoalResponse {
  goal: RunningGoal | null;
  progress: GoalProgress;
}

export interface CreateGoalRequest {
  goalType: GoalType;
  targetDistance: number;
  startDate: string;
  endDate: string;
}

export interface StopGoalResponse {
  idx: number;
  status: 'STOPPED';
  finishedAt: string;
}
