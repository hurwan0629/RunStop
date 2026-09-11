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
    return { ok: response.ok };
  }

  async requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO> {
    const response = await fetch(new URL("/routes/recommend", env.WORKER_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new ApiError({
        status: 502,
        code: "ROUTING_WORKER_REQUEST_FAILED",
        message: "경로 추천 워커 호출에 실패했습니다.",
        details: {
          status: response.status,
        },
      });
    }

    const json = await response.json() as unknown;
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
