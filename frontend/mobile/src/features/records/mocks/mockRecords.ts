import type { RunningRecordPreview } from '../types';

/** 백엔드 연결 전에도 기간 필터와 기록 목록을 확인할 수 있게 만드는 데이터입니다. */
export function createMockRunningRecords(): RunningRecordPreview[] {
  return [
    createRecord(101, 1, '서울숲 순환 코스', 5200, 394),
    createRecord(102, 4, '한강 공원 코스', 7100, 407),
    createRecord(103, 10, '남산 가벼운 코스', 4300, 425),
    createRecord(104, 38, '도심 야간 코스', 6000, 400),
  ];
}

function createRecord(
  idx: number,
  daysAgo: number,
  courseName: string,
  distance: number,
  averagePace: number,
): RunningRecordPreview {
  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - daysAgo);
  startedAt.setHours(19, 30, 0, 0);

  const finishedAt = new Date(
    startedAt.getTime() + (distance / 1000) * averagePace * 1000,
  );

  return {
    idx,
    status: 'COMPLETED',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    distance,
    averagePace,
    courseName,
  };
}
