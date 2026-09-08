import { env } from "../../config/env.js";
import type { WorkerRouteRequestDTO } from "../../dto/worker/worker-route-request.dto.js";
import {
  workerRouteResponseSchema,
  type WorkerRouteResponseDTO,
} from "../../dto/worker/worker-route-response.dto.js";
import { ApiError } from "../../middleware/error.js";

import { MockRouteWorkerClient } from "./implements/routing-worker.monk.js"
import { HttpRouteWorkerClient } from "./implements/routing-worker.http.js";

// 실제로 외부에서 사용 가능한 클라이언트입니다.
// 사용 가능한 메서드는 2가지로
// 1. 파이썬 fastapi 서버의 동작 여부
// 2. 경로 후보 추천이 있습니다.
export type RouteWorkerClient = {
  checkHealth(): Promise<{ ok: boolean }>;
  requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO>;
};

// 해당 클라이언트 객체에 env.WORKER_MODE에 따라 http를 넣어주는 방식을 사용합니다.
const routeWorkerClient: RouteWorkerClient = env.WORKER_MODE === "http"
  ? new HttpRouteWorkerClient()
  : new MockRouteWorkerClient();

/**
 * 현재 환경 설정에 맞는 경로 추천 워커 클라이언트를 반환합니다.
 */
export function getRouteWorkerClient(): RouteWorkerClient {
  return routeWorkerClient;
}

/**
 * Python routing-worker의 상태 확인 엔드포인트를 호출합니다.
 */
export async function checkRoutingWorkerHealth(): Promise<{ ok: boolean }> {
  return routeWorkerClient.checkHealth();
}

/**
 * Python routing-worker에 경로 추천 요청을 보냅니다.
 */
export async function requestRouteRecommendations(
  input: WorkerRouteRequestDTO,
): Promise<WorkerRouteResponseDTO> {
  // 해당 메서드는 추상 메서드로 env.WORKER_TYPE 에 따라 monk 또는 http 실 구현을 반환합니다.
  return routeWorkerClient.requestRouteRecommendations(input);
}
