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
