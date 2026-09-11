import { apiRequest } from '@/services/api/client';

import type {
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

export function getRunningPace(accessToken: string, sessionIdx: number) {
  return apiRequest<RunningPaceResponse>(
    `/api/running-sessions/${sessionIdx}/pace`,
    { accessToken },
  );
}
