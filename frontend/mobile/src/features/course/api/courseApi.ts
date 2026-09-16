import { apiRequest } from '@/services/api/client';

import type {
  RouteDetail,
  RouteRecommendResponse,
  RouteRequest,
  RouteSelectResponse,
} from '../types';

export function recommendCourses(accessToken: string, input: RouteRequest) {
  return apiRequest<RouteRecommendResponse>('/api/routes/recommend', {
    method: 'POST',
    accessToken,
    body: input,
  });
}

export function getCourseDetail(accessToken: string, routeIdx: number) {
  return apiRequest<RouteDetail>(`/api/routes/${routeIdx}`, {
    accessToken,
  });
}

export function selectCourse(
  accessToken: string,
  requestIdx: number,
  recommendationIdx: number,
) {
  return apiRequest<RouteSelectResponse>(`/api/routes/${requestIdx}/select`, {
    method: 'POST',
    accessToken,
    body: { recommendationIdx },
  });
}
