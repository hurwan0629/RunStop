import { apiRequest } from '@/services/api/client';

import type {
  CreateGoalRequest,
  CurrentGoalResponse,
  RunningGoal,
  StopGoalResponse,
} from '../types';

export function getCurrentGoal(accessToken: string) {
  return apiRequest<CurrentGoalResponse>('/api/goals/current', {
    accessToken,
  });
}

export function createGoal(
  accessToken: string,
  input: CreateGoalRequest,
) {
  return apiRequest<RunningGoal>('/api/goals', {
    method: 'POST',
    accessToken,
    body: input,
  });
}

export function stopGoal(accessToken: string, goalIdx: number) {
  return apiRequest<StopGoalResponse>(`/api/goals/${goalIdx}/stop`, {
    method: 'POST',
    accessToken,
  });
}
