import { env } from "../../config/env.js";
import type { WorkerRouteRequestDTO } from "../../dto/worker/worker-route-request.dto.js";
import {
  workerRouteResponseSchema,
  type WorkerRouteResponseDTO,
} from "../../dto/worker/worker-route-response.dto.js";
import { ApiError } from "../../middleware/error.js";

// 실제로 외부에서 사용 가능한 클라이언트입니다.
// 사용 가능한 메서드는 2가지로
// 1. 파이썬 fastapi 서버의 동작 여부
// 2. 경로 후보 추천이 있습니다.
export type RouteWorkerClient = {
  checkHealth(): Promise<{ ok: boolean }>;
  requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO>;
};

class MockRouteWorkerClient implements RouteWorkerClient {
  // healthy 값은 항상 true로 보내줍니다.
  async checkHealth(): Promise<{ ok: boolean }> {
    return {
      ok: true,
    };
  }

  // route 생성 요청의 경우에는 임시로 응답 데이터 만들어서 해결하기
  async requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO> {
    const lat = input.startPoint.lat;
    const lng = input.startPoint.lng;
    const endPoint = input.endPoint;
    const targetDistance = Number(input.elementConditions.targetDistance ?? 5000);
    const fallbackMiddlePoint = {
      lat: (lat + endPoint.lat) / 2 + 0.002,
      lng: (lng + endPoint.lng) / 2 + 0.002,
    };
    const path = [
      input.startPoint,
      ...input.waypoints,
      ...(input.waypoints.length === 0 ? [fallbackMiddlePoint] : []),
      endPoint,
    ];
    const points = [
      {
        sequence: 0,
        pointType: "START" as const,
        lat,
        lng,
        title: "출발지",
      },
      ...input.waypoints.map((waypoint, index) => ({
        sequence: index + 1,
        pointType: "WAYPOINT" as const,
        lat: waypoint.lat,
        lng: waypoint.lng,
        title: `경유지 ${index + 1}`,
      })),
      {
        sequence: input.waypoints.length + 1,
        pointType: "END" as const,
        lat: endPoint.lat,
        lng: endPoint.lng,
        title: input.isRoundTrip ? "도착지(출발지)" : "도착지",
      },
    ];
    const makeCandidate = (
      index: number,
      name: string,
      score: number,
      extraDistance: number,
      middleOffset: number,
    ) => ({
      name,
      score,
      path: path.map((point, pointIndex) => {
        if (pointIndex === 0 || pointIndex === path.length - 1) {
          return point;
        }

        return {
          lat: point.lat + middleOffset,
          lng: point.lng - middleOffset,
        };
      }),
      featureScores: {
        distance: score,
        routeIndex: index,
      },
      featureValues: {
        targetDistance,
        estimatedDistance: Math.round(targetDistance + extraDistance),
      },
      totalDistance: Math.round(targetDistance + extraDistance),
      totalAscent: index === 1 ? null : 20 + (index * 8),
      slopeStd: index === 1 ? null : 1.5 + (index * 0.4),
      points,
    });

    return {
      candidates: [
        makeCandidate(1, "Mock 추천 코스 1", 90, 0, 0),
        makeCandidate(2, "Mock 추천 코스 2", 84, 250, 0.001),
        makeCandidate(3, "Mock 추천 코스 3", 78, -200, -0.001),
      ],
    };
  }
}

class HttpRouteWorkerClient implements RouteWorkerClient {
  async checkHealth(): Promise<{ ok: boolean }> {
    const response = await fetch(new URL("/health", env.WORKER_URL));

    return {
      ok: response.ok,
    };
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
