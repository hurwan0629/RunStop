import type {
  CourseBookmarkPreview,
  PlaceBookmarkPreview,
} from '../types';

/** 즐겨찾기 API 연결 전 목록과 삭제 동작을 확인하기 위한 데이터입니다. */
export const mockCourseBookmarks: CourseBookmarkPreview[] = [
  {
    id: 'bookmark-course-1',
    courseId: 'course-a',
    name: '서울숲 여유 코스',
    distanceKm: 5.2,
    totalAscentM: 18,
    slopeLabel: '완만',
    tags: ['화장실 3', '야간안전'],
  },
  {
    id: 'bookmark-course-2',
    courseId: 'course-b',
    name: '한강 연결 코스',
    distanceKm: 6.1,
    totalAscentM: 24,
    slopeLabel: '보통',
    tags: ['편의점 3', '뷰 좋음'],
  },
];

export const mockPlaceBookmarks: PlaceBookmarkPreview[] = [
  {
    id: 'bookmark-place-1',
    name: '서울숲',
    address: '서울특별시 성동구 뚝섬로 273',
    category: '공원',
    lat: 37.544387,
    lng: 127.037442,
  },
  {
    id: 'bookmark-place-2',
    name: '여의도 한강공원',
    address: '서울특별시 영등포구 여의동로 330',
    category: '공원',
    lat: 37.528446,
    lng: 126.9342,
  },
];
