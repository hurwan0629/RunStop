import { apiRequest } from '@/services/api/client';

import type {
  BookmarkListResponse,
  CourseBookmark,
  DeleteBookmarkResponse,
  PointBookmark,
} from '../types';

export function getPointBookmarks(accessToken: string) {
  return apiRequest<BookmarkListResponse<PointBookmark>>(
    '/api/bookmarks/points?page=1&limit=100',
    { accessToken },
  );
}

export function createPointBookmark(
  accessToken: string,
  input: {
    name: string;
    point: { latitude: number; longitude: number };
  },
) {
  return apiRequest<PointBookmark>('/api/bookmarks/points', {
    method: 'POST',
    accessToken,
    body: input,
  });
}

export function deletePointBookmark(accessToken: string, bookmarkIdx: number) {
  return apiRequest<DeleteBookmarkResponse>(
    `/api/bookmarks/points/${bookmarkIdx}`,
    { method: 'DELETE', accessToken },
  );
}

export function getRouteBookmarks(accessToken: string) {
  return apiRequest<BookmarkListResponse<CourseBookmark>>(
    '/api/bookmarks/routes?page=1&limit=100',
    { accessToken },
  );
}

export function createRouteBookmark(
  accessToken: string,
  recommendationId: number,
) {
  return apiRequest<{ bookmarkIdx: number; routeRecommendationIdx: number }>(
    '/api/bookmarks/routes',
    {
      method: 'POST',
      accessToken,
      body: { recommendationId },
    },
  );
}

export function deleteRouteBookmark(accessToken: string, bookmarkIdx: number) {
  return apiRequest<DeleteBookmarkResponse>(
    `/api/bookmarks/routes/${bookmarkIdx}`,
    { method: 'DELETE', accessToken },
  );
}
