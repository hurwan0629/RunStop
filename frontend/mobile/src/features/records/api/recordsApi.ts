import { apiRequest } from '@/services/api/client';

import type {
  RunningHistoryItem,
  RunningHistoryResponse,
} from '../types';

interface RunningHistoryPeriod {
  from: string;
  to: string;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

/** 지정한 기간의 러닝 기록을 페이지별로 모두 불러옵니다. */
export async function getRunningHistoryForPeriod(
  accessToken: string,
  period: RunningHistoryPeriod,
) {
  const items: RunningHistoryItem[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await apiRequest<RunningHistoryResponse>(
      `/api/running-sessions?page=${page}&limit=${PAGE_LIMIT}&from=${period.from}&to=${period.to}`,
      { accessToken },
    );

    items.push(...response.items);

    if (response.items.length < PAGE_LIMIT) {
      break;
    }
  }

  return items;
}
