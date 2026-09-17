import type { WorkerRouteRequestDTO } from "../../dto/worker/worker-route-request.dto.js";
import type { WorkerRouteResponseDTO } from "../../dto/worker/worker-route-response.dto.js";

export type RouteWorkerMode = "mock" | "http";

export type RouteWorkerClient = {
  checkHealth(): Promise<{ ok: boolean }>;
  requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO>;
};
