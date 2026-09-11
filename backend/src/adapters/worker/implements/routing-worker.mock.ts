import type { WorkerRouteRequestDTO } from "../../../dto/worker/worker-route-request.dto.js";
import type { WorkerRouteResponseDTO } from "../../../dto/worker/worker-route-response.dto.js";
import type { RouteWorkerClient } from "../types.js";

export class MockRouteWorkerClient implements RouteWorkerClient {
  async checkHealth(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

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
