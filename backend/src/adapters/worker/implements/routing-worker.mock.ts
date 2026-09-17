import type { WorkerRouteRequestDTO } from "../../../dto/worker/worker-route-request.dto.js";
import type {
  WorkerRouteCandidateDTO,
  WorkerRoutePointDTO,
  WorkerRouteResponseDTO,
} from "../../../dto/worker/worker-route-response.dto.js";
import type { RouteWorkerClient } from "../types.js";

export class MockRouteWorkerClient implements RouteWorkerClient {
  async checkHealth(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async requestRouteRecommendations(input: WorkerRouteRequestDTO): Promise<WorkerRouteResponseDTO> {
    const startPoint = input.startPoint;
    const endPoint = input.endPoint ?? input.startPoint;
    const targetDistance = Number(input.elementConditions.targetDistance ?? 5000);
    const fallbackMiddlePoint = {
      lat: (startPoint.lat + endPoint.lat) / 2 + 0.002,
      lng: (startPoint.lng + endPoint.lng) / 2 + 0.002,
    };
    const path = [
      startPoint,
      ...input.waypoints,
      ...(input.waypoints.length === 0 ? [fallbackMiddlePoint] : []),
      endPoint,
    ];
    const points: WorkerRoutePointDTO[] = [
      {
        sequence: 0,
        pointType: "START",
        lat: startPoint.lat,
        lng: startPoint.lng,
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
        pointType: "END",
        lat: endPoint.lat,
        lng: endPoint.lng,
        title: input.routeType === "ROUND_TRIP" ? "도착지(출발지)" : "도착지",
      },
    ];
    const makeCandidate = (
      index: number,
      name: string,
      score: number,
      extraDistance: number,
      middleOffset: number,
    ): WorkerRouteCandidateDTO => ({
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
