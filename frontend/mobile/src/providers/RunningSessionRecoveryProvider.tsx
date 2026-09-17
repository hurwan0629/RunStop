import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import {
  AppState,
} from 'react-native';
import {
  usePathname,
  useRootNavigationState,
  useRouter,
} from 'expo-router';

import { getActiveRunningSession } from '@/features/running/api/runningApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  clearActiveRunningSession,
  saveActiveRunningSession,
} from '@/storage/runningSessionStorage';

export function RunningSessionRecoveryProvider({
  children,
}: PropsWithChildren) {
  const { accessToken, isInitializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const pathnameRef = useRef(pathname);
  const appState = useRef(AppState.currentState);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const recoverActiveRunning = useCallback(async () => {
    if (
      isInitializing ||
      !accessToken ||
      !rootNavigationState?.key ||
      pathnameRef.current === '/running/active' ||
      isCheckingRef.current
    ) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const activeSession = await getActiveRunningSession(accessToken);

      if (!activeSession) {
        try {
          await clearActiveRunningSession();
        } catch {
          // 서버 조회가 기준이므로 오래된 로컬 값은 복구에 사용하지 않는다.
        }
        return;
      }

      try {
        await saveActiveRunningSession({
          sessionId: activeSession.sessionIdx,
          courseId: activeSession.routeRecommendationIdx,
          startedAt: activeSession.startedAt,
        });
      } catch {
        // 로컬 저장에 실패해도 서버 세션으로 러닝 화면에 복귀할 수 있다.
      }

      router.replace({
        pathname: '/running/active',
        params: {
          courseId: String(activeSession.routeRecommendationIdx),
          sessionId: String(activeSession.sessionIdx),
          startedAt: activeSession.startedAt,
          recovery: 'true',
        },
      });
    } catch {
      // 네트워크 오류에서는 현재 화면을 유지하고, 다음 앱 활성화 시 다시 확인한다.
    } finally {
      isCheckingRef.current = false;
    }
  }, [accessToken, isInitializing, rootNavigationState?.key, router]);

  useEffect(() => {
    void recoverActiveRunning();
  }, [recoverActiveRunning]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInBackground =
        appState.current === 'inactive' || appState.current === 'background';

      if (nextAppState === 'active' && wasInBackground) {
        void recoverActiveRunning();
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [recoverActiveRunning]);

  return children;
}
