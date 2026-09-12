/** 지도에서 사용하는 장소 또는 GPS 좌표입니다. */
export type LocationPoint = {
  id?: string;
  name?: string;
  address?: string;
  lat: number;
  lng: number;
};

/** 장소 검색 API가 반환하는 후보 장소입니다. */
export type PlaceSearchItem = {
  name: string;
  address: string;
  roadAddress: string;
  category: string;
  latitude: number;
  longitude: number;
};

export type PlaceSearchResponse = {
  items: PlaceSearchItem[];
};

export type SlopePreference = 'GENTLE' | 'NORMAL' | 'ANY';

export type FacilityPreference =
  | 'TOILET'
  | 'CONVENIENCE_STORE';

export type ImportanceLevel = 1 | 2 | 3 | 4 | 5;
export type RouteType = 'LOOP' | 'ROUND_TRIP' | 'ONE_WAY';

/** 코스 설정 1~4단계에서 함께 사용하는 임시 입력값입니다. */
export type CourseDraft = {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints: LocationPoint[];
  targetDistanceKm: number;
  prompt: string;
  slopePreference: SlopePreference;
  facilities: FacilityPreference[];
  distanceImportance: ImportanceLevel;
  slopeImportance: ImportanceLevel;
  toiletImportance: ImportanceLevel;
  convenienceImportance: ImportanceLevel;
  nightImportance: ImportanceLevel;
};

export type RouteRequest = {
  prompt?: string;
  routeType: RouteType;
  startPoint: Pick<LocationPoint, 'lat' | 'lng'>;
  waypoints: Pick<LocationPoint, 'lat' | 'lng'>[];
  endPoint?: Pick<LocationPoint, 'lat' | 'lng'>;
  elementConditions: {
    targetDistance: number;
    maxSlope?: number;
    facilityCount?: number;
    weights: Record<string, number>;
    requirements: Record<string, boolean>;
  };
};

export type RouteRecommendation = {
  idx: number;
  name: string;
  score: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
};

export type RouteRecommendResponse = {
  requestIdx: number;
  recommendations: RouteRecommendation[];
};

export type RoutePoint = LocationPoint & {
  sequence: number;
  pointType: 'START' | 'WAYPOINT' | 'END';
};

export type RouteDetail = {
  idx: number;
  name: string;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
  isBookmarked: boolean;
  path: LocationPoint[];
  points: RoutePoint[];
};

export type RouteSelectResponse = {
  requestIdx: number;
  selectedRecommendationIdx: number;
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
