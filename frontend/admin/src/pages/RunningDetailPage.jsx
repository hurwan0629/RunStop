import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRun } from '../api/runningApi'
import RunningMap from '../components/RunningMap'
import './RunningPage.css'

const paceLabel = seconds => seconds == null ? '—' : `${Math.floor(Math.round(seconds) / 60)}'${String(Math.round(seconds) % 60).padStart(2, '0')}"/km`

export default function RunningDetailPage() {
  const { sessionIdx } = useParams()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState([])
  const [segmentIndex, setSegmentIndex] = useState(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getRun(sessionIdx, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setDetail(data)
        setVisible([])
        setSegmentIndex(null)
        setError('')
      }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.response?.data?.error?.message || '러닝을 불러오지 못했습니다.')
    })
    return () => controller.abort()
  }, [sessionIdx, refresh])

  if (error) return <main className="running-page"><p role="alert">{error}</p><button onClick={() => setRefresh(n => n + 1)}>다시 조회</button></main>
  if (!detail || detail.sessionIdx !== Number(sessionIdx)) return <main className="running-page" role="status">러닝과 구간 정보를 불러오는 중…</main>
  const segment = segmentIndex === null ? null : detail.segments[segmentIndex]
  const environment = segment?.environment
  const facilities = environment?.facilityPoints || []

  return <main className="running-page">
    <Link to={`/running?userIdx=${detail.userIdx}`}>← 회원의 러닝 목록</Link>
    <h1>러닝 #{detail.sessionIdx}</h1>
    <p>회원 #{detail.userIdx} · {new Date(detail.startedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {detail.status}</p>
    <div className="run-comparison">
      <section>
        <RunningMap detail={detail} visibleAlternatives={visible} segmentIndex={segmentIndex} />
        <p className="run-legend">남색: 선택한 코스 · 초록: 실제 주행 · 주황: 선택 구간 · 점선: 미선택 코스</p>
        {!detail.trackPaths.length && <p>표시할 유효 GPS 기록이 없습니다. 선택한 코스만 확인할 수 있습니다.</p>}
        <p>낮은 정확도 {detail.excludedPointCount}개 제외 · 기록 단절 {detail.gapCount}곳</p>
      </section>
      <aside className="run-card">
        <h2>이 러닝에서 선택한 코스</h2>
        <strong>{detail.route?.name || '코스 정보 없음'}</strong>
        <p>실제 {detail.distance == null ? '거리 정보 없음' : `${(detail.distance / 1000).toFixed(2)}km`} · 평균 {paceLabel(detail.averagePace)}</p>
        <h2>선택하지 않은 추천 코스</h2>
        {detail.alternatives.length === 0 && <p>같이 추천된 다른 코스가 없습니다.</p>}
        {detail.alternatives.map(route => <label className="run-alternative" key={route.idx}>
          <input type="checkbox" checked={visible.includes(route.idx)} onChange={() => setVisible(previous =>
            previous.includes(route.idx) ? previous.filter(id => id !== route.idx) : [...previous, route.idx])} />
          <span>{route.name}<small>{route.totalDistance == null ? '거리 정보 없음' : `${(route.totalDistance / 1000).toFixed(2)}km`} · 점수 {route.score ?? '—'}</small></span>
        </label>)}
        <details><summary>저장된 추천 요청 조건</summary><pre>{JSON.stringify(detail.request, null, 2)}</pre></details>
      </aside>
    </div>
    <section className="run-card">
      <h2>주행 구간 · 선택하면 지도에서 강조</h2>
      <div className="run-segments">{detail.segments.map((part, index) => <button key={index}
        className={segmentIndex === index ? 'active' : ''} aria-pressed={segmentIndex === index}
        onClick={() => setSegmentIndex(segmentIndex === index ? null : index)}>
        {(part.distanceFrom / 1000).toFixed(2)}–{(part.distanceTo / 1000).toFixed(2)}km
        <small>{Math.round(part.durationSeconds)}초 · {paceLabel(part.pace)}</small>
      </button>)}</div>
      {!detail.segments.length && <p>구간 분석에 필요한 GPS 기록이 부족합니다.</p>}
      {segment && <p>
        평균 경사 {environment?.slope?.avgSlopePct == null ? '정보 없음' : `${environment.slope.avgSlopePct.toFixed(1)}%`}
        {' · '}화장실 {environment ? facilities.filter(p => p.type === 'toilet').length : '—'}개
        {' · '}편의점 {environment ? facilities.filter(p => p.type === 'store').length : '—'}개
        {' · '}조명 {environment ? facilities.filter(p => ['light', 'security', 'walklight'].includes(p.type)).length : '—'}개
        {' · '}공원 {environment?.mapLayers?.natureCounts?.park ?? '—'}개
        {' · '}하천 {environment?.mapLayers?.natureCounts?.water ?? '—'}개
      </p>}
      <p>구간 시간·페이스는 유효 GPS 기준입니다. 경사는 고도 데이터로 계산한 추정값입니다.</p>
      {detail.analysisStatus === 'UNAVAILABLE' && <p>구간 환경 분석을 불러오지 못했습니다. 지도와 페이스는 확인할 수 있습니다.</p>}
    </section>
  </main>
}
