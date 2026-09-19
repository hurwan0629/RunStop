import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/config/env.js", () => ({
  env: { WORKER_URL: "http://worker.test", NODE_ENV: "test", LOG_LEVEL: "silent" },
}));
import { HttpRouteWorkerClient } from "../src/adapters/worker/implements/routing-worker.http.js";
import type { WorkerRouteRequestDTO } from "../src/dto/worker/worker-route-request.dto.js";

const input = {} as WorkerRouteRequestDTO;
const client = new HttpRouteWorkerClient();
afterEach(() => vi.unstubAllGlobals());

test("연결 실패와 시간 초과를 구분한다", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  fetch.mockRejectedValueOnce(new TypeError("connect failed"));
  await expect(client.requestRouteRecommendations(input)).rejects.toMatchObject({
    code: "ROUTING_WORKER_UNAVAILABLE", status: 503,
  });
  fetch.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));
  await expect(client.requestRouteRecommendations(input)).rejects.toMatchObject({
    code: "ROUTING_WORKER_TIMEOUT", status: 504,
  });
});

test("워커 거절·오류·잘못된 응답에 내부 본문을 노출하지 않는다", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  for (const [status, code] of [
    [422, "ROUTING_INPUT_REJECTED"],
    [500, "ROUTING_WORKER_REQUEST_FAILED"],
    [504, "ROUTING_WORKER_TIMEOUT"],
  ] as const) {
    fetch.mockResolvedValueOnce(new Response("private stack trace", { status }));
    await expect(client.requestRouteRecommendations(input)).rejects.toMatchObject({ code });
  }
  for (const body of ["not json", '{"invalid":true}']) {
    fetch.mockResolvedValueOnce(new Response(body));
    await expect(client.requestRouteRecommendations(input)).rejects.toMatchObject({
      code: "INVALID_ROUTING_WORKER_RESPONSE",
    });
  }
  fetch.mockResolvedValueOnce(Response.json({ candidates: [] }));
  await expect(client.requestRouteRecommendations(input)).resolves.toEqual({ candidates: [] });
  expect(fetch.mock.calls.at(-1)?.[1].signal).toBeInstanceOf(AbortSignal);
});
