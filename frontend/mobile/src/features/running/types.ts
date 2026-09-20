import type { LocationPoint, RouteFacilityPoint, RouteMapLayers, RouteSlopeProfile, RouteRequest } from '@/features/course/types';

export type RecordedRouteFeatures = {
  [key: string]: unknown;
  slope?: RouteSlopeProfile;
  nature?: { parkRatio?: number | null; waterRatio?: number | null };
  surface?: { signal_per_km?: number | null; crossing_per_km?: number | null };
  overlapRatio?: number;
  slopeConstraint?: {
    status: 'MET' | 'RELAXED' | 'IGNORE';
    evaluation?: string;
    appliedMaxSlopePct?: number | null;
  };
};

export type RunningDetail = {
  sessionIdx: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  distance: number | null;
  averagePace: number | null;
  route: {
    idx: number; name: string; path: LocationPoint[]; totalDistance: number | null;
    totalAscent?: number | null; featureValues?: RecordedRouteFeatures | null;
  } | null;
  request?: { idx: number; elementConditions?: Partial<RouteRequest['elementConditions']> | null } | null;
  trackPaths: LocationPoint[][];
  excludedPointCount: number;
  gapCount: number;
  analysisStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'INSUFFICIENT' | 'IN_PROGRESS';
  segments: {
    distanceFrom: number;
    distanceTo: number;
    durationSeconds: number;
    pace: number;
    path: LocationPoint[];
    environment: {
      facilityPoints: RouteFacilityPoint[];
      mapLayers: RouteMapLayers | null;
      slope: RouteSlopeProfile | null;
    } | null;
  }[];
};

export type RunningTrackpoint = LocationPoint & {
  clientTrackpointId: string;
  recordedAt: string;
  accuracy?: number;
};

export type RunningStartResponse = {
  sessionIdx: number;
  status: 'IN_PROGRESS';
};

export type RunningActiveSession = {
  sessionIdx: number;
  routeRecommendationIdx: number;
  startedAt: string;
  status: 'IN_PROGRESS';
};

export type RunningTrackpointsSaveResponse = {
  savedCount: number;
  trackpointCount: number;
  distance: number;
};

export type RunningFinishResponse = {
  sessionIdx: number;
  status: 'COMPLETED';
  distance: number;
  averagePace: number | null;
};

/** 서버가 GPS 기록과 도착 조건으로 결정한 종료 결과입니다. */
export type RunningEndResponse = {
  sessionIdx: number;
  status: 'COMPLETED' | 'STOPPED' | 'CANCELLED';
  distance: number;
  averagePace: number | null;
};

export type RunningPaceResponse = {
  sessionIdx: number;
  averagePace: number | null;
  segments: {
    distanceFrom: number;
    distanceTo: number;
    pace: number;
  }[];
};
