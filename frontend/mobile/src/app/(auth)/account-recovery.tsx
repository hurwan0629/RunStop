import { useLocalSearchParams } from 'expo-router';

import {
  AccountRecoveryScreen,
  type AccountRecoveryMode,
} from '@/features/auth/screens/AccountRecoveryScreen';

export default function AccountRecoveryRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const initialMode: AccountRecoveryMode =
    mode === 'reset-password' ? 'reset-password' : 'find-id';

  return <AccountRecoveryScreen initialMode={initialMode} />;
}
