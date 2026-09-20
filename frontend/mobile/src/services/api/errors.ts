/** TODO: 백엔드 오류 응답을 화면에서 사용할 형태로 변환합니다. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return '서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.';
  }

  return '요청 처리 중 오류가 발생했습니다.';
}

export type RecommendationFailure = {
  title: string;
  message: string;
  action: 'retry' | 'edit' | 'login';
};

/** 확인된 원인만 설명하고, 조건 불일치의 세부 원인은 추측하지 않는다. */
export function getRecommendationFailure(error: unknown): RecommendationFailure {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return {
        title: '로그인이 필요해요',
        message: '로그인이 만료되었어요. 다시 로그인한 뒤 코스를 찾아 주세요.',
        action: 'login',
      };
    }
    if (error.code === 'ROUTE_CANDIDATES_NOT_FOUND') {
      return {
        title: '조건에 맞는 코스를 찾지 못했어요',
        message: '요청한 위치와 조건으로 경로 후보를 찾지 못했어요. 출발지·경유지, 목표 거리 또는 경사 조건을 조정해 보세요.',
        action: 'edit',
      };
    }
    if (error.code === 'ROUTING_INPUT_REJECTED' || error.status === 400 || error.status === 422) {
      return {
        title: '위치와 조건을 확인해 주세요',
        message: '입력한 위치 또는 조건을 처리하지 못했어요. 출발지·도착지와 목표 거리를 확인해 주세요.',
        action: 'edit',
      };
    }
    if (error.code === 'ROUTING_WORKER_TIMEOUT' || error.status === 504 || error.status === 408) {
      return {
        title: '경로 생성이 지연되고 있어요',
        message: '서버에서 정해진 시간 안에 결과를 받지 못했어요. 잠시 후 다시 시도해 주세요.',
        action: 'retry',
      };
    }
    if (error.code === 'ROUTING_WORKER_UNAVAILABLE' || error.status === 503) {
      return {
        title: '경로 서버에 연결하지 못했어요',
        message: '경로 생성 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
        action: 'retry',
      };
    }
    if (['INVALID_ROUTING_WORKER_RESPONSE', 'INVALID_SERVER_RESPONSE'].includes(error.code)) {
      return {
        title: '결과를 읽지 못했어요',
        message: '서버에서 받은 경로 결과를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
        action: 'retry',
      };
    }
    if (error.code === 'ROUTING_WORKER_REQUEST_FAILED') {
      return {
        title: '경로 생성 서버에서 오류가 났어요',
        message: '서버가 경로를 만드는 중 오류를 반환했어요. 잠시 후 다시 시도해 주세요.',
        action: 'retry',
      };
    }
  }
  if (error instanceof TypeError) {
    return {
      title: '연결을 확인해 주세요',
      message: '서버와 통신하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      action: 'retry',
    };
  }
  return {
    title: '코스를 만들지 못했어요',
    message: '경로를 처리하는 중 오류가 발생했어요. 정확한 원인을 확인하지 못했으니 잠시 후 다시 시도해 주세요.',
    action: 'retry',
  };
}
