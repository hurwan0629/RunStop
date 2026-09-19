import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRun } from '../api/runningApi'
import RunningMap from '../components/RunningMap'
import './RunningPage.css'

const statusLabels = { COMPLETED: '완료', IN_PROGRESS: '진행 중', STOPPED: '중단', CANCELLED: '취소', FAILED: '실패' }
const routeLabels = { ONE_WAY: '편도', ROUND_TRIP: '왕복', LOOP: '순환' }
const modes = { track: '실제 주행', course: '추천 코스', compare: '겹쳐 보기' }
const distanceLabel = meters => meters == null ? '—' : `${(meters / 1000).toFixed(2)} km`
const paceLabel = seconds => seconds == null ? '—' : `${Math.floor(Math.round(seconds) / 60)}′ ${String(Math.round(seconds) % 60).padStart(2, '0')}″ /km`
const durationLabel = seconds => seconds == null ? '—' : `${Math.floor(seconds / 60)}분 ${Math.round(seconds % 60)}초`

export default function RunningDetailPage() {
  const { sessionIdx } = useParams()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('track')
  const [alternativeId, setAlternativeId] = useState(null)
  const [segmentIndex, setSegmentIndex] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [fitVersion, setFitVersion] = useState(0)
  const mapSection = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    getRun(sessionIdx, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setDetail(data)
        setMode(data.trackPaths.length ? 'track' : 'course')
        setAlternativeId(null)
        setSegmentIndex(null)
        setError('')
      }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.response?.data?.error?.message || '러닝을 불러오지 못했습니다.')
    })
    return () => controller.abort()
  }, [sessionIdx, refresh])

  if (error) return <main className="running-page">
    <Link className="run-back" to="/running">← 러닝 목록</Link>
    <div className="run-card run-empty" role="alert">
      <h2>러닝을 불러오지 못했어요</h2>
      <p>{error}</p>
      <button className="run-button primary" onClick={() => {
        setError('')
        setDetail(null)
        setRefresh(n => n + 1)
      }}>다시 조회</button>
    </div>
  </main>
  if (!detail || detail.sessionIdx !== Number(sessionIdx)) return <main className="running-page">
    <div className="run-card run-empty" role="status">러닝 기록을 불러오는 중…</div>
  </main>

  const segment = segmentIndex === null ? null : detail.segments[segmentIndex]
  const environment = segment?.environment
  const facilities = environment?.facilityPoints || []
  const hasTrack = detail.trackPaths.length > 0
  const hasCourse = (detail.route?.path.length || 0) > 1
  const elapsed = detail.finishedAt ? Math.max(0, Math.round((Date.parse(detail.finishedAt) - Date.parse(detail.startedAt)) / 1000)) : null
  const conditions = detail.request?.elementConditions
  const facilityCount = types => environment ? `${facilities.filter(point => types.includes(point.type)).length}개` : '—'

  // 지도는 한 종류부터 보여주고, 비교를 요청할 때만 겹친다.
  const changeMode = next => {
    setMode(next)
    setAlternativeId(null)
    setSegmentIndex(null)
  }
  const selectSegment = index => {
    setSegmentIndex(segmentIndex === index ? null : index)
    setMode('track')
    setAlternativeId(null)
    mapSection.current?.scrollIntoView({ block: 'start' })
  }

  return <main className="running-page">
    <Link className="run-back" to={`/running?userIdx=${detail.userIdx}`}>← 회원의 러닝 목록</Link>

    {/* 기존 회원 상세와 같은 헤더·요약 카드 계층을 사용한다. */}
    <header className="run-detail-header">
      <div>
        <p className="run-eyebrow">러닝 기록 · #{detail.sessionIdx}</p>
        <h1>{detail.route?.name || '러닝 상세'}</h1>
        <p><Link to={`/users/${detail.userIdx}`}>회원 #{detail.userIdx}</Link><span className="run-separator">·</span>
          {new Date(detail.startedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </p>
      </div>
      <span className={`run-status ${detail.status === 'COMPLETED' ? 'complete' : ''}`}>{statusLabels[detail.status] || detail.status}</span>
    </header>

    <section className="run-summary" aria-label="러닝 요약">
      {[
        ['실제 달린 거리', distanceLabel(detail.distance)],
        ['전체 소요 시간', durationLabel(elapsed)],
        ['평균 페이스', paceLabel(detail.averagePace)],
        ['추천 코스 거리', distanceLabel(detail.route?.totalDistance)],
      ].map(([label, value]) => <div className="run-summary-item" key={label}>
        <span>{label}</span><strong>{value}</strong>
      </div>)}
    </section>

    <div className="run-comparison" ref={mapSection}>
      <section className="run-card run-map-card" aria-label="주행 지도">
        <div className="run-section-heading">
          <div><h2>주행 지도</h2><p>확인할 경로를 선택하세요.</p></div>
          <button className="run-button" onClick={() => {
            setSegmentIndex(null)
            setFitVersion(n => n + 1)
          }}>전체 경로 보기</button>
        </div>
        <div className="run-map-toolbar">
          <div className="run-mode-switch" role="group" aria-label="지도 표시 방식">
            {Object.entries(modes).map(([key, label]) => <button key={key}
              aria-pressed={mode === key}
              disabled={key === 'track' ? !hasTrack : key === 'course' ? !hasCourse : !hasCourse || (!hasTrack && !detail.alternatives.some(route => route.path.length > 1))}
              onClick={() => changeMode(key)}>{label}</button>)}
          </div>
          <span className="run-map-hint">{segment
            ? `${(segment.distanceFrom / 1000).toFixed(2)}–${(segment.distanceTo / 1000).toFixed(2)} km 구간`
            : '드래그로 이동 · + / −로 확대'}</span>
        </div>
        <RunningMap detail={detail} mode={mode} alternativeId={alternativeId} segmentIndex={segmentIndex} fitVersion={fitVersion} />
        <div className="run-map-footer" aria-live="polite">
          <div className="run-map-legend">
            {mode !== 'course' && hasTrack && <span><i className="track" />실제 주행</span>}
            {mode !== 'track' && hasCourse && <span><i className="course" />선택한 코스</span>}
            {alternativeId !== null && <span><i className="alternative" />비교 코스</span>}
            {segment && <span><i className="segment" />선택 구간</span>}
          </div>
          {!hasTrack && hasCourse && <p>저장된 GPS 기록이 없어 추천 코스만 표시합니다.</p>}
          {!hasTrack && !hasCourse && <p>표시할 경로가 없습니다.</p>}
          {(detail.gapCount > 0 || detail.excludedPointCount > 0) && <details className="run-quality">
            <summary>GPS 기록 안내</summary>
            <p>정확도가 낮은 지점 {detail.excludedPointCount}개 제외 · 기록 단절 {detail.gapCount}곳. 끊긴 구간은 연결하지 않습니다.</p>
          </details>}
        </div>
      </section>

      {/* 추천 후보는 한 번에 하나만 추가해 비교한다. */}
      <aside className="run-card run-course-panel">
        <div className="run-section-heading"><div><h2>추천 코스</h2><p>이 러닝에 함께 추천된 코스입니다.</p></div></div>
        <div className="run-selected-course">
          <span className="run-tag">사용자 선택</span>
          <h3>{detail.route?.name || '코스 정보 없음'}</h3>
          <p>{distanceLabel(detail.route?.totalDistance)}</p>
          <button className="run-button" disabled={!hasCourse} onClick={() => changeMode('course')}>이 코스만 보기</button>
        </div>
        <h3 className="run-panel-label">다른 추천과 비교</h3>
        {!detail.alternatives.length && <p className="run-muted">함께 추천된 다른 코스가 없습니다.</p>}
        {detail.alternatives.map(route => <button className={`run-alternative ${alternativeId === route.idx ? 'active' : ''}`}
          key={route.idx} aria-pressed={alternativeId === route.idx} disabled={route.path.length < 2}
          onClick={() => {
            setAlternativeId(alternativeId === route.idx ? null : route.idx)
            setMode('compare')
            setSegmentIndex(null)
          }}>
          <span><strong>{route.name}</strong><small>{distanceLabel(route.totalDistance)}</small></span>
          <span className="run-compare-label">{alternativeId === route.idx ? '비교 해제' : '비교'}</span>
        </button>)}

        <details className="run-request">
          <summary>추천 요청 조건</summary>
          {detail.request ? <>
            <dl>
              <div><dt>코스 유형</dt><dd>{routeLabels[detail.request.routeType] || '정보 없음'}</dd></div>
              <div><dt>목표 거리</dt><dd>{distanceLabel(conditions?.targetDistance)}</dd></div>
              <div><dt>최대 경사</dt><dd>{conditions?.maxSlope == null ? '제한 없음' : `${conditions.maxSlope}%`}</dd></div>
            </dl>
            <details><summary>전체 요청 데이터</summary><pre>{JSON.stringify(detail.request, null, 2)}</pre></details>
          </> : <p>저장된 요청 정보가 없습니다.</p>}
        </details>
      </aside>
    </div>

    {/* 구간 목록과 선택한 구간의 환경 정보를 분리한다. */}
    <section className="run-card">
      <div className="run-section-heading"><div><h2>구간별 기록</h2><p>구간을 누르면 지도에서 해당 이동 경로를 볼 수 있습니다.</p></div></div>
      <div className="run-segment-layout">
        <div className="run-segments" role="group" aria-label="주행 구간 선택">
          {detail.segments.map((part, index) => <button key={index}
            className={segmentIndex === index ? 'active' : ''} aria-pressed={segmentIndex === index}
            onClick={() => selectSegment(index)}>
            <span className="run-segment-number">{index + 1}</span>
            <span><strong>{(part.distanceFrom / 1000).toFixed(2)}–{(part.distanceTo / 1000).toFixed(2)} km</strong>
              <small>{durationLabel(Math.round(part.durationSeconds))}</small></span>
            <span className="run-segment-pace">{paceLabel(part.pace)}</span>
          </button>)}
          {!detail.segments.length && <p className="run-empty">구간을 분석할 GPS 기록이 부족합니다.</p>}
        </div>
        <div className="run-environment" aria-live="polite">
          <h3>{segment ? `${segmentIndex + 1}번 구간의 주변 환경` : '구간을 선택해 주세요'}</h3>
          {!segment ? <p>거리와 페이스를 비교하고,<br />선택한 구간의 경사와 주변 시설을 확인하세요.</p> : <>
            <dl>
              {[
                ['평균 경사', environment?.slope?.avgSlopePct == null ? '—' : `${environment.slope.avgSlopePct.toFixed(1)}%`],
                ['화장실', facilityCount(['toilet'])], ['편의점', facilityCount(['store'])],
                ['야간 조명', facilityCount(['light', 'security', 'walklight'])],
                ['공원', environment?.mapLayers?.natureCounts?.park == null ? '—' : `${environment.mapLayers.natureCounts.park}개`],
                ['하천', environment?.mapLayers?.natureCounts?.water == null ? '—' : `${environment.mapLayers.natureCounts.water}개`],
              ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            {!environment && <p>이 구간의 환경 정보는 제공되지 않습니다.</p>}
          </>}
        </div>
      </div>
      <p className="run-footnote">구간 시간·페이스는 유효 GPS 기준이며, 경사는 고도 데이터로 계산한 추정값입니다.</p>
      {detail.analysisStatus === 'UNAVAILABLE' && <p className="run-footnote">환경 분석을 불러오지 못했지만 지도와 페이스는 확인할 수 있습니다.</p>}
    </section>
  </main>
}
