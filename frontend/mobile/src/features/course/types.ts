/** 지도에서 사용하는 장소 또는 GPS 좌표입니다. */
export type LocationPoint = {
  id?: string;
  name?: string;
  address?: string;
  lat: number;
  lng: number;
};

export type SlopePreference = 'GENTLE' | 'NORMAL' | 'ANY';

export type FacilityPreference =
  | 'TOILET'
  | 'CONVENIENCE_STORE';

export type ImportanceLevel = 1 | 2 | 3 | 4 | 5;

/** 코스 설정 1~4단계에서 함께 사용하는 임시 입력값입니다. */
export type CourseDraft = {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints: LocationPoint[];
  prompt: string;
  slopePreference: SlopePreference;
  facilities: FacilityPreference[];
  distanceImportance: ImportanceLevel;
  slopeImportance: ImportanceLevel;
  toiletImportance: ImportanceLevel;
  convenienceImportance: ImportanceLevel;
  nightImportance: ImportanceLevel;
};

/** 백엔드 추천 API 연결 전 화면 확인에 사용하는 추천 코스 타입입니다. */
export type CourseRecommendationPreview = {
  id: string;
  label: 'A' | 'B' | 'C';
  name: string;
  score: number;
  distanceKm: number;
  estimatedMinutes: number;
  averagePace: string;
  totalAscentM: number;
  slopeLabel: string;
  toiletCount: number;
  convenienceStoreCount: number;
  nightInfraLabel: string;
  summary: string;
  reasons: string[];
};
