export const routeLabels = { LOOP: '순환', ONE_WAY: '편도', ROUND_TRIP: '왕복' }
export const number = (value, unit = '', scale = 1) => typeof value === 'number' && Number.isFinite(value)
  ? `${(value * scale).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}` : '—'
export const distance = value => number(value, ' km', .001)
export const dateTime = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '—'
export const duration = value => value == null ? '—' : `${Math.floor(Math.round(value) / 60)}분 ${Math.round(value) % 60}초`
export const elapsed = run => run.finishedAt && run.startedAt ? Math.max(0, (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000) : null
export const pace = value => value == null ? '—' : `${Math.floor(Math.round(value) / 60)}′ ${String(Math.round(value) % 60).padStart(2, '0')}″ /km`

// 링크나 버튼은 자신의 동작을 유지하고, 나머지 셀과 키보드로 행을 연다.
export function rowAction(event, action) {
  if (event.target !== event.currentTarget && event.target.closest('a,button,input,select')) return
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return
  event.preventDefault()
  action()
}

const preference = value => value == null ? '—' : value ? '선호' : '상관없음'
export function requestRows(request) {
  const c = request?.elementConditions || {}
  return [
    ['코스 유형', routeLabels[request?.routeType] || '—'], ['목표 거리', distance(c.targetDistance)], ['예상 시간', '—'],
    ['경사', { GENTLE: '완만', NORMAL: '약간 경사짐', ANY: '상관없음' }[c.slopePreference] || '—'],
    ['최대 경사', c.maxSlope == null ? '제한 없음' : number(c.maxSlope, '%')],
    ['공원·하천', preference(c.preferNature)], ['신호등·횡단보도 적게', preference(c.preferFlow)],
    ...[['toilet', '화장실'], ['store', '편의점']].map(([key, label]) => [label,
      { PREFER: '선호', IGNORE: '상관없음', AVOID: '피하기' }[c.facilityPreferences?.[key]] || '—']),
    ['야간 중요도', number(c.weights?.night, ' / 5')],
    ...[['START', '출발지'], ['WAYPOINT', '경유지'], ['END', '도착지']].map(([type, label]) => [label,
      (request?.points || []).filter(p => p.pointType === type).map(p => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`).join(' → ') || '—']),
  ]
}

export function candidateRows(route, request) {
  const f = route?.featureValues || {}
  const target = request?.elementConditions?.targetDistance
  const error = f.distanceErrorPct ?? (target > 0 && route?.totalDistance != null ? Math.abs(route.totalDistance - target) / target * 100 : null)
  return [
    ['후보 거리', distance(route?.totalDistance)], ['예상 시간', '—'], ['목표 거리 차이', number(error, '%')],
    ['평균 경사', number(f.slope?.avgSlopePct, '%')], ['최대 경사', number(f.slope?.maxSlopePct, '%')],
    ['누적 상승', number(f.slope?.elevationGainM ?? route?.totalAscent, ' m')],
    ...[['toilet', '화장실'], ['store', '편의점'], ['cctv', 'CCTV'], ['security', '보안등'], ['light', '가로등']]
      .flatMap(([key, label]) => [[label, number(f[`${key}_count`], '개')], [`${label} 접근성`, number(f[`${key}_per_km`], '개/km')]]),
    ['공원 인접률', number(f.nature?.parkRatio, '%', 100)], ['하천 인접률', number(f.nature?.waterRatio, '%', 100)],
    ['신호등', number(f.surface?.signal_per_km, '개/km')], ['횡단보도', number(f.surface?.crossing_per_km, '개/km')],
    ['경로 중복률', number(f.overlapRatio, '%', 100)], ['조건 평가 점수', number(route?.score)], ['AI 추천 점수', number(f.aiScore)],
  ]
}

// 구간별 경사는 경로 좌표 인덱스에 대응한다. 실제 주행 시간·페이스를 추정하지 않는다.
export function plannedSegments(route) {
  const path = route?.path || []
  const offsets = [0]
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], radians = Math.PI / 180
    const h = Math.sin((b.lat - a.lat) * radians / 2) ** 2
      + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin((b.lng - a.lng) * radians / 2) ** 2
    offsets.push(offsets[i - 1] + 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h))))
  }
  const slopes = route?.featureValues?.mapLayers?.slopeSegments || []
  const parts = slopes.length ? slopes : path.length > 1 ? [{ fromIndex: 0, toIndex: path.length - 1 }] : []
  return parts.filter(s => s.fromIndex >= 0 && s.toIndex < path.length && s.toIndex > s.fromIndex).map(s => ({
    distanceFrom: offsets[s.fromIndex], distanceTo: offsets[s.toIndex],
    path: path.slice(s.fromIndex, s.toIndex + 1), durationSeconds: null, pace: null,
    environment: { slope: { avgSlopePct: s.slopePct } },
  }))
}
