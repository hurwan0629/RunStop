// monk 구현체를 넣어놓는 공간
import type { RouteWorkerClient } from "../routing-worker.client.js";

import type { WorkerRouteRequestDTO } from "../../../dto/worker/worker-route-request.dto.js";
import type { WorkerRouteResponseDTO } from "../../../dto/worker/worker-route-response.dto.js";

export class MockRouteWorkerClient implements RouteWorkerClient {
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
      lat: endPoint ? ((lat + endPoint.lat) / 2 + 0.002) : (lat + 1),
      lng: endPoint ? ((lng + endPoint.lng) / 2 + 0.002) : (lng + 1),
    };
    // 워커가 생성할 실제 경로 좌표 Mock api
    const path = [
      input.startPoint,
      ...input.waypoints,
      // 경유지가 없다면 임시로 만들어주기
      ...(input.waypoints.length === 0 ? [fallbackMiddlePoint] : []),
      ...(input.endPoint ? [input.endPoint] : []),
    ];
    // 사용자가 요청한 경로들
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
        lat: endPoint ? endPoint.lat : lat,
        lng: endPoint ? endPoint.lng : lng,
        title: ["LOOP", "ROUND_TRIP"].includes(input.routeType) ? "도착지(순회)" : "도착지",
      },
    ];
    // 후보 1개 예시 만들기 
    const makeCandidate = (
      index: number, // 번호
      name: string, // 이름
      score: number, // 점수
      extraDistance: number, // 추가 거리 잡기
      middleOffset: number,  // 중간 
    ) => ({
      name,
      score,
      path: path.map((point, pointIndex) => {
        // 시작 또는 마지막의 경우에는 포인트를 그대로 반환하기
        if (pointIndex === 0 || pointIndex === path.length - 1) {
          return point;
        }

        return {
          // 나머지의 경우에는 오차를 하나 줘서 반환하기
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