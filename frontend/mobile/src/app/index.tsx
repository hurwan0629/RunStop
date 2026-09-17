import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { RunStopIntroAnimation } from '../features/intro/components/RunStopIntroAnimation';

import { useAuth } from '@/providers/AuthProvider';

export default function IndexScreen() {
  const router = useRouter();
  const [introFinished, setIntroFinished] = useState(false);

  const { accessToken, isInitializing } = useAuth();

  const finishIntro = useCallback(() => {
    setIntroFinished(true);
  }, []);

  useEffect(() => {
    if (!introFinished || isInitializing) {
      return;
    }

    if (accessToken) {
      router.replace('/home');
      return;
    }

    router.replace('/login');
  }, [accessToken, introFinished, isInitializing, router]);

  return <RunStopIntroAnimation onFinished={finishIntro} />;
}
