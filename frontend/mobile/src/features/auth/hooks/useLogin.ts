/** TODO: 로그인 요청의 로딩, 성공, 실패 상태를 관리합니다. */
import { useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { login as requestLogin } from '../api/authApi';
import type { LoginRequest } from '../types';

export function useLogin() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const login = async (
    input: LoginRequest,
  ): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await requestLogin(input);
      await signIn(session);

      return true;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    errorMessage,
  };
}
