import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { CourseDraft } from '../types';

const initialCourseDraft: CourseDraft = {
  waypoints: [],
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
  updateDraft: (values: Partial<CourseDraft>) => void;
  resetDraft: () => void;
};

const CourseDraftContext = createContext<CourseDraftContextValue | null>(null);

/** 코스 설정 단계 사이에서 사용자가 고른 값을 유지합니다. */
export function CourseDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<CourseDraft>(initialCourseDraft);

  const updateDraft = useCallback((values: Partial<CourseDraft>) => {
    setDraft((current) => ({ ...current, ...values }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialCourseDraft);
  }, []);

  const value = useMemo(
    () => ({ draft, updateDraft, resetDraft }),
    [draft, resetDraft, updateDraft],
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
