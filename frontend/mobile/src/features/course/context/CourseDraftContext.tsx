import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  CourseDraft,
  LocationPoint,
  RouteRecommendResponse,
} from '../types';

const initialCourseDraft: CourseDraft = {
  waypoints: [],
  targetDistanceKm: 5,
  prompt: '',
  slopePreference: 'ANY',
  facilities: [],
  distanceImportance: 3,
  slopeImportance: 3,
  toiletImportance: 3,
  convenienceImportance: 3,
  nightImportance: 3,
};

type CourseDraftContextValue = {
  draft: CourseDraft;
  /** null은 아직 장소를 선택하지 않은 빈 경유지 입력칸입니다. */
  waypointSlots: Array<LocationPoint | null>;
  recommendationResult: RouteRecommendResponse | null;
  setRecommendationResult: (result: RouteRecommendResponse | null) => void;
  updateDraft: (values: Partial<CourseDraft>) => void;
  addWaypointSlot: () => void;
  removeWaypointSlot: (index: number) => void;
  setWaypointSlot: (index: number, point: LocationPoint | null) => void;
  resetDraft: () => void;
};

const CourseDraftContext = createContext<CourseDraftContextValue | null>(null);

/** 코스 설정 단계 사이에서 사용자가 고른 값을 유지합니다. */
export function CourseDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<CourseDraft>(initialCourseDraft);
  const [waypointSlots, setWaypointSlots] = useState<
    Array<LocationPoint | null>
  >([]);
  const [recommendationResult, setRecommendationResult] =
    useState<RouteRecommendResponse | null>(null);

  const updateDraft = useCallback((values: Partial<CourseDraft>) => {
    setDraft((current) => ({ ...current, ...values }));
  }, []);

  /**
   * 빈 경유지 입력칸도 화면에 표시해야 하므로 별도로 상태를 관리합니다.
   * 코스 추천 요청에 쓰는 draft.waypoints에는 선택된 좌표만 유지합니다.
   */
  useEffect(() => {
    const selectedWaypoints = waypointSlots.filter(
      (point): point is LocationPoint => point !== null,
    );

    setDraft((current) => ({
      ...current,
      waypoints: selectedWaypoints,
    }));
  }, [waypointSlots]);

  const addWaypointSlot = useCallback(() => {
    setWaypointSlots((current) => {
      if (current.length >= 2) {
        return current;
      }

      return [...current, null];
    });
  }, []);

  const removeWaypointSlot = useCallback((index: number) => {
    setWaypointSlots((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }, []);

  const setWaypointSlot = useCallback(
    (index: number, point: LocationPoint | null) => {
      setWaypointSlots((current) => {
        if (index < 0 || index >= current.length) {
          return current;
        }

        return current.map((currentPoint, currentIndex) =>
          currentIndex === index ? point : currentPoint,
        );
      });
    },
    [],
  );

  const resetDraft = useCallback(() => {
    setDraft(initialCourseDraft);
    setWaypointSlots([]);
    setRecommendationResult(null);
  }, []);

  const value = useMemo(
    () => ({
      addWaypointSlot,
      draft,
      removeWaypointSlot,
      recommendationResult,
      resetDraft,
      setRecommendationResult,
      setWaypointSlot,
      updateDraft,
      waypointSlots,
    }),
    [
      addWaypointSlot,
      draft,
      removeWaypointSlot,
      recommendationResult,
      resetDraft,
      setWaypointSlot,
      updateDraft,
      waypointSlots,
    ],
  );

  return (
    <CourseDraftContext.Provider value={value}>
      {children}
    </CourseDraftContext.Provider>
  );
}

export function useCourseDraft() {
  const context = useContext(CourseDraftContext);

  if (!context) {
    throw new Error('useCourseDraft는 CourseDraftProvider 안에서 사용해야 합니다.');
  }

  return context;
}
