import { AccountRecoveryScreen } from './AccountRecoveryScreen';

/** 전화번호 인증 후 비밀번호를 재설정하는 화면입니다. */
export default function ResetPasswordScreen() {
  return <AccountRecoveryScreen initialMode="reset-password" />;
}
