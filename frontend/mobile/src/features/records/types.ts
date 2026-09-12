export type RunningSessionStatus =
  | 'COMPLETED'
  | 'STOPPED'
  | 'FAILED';

export interface RunningHistoryItem {
  idx: number;
  status: RunningSessionStatus;
  startedAt: string;
  finishedAt: string | null;
  distance: number | null;
  averagePace: number | null;
}

export interface RunningHistoryResponse {
  items: RunningHistoryItem[];
  page: number;
  limit: number;
}

/** 기록 목록 화면에서 코스 이름까지 함께 보여주기 위한 임시 표시 타입입니다. */
export interface RunningRecordPreview extends RunningHistoryItem {
  courseName: string;
}

/** 기록 목록 화면에서 코스 이름까지 함께 보여주기 위한 임시 표시 타입입니다. */
export interface RunningRecordPreview extends RunningHistoryItem {
  courseName: string;
}
