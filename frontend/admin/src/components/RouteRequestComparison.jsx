import { useEffect, useRef, useState } from 'react'
import { getRouteRequest } from '../api/runningApi'

const number = (value, unit = '', scale = 1) => typeof value === 'number' && Number.isFinite(value)
  ? `${(value * scale).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}` : '—'
const preference = value => value === undefined ? '기록 없음' : value ? '선호' : '상관없음'
const coordinate = point => `${number(point.lat)}, ${number(point.lng)}`

function requestRows(request) {
  const c = request?.elementConditions || {}
  const points = request?.points || []
  return [
    ['코스 유형', { LOOP: '순환', ONE_WAY: '편도', ROUND_TRIP: '왕복' }[request?.routeType] || '—'],
    ['목표 거리', number(c.targetDistance, ' km', .001)],
    ['경사 선택', { GENTLE: '완만', NORMAL: '약간 경사짐', ANY: '상관없음' }[c.slopePreference] || '과거 기록 · 최대 경사 참조'],
    ['요청 최대 경사', c.maxSlope == null ? '미지정' : number(c.maxSlope, '%')],
    ['공원·하천', preference(c.preferNature)],
    ['신호등·횡단보도 적게', preference(c.preferFlow)],
    ['화장실', c.facilityPreferences?.toilet || '—'],
    ['편의점', c.facilityPreferences?.store || '—'],
    ['야간 중요도', number(c.weights?.night, '/5')],
    ...['START', 'WAYPOINT', 'END'].map((type, i) => [
      ['출발지', '경유지', '도착지'][i], points.filter(p => p.pointType === type).map(coordinate).join(' → ') || '미지정',
    ]),
  ]
}

function candidateRows(route, request) {
  const f = route?.featureValues || {}
  const target = request?.elementConditions?.targetDistance
  const error = f.distanceErrorPct ?? (target > 0 && route?.totalDistance != null
    ? Math.abs(route.totalDistance - target) / target * 100 : null)
  return [
    ['실제 거리', number(route?.totalDistance, ' km', .001)],
    ['거리 오차', number(error, '%')],
    ['평균 경사', number(f.slope?.avgSlopePct, '%')],
    ['최대 경사', number(f.slope?.maxSlopePct, '%')],
    ['누적 상승', number(f.slope?.elevationGainM ?? route?.totalAscent, ' m')],
    ['실제 적용 경사 제한', f.slopeConstraint ? (f.slopeConstraint.appliedMaxSlopePct == null ? '제한 없음' : number(f.slopeConstraint.appliedMaxSlopePct, '%')) : '—'],
    ['경사 조건 충족', f.slopeConstraint?.evaluation === 'UNAVAILABLE' ? '고도 정보 부족' : f.slopeConstraint?.status || '—'],
    ...[['toilet', '화장실'], ['store', '편의점'], ['cctv', 'CCTV'], ['security', '보안등'], ['light', '가로등']]
      .flatMap(([key, label]) => [[`${label} 개수`, number(f[`${key}_count`], '개')], [`${label} /km`, number(f[`${key}_per_km`])]]),
    ['공원 인접률', number(f.nature?.parkRatio, '%', 100)],
    ['하천 인접률', number(f.nature?.waterRatio, '%', 100)],
    ['신호등 /km', number(f.surface?.signal_per_km)],
    ['횡단보도 /km', number(f.surface?.crossing_per_km)],
    ['경로 중복률', number(f.overlapRatio, '%', 100)],
    ['Heuristic 점수', number(route?.score)],
    ['AI 점수', number(f.aiScore)],
    ['순위 결정 방식', f.rankingSource || '과거 기록 · 미저장'],
    ['후보 생성 방식', f.generationSource || '과거 기록 · 미저장'],
  ]
}

export default function RouteRequestComparison({ detail }) {
  const [requestId, setRequestId] = useState('')
  const [other, setOther] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])

  const compare = async event => {
    event.preventDefault()
    pending.current?.abort()
    const id = Number(requestId)
    if (!Number.isSafeInteger(id) || id <= 0) { setError('올바른 요청 번호를 입력해 주세요.'); return }
    if (id === detail.request?.idx) { setError('현재 요청과 다른 요청 번호를 입력해 주세요.'); return }
    const controller = new AbortController()
    pending.current = controller
    setError('')
    setOther(null)
    setLoading(true)
    try {
      const value = await getRouteRequest(id, controller.signal)
      if (!controller.signal.aborted) setOther(value)
    } catch (error) {
      if (!controller.signal.aborted) setError(error.response?.data?.error?.message || '요청을 불러오지 못했습니다.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const groups = [{ request: detail.request, recommendations: [detail.route, ...detail.alternatives].filter(Boolean) }]
  if (other) groups.push(other)
  const columns = groups.flatMap(group => [...group.recommendations].sort((a, b) => a.idx - b.idx)
    .map((route, index) => ({ route, request: group.request, label: String.fromCharCode(65 + index),
      rows: [...requestRows(group.request), ...candidateRows(route, group.request)] })))

  return <section className="run-card">
    <div className="run-section-heading"><div><h2>요청 조건과 후보 비교</h2>
      <p>요청 #{detail.request?.idx ?? '—'} · 저장된 후보만 비교합니다. —는 과거 기록에 없는 값입니다.</p></div></div>
    <form className="run-filters" onSubmit={compare}>
      <label>다른 요청 번호<input type="number" min="1" step="1" value={requestId} onChange={event => setRequestId(event.target.value)} /></label>
      <button type="submit" disabled={loading}>{loading ? '조회 중…' : '요청 비교'}</button>
      {other && <button type="button" onClick={() => setOther(null)}>비교 닫기</button>}
    </form>
    {error && <p role="alert">{error}</p>}
    {other && <p className="run-footnote">출발지·거리·코스 유형이 같은 요청에서 조건 하나만 바꿨을 때 가장 정확하게 비교할 수 있습니다.</p>}
    <div className="run-table-wrap"><table className="run-table">
      <caption>추천 요청별 후보 A/B/C의 조건과 실제 경로 지표</caption>
      <thead><tr><th scope="col">항목</th>{columns.map(({ route, request, label }) => <th scope="col" key={`${request?.idx}:${route.idx}`}>
        요청 #{request?.idx ?? '—'} · {label}<br />코스 #{route.idx}
        {(route.idx === request?.selectedRecommendationIdx || route.idx === detail.route?.idx) && <span className="run-tag">사용자 선택</span>}
      </th>)}</tr></thead>
      <tbody>{columns[0]?.rows.map(([label], index) => <tr key={label}><th scope="row">{label}</th>
        {columns.map(column => <td key={`${column.request?.idx}:${column.route.idx}`}>{column.rows[index][1]}</td>)}
      </tr>)}</tbody>
    </table></div>
  </section>
}
