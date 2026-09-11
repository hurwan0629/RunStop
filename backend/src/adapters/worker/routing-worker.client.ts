import { env } from "../../config/env.js";
import type { WorkerRouteRequestDTO } from "../../dto/worker/worker-route-request.dto.js";
import type { WorkerRouteResponseDTO } from "../../dto/worker/worker-route-response.dto.js";
import { HttpRouteWorkerClient } from "./implements/routing-worker.http.js";
import { MockRouteWorkerClient } from "./implements/routing-worker.mock.js";
import type { RouteWorkerClient, RouteWorkerMode } from "./types.js";

export type { RouteWorkerClient, RouteWorkerMode } from "./types.js";

export function createRouteWorkerClient(
  mode: RouteWorkerMode = env.WORKER_MODE,
): RouteWorkerClient {
  if (mode === "http") return new HttpRouteWorkerClient();
  return new MockRouteWorkerClient();
}

const routeWorkerClient = createRouteWorkerClient();

export function getRouteWorkerClient(): RouteWorkerClient {
  return routeWorkerClient;
}

export async function checkRoutingWorkerHealth(): Promise<{ ok: boolean }> {
  return routeWorkerClient.checkHealth();
}

export async function requestRouteRecommendations(
  input: WorkerRouteRequestDTO,
): Promise<WorkerRouteResponseDTO> {
  return routeWorkerClient.requestRouteRecommendations(input);
}
