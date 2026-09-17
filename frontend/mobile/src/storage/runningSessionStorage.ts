import * as SecureStore from 'expo-secure-store';

const ACTIVE_RUNNING_SESSION_KEY = 'runstop_active_running_session';

export type StoredRunningSession = {
  sessionId: number;
  courseId: number;
  startedAt: string;
};

export async function saveActiveRunningSession(
  session: StoredRunningSession,
): Promise<void> {
  await SecureStore.setItemAsync(
    ACTIVE_RUNNING_SESSION_KEY,
    JSON.stringify(session),
  );
}

export async function getActiveRunningSessionFromStorage(): Promise<
  StoredRunningSession | null
> {
  const value = await SecureStore.getItemAsync(
    ACTIVE_RUNNING_SESSION_KEY,
  );

  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!isStoredRunningSession(parsed)) {
      await clearActiveRunningSession();
      return null;
    }

    return parsed;
  } catch {
    await clearActiveRunningSession();
    return null;
  }
}

export function clearActiveRunningSession(): Promise<void> {
  return SecureStore.deleteItemAsync(ACTIVE_RUNNING_SESSION_KEY);
}

function isStoredRunningSession(
  value: unknown,
): value is StoredRunningSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.sessionId === 'number' &&
    Number.isInteger(session.sessionId) &&
    session.sessionId > 0 &&
    typeof session.courseId === 'number' &&
    Number.isInteger(session.courseId) &&
    session.courseId > 0 &&
    typeof session.startedAt === 'string'
  );
}