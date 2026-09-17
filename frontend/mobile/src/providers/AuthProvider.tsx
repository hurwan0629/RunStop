/** TODO: 사용자와 액세스 토큰 등 전역 로그인 상태를 제공합니다. */
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import type {
  AuthUser,
  LoginResponse,
} from '@/features/auth/types';
import {
  deleteAccessToken,
  getAccessToken,
  saveAccessToken,
} from '@/storage/tokenStorage';

interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  isInitializing: boolean;
  signIn: (session: LoginResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [accessToken, setAccessToken] =
    useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    getAccessToken()
      .then(setAccessToken)
      .catch(() => setAccessToken(null))
      .finally(() => setIsInitializing(false));
  }, []);

  const signIn = async (session: LoginResponse) => {
    await saveAccessToken(session.accessToken);
    setAccessToken(session.accessToken);
    setUser(session.user);
  };

  const signOut = async () => {
    await deleteAccessToken();
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isInitializing,
        signIn,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth는 AuthProvider 안에서 사용해야 합니다.',
    );
  }

  return context;
}
