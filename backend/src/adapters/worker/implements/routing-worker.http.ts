import { env } from "../../../config/env.js";
import type { WorkerRouteRequestDTO } from "../../../dto/worker/worker-route-request.dto.js";
import {
  workerRouteResponseSchema,
  type WorkerRouteResponseDTO,
} from "../../../dto/worker/worker-route-response.dto.js";
import { ApiError } from "../../../middleware/error.js";
import type { RouteWorkerClient } from "../types.js";

export class HttpRouteWorkerClient implements RouteWorkerClient {
  async checkHealth(): Promise<{ ok: boolean }> {
    const response = await fetch(new URL("/health", env.WORKER_URL));

    return {
      ok: response.ok,
    };
  }

  // 데이터 포스트로 넣기
  async requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO> {
    let response: Response;
    let json: unknown;

    // 연결 실패·응답 지연·응답 형식 오류를 구분해 프론트에서 다음 행동을 안내한다.
    try {
      response = await fetch(new URL("/routes/recommend", env.WORKER_URL), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(180_000),
      });
      if (response.ok) json = await response.json();
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "SyntaxError") {
        throw new ApiError({
          status: 502,
          code: "INVALID_ROUTING_WORKER_RESPONSE",
          message: "경로 생성 결과를 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.",
        });
      }

      const timedOut = name === "TimeoutError" || name === "AbortError";
      throw new ApiError({
        status: timedOut ? 504 : 503,
        code: timedOut ? "ROUTING_WORKER_TIMEOUT" : "ROUTING_WORKER_UNAVAILABLE",
        message: timedOut
          ? "경로 생성 서버의 응답 대기 시간이 초과되었습니다."
          : "경로 생성 서버에 연결하지 못했습니다.",
      });
    }

    if (!response.ok) {
      const timedOut = response.status === 504 || response.status === 408;
      const invalidInput = response.status === 422 || response.status === 400;
      throw new ApiError({
        status: timedOut ? 504 : invalidInput ? 422 : 502,
        code: timedOut ? "ROUTING_WORKER_TIMEOUT"
          : invalidInput ? "ROUTING_INPUT_REJECTED" : "ROUTING_WORKER_REQUEST_FAILED",
        message: timedOut ? "경로 생성 서버의 응답 대기 시간이 초과되었습니다."
          : invalidInput ? "경로 생성 서버가 요청한 위치 또는 조건을 처리하지 못했습니다."
            : "경로 생성 서버에서 오류가 발생했습니다.",
        details: {
          status: response.status,
        },
      });
    }

    const parseResult = workerRouteResponseSchema.safeParse(json);

    if (!parseResult.success) {
      throw new ApiError({
        status: 502,
        code: "INVALID_ROUTING_WORKER_RESPONSE",
        message: "경로 추천 워커 응답 형식이 올바르지 않습니다.",
        details: parseResult.error.flatten(),
      });
    }

    return parseResult.data;
  }
}
