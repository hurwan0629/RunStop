import type { LocationPoint } from '@/features/course/types';

export type CourseBookmark = {
  bookmarkIdx: number;
  routeRecommendationIdx: number;
  name: string;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
};

export type PointBookmark = {
  bookmarkIdx: number;
  name: string;
  /** 백엔드 좌표 DTO는 latitude/longitude 형식을 사용합니다. */
  point: {
    latitude: number;
    longitude: number;
  };
};

export type BookmarkListResponse<T> = {
  items: T[];
  page: number;
  limit: number;
};

export type DeleteBookmarkResponse = { deleted: true };

/** Mock 파일을 단계적으로 제거하기 전까지 유지하는 화면 확인용 타입입니다. */
export type CourseBookmarkPreview = {
  id: string;
  courseId: string;
  name: string;
  distanceKm: number;
  totalAscentM: number;
  slopeLabel: string;
  tags: string[];
};

export type PlaceBookmarkPreview = LocationPoint & {
  id: string;
  name: string;
  address: string;
  category: string;
};
