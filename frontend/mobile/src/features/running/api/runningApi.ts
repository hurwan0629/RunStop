import { apiRequest } from '@/services/api/client';

import type {
  RunningEndResponse,
  RunningFinishResponse,
  RunningPaceResponse,
  RunningStartResponse,
  RunningTrackpoint,
} from '../types';

export function startRunningSession(
  accessToken: string,
  routeRecommendationIdx: number,
) {
  return apiRequest<RunningStartResponse>('/api/running-sessions', {
    method: 'POST',
    accessToken,
    body: {
      routeRecommendationIdx,
      startedAt: new Date().toISOString(),
    },
  });
}

export function saveRunningTrackpoints(
  accessToken: string,
  sessionIdx: number,
  trackpoints: RunningTrackpoint[],
) {
  return apiRequest<{ savedCount: number }>(
    `/api/running-sessions/${sessionIdx}/trackpoints`,
    {
      method: 'POST',
      accessToken,
      body: { trackpoints },
    },
  );
}

export function finishRunningSession(accessToken: string, sessionIdx: number) {
  return apiRequest<RunningFinishResponse>(
    `/api/running-sessions/${sessionIdx}/finish`,
    {
      method: 'POST',
      accessToken,
      body: { finishedAt: new Date().toISOString() },
    },
  );
}

/**
 * 러닝 종료를 요청합니다. 서버가 유효 GPS 수와 도착 조건을 보고
 * COMPLETED, STOPPED, CANCELLED 중 하나를 결정합니다.
 */
export function endRunningSession(accessToken: string, sessionIdx: number) {
  return apiRequest<RunningEndResponse>(
    `/api/running-sessions/${sessionIdx}/end`,
    {
      method: 'POST',
      accessToken,
      body: { finishedAt: new Date().toISOString() },
    },
  );
}

export function getRunningPace(accessToken: string, sessionIdx: number) {
  return apiRequest<RunningPaceResponse>(
    `/api/running-sessions/${sessionIdx}/pace`,
    { accessToken },
  );
}
