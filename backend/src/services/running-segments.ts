import type { RunningTrackpointRow } from "../repositories/running-trackpoints.repository.js";
import type { RunningSegmentDTO } from "../dto/running/running-detail.dto.js";

type Point = { lat: number; lng: number };

function distance(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** GPS 품질과 기록 단절을 반영하고, 1km 경계의 좌표·시간을 함께 보간한다. */
export function buildRunningSegments(raw: RunningTrackpointRow[]) {
  const points = raw.filter(p => p.accuracy === null || p.accuracy <= 50);
  const segments: RunningSegmentDTO[] = [];
  const trackPaths: Point[][] = [];
  let total = 0;
  let from = 0;
  let seconds = 0;
  let path: Point[] = [];
  let gapCount = 0;

  const finish = () => {
    if (total > from && seconds > 0 && path.length >= 2) {
      segments.push({
        distanceFrom: from,
        distanceTo: total,
        durationSeconds: seconds,
        pace: seconds * 1000 / (total - from),
        path: [...path],
        environment: null,
      });
    }
    from = total;
    seconds = 0;
    path = path.length ? [path[path.length - 1]!] : [];
  };

  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const meters = distance(a, b);
    const elapsed = (b.recordedAt.getTime() - a.recordedAt.getTime()) / 1000;

    // 2분 이상 기록 단절·역전 시간·비정상 이동은 직선으로 연결하지 않는다.
    if (elapsed <= 0 || elapsed > 120 || meters / elapsed > 12) {
      finish();
      path = [];
      gapCount += 1;
      continue;
    }
    if (!path.length) {
      path = [{ lat: a.lat, lng: a.lng }];
      trackPaths.push([{ lat: a.lat, lng: a.lng }]);
    }
    if (meters === 0) {
      seconds += elapsed;
      continue;
    }
    trackPaths[trackPaths.length - 1]!.push({ lat: b.lat, lng: b.lng });

    let consumed = 0;
    while (consumed < meters) {
      const nextBoundary = (Math.floor((total + 0.00001) / 1000) + 1) * 1000;
      const step = Math.min(meters - consumed, nextBoundary - total);
      consumed += step;
      total += step;
      seconds += elapsed * step / meters;
      const fraction = consumed / meters;
      path.push({ lat: a.lat + (b.lat - a.lat) * fraction, lng: a.lng + (b.lng - a.lng) * fraction });
      if (Math.abs(total - nextBoundary) < 0.00001) finish();
    }
  }
  finish();
  return {
    segments,
    trackPaths: trackPaths.filter(points => points.length >= 2),
    gapCount,
    excludedPointCount: raw.length - points.length,
  };
}
