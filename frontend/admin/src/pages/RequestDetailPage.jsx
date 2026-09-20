import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActivityRuns, getRequest } from '../api/explorerApi'
import { getRun } from '../api/runningApi'
import { Badge, Breadcrumb, Metrics, Pagination } from '../components/ExplorerUI'
import RouteMapPanel from '../components/RouteMapPanel'
import RouteRequestComparison from '../components/RouteRequestComparison'
import { candidateRows, dateTime, distance, requestRows } from '../utils/explorer'

function CandidateMap({ request, route }) {
  const [runs, setRuns] = useState(null)
  const [page, setPage] = useState(1)
  const [chosen, setChosen] = useState(null)
  const [run, setRun] = useState(null)
  const [error, setError] = useState('')
  const sessionIdx = chosen ?? runs?.items.find(item => item.routeIdx === route.idx)?.sessionIdx

  useEffect(() => {
    const controller = new AbortController()
    getActivityRuns({ requestIdx: request.idx, routeIdx: route.idx, page }, controller.signal).then(data => {
      if (!controller.signal.aborted) { setRuns(data); setError('') }
    }).catch(() => { if (!controller.signal.aborted) setError('연관 러닝을 불러오지 못했습니다.') })
    return () => controller.abort()
  }, [request.idx, route.idx, page])

  useEffect(() => {
    if (!sessionIdx) return
    const controller = new AbortController()
    getRun(sessionIdx, controller.signal).then(data => {
      if (!controller.signal.aborted) { setRun(data); setError('') }
    }).catch(() => { if (!controller.signal.aborted) setError('실제 러닝 경로를 불러오지 못했습니다.') })
    return () => controller.abort()
  }, [sessionIdx])

  // 후보별 연결을 검증해 다른 후보의 GPS가 남아 보이지 않도록 한다.
  const actual = run?.sessionIdx === sessionIdx && run?.route?.idx === route.idx ? run : null
  const related = runs?.items.filter(item => item.routeIdx === route.idx) || []
  return <>
    {related.length > 0 && <div className="explorer-run-picker"><label htmlFor="candidate-run">연관 러닝</label>
      <select id="candidate-run" value={sessionIdx || ''} onChange={event => setChosen(Number(event.target.value))}>
        {related.map(item => <option key={item.sessionIdx} value={item.sessionIdx}>RUN-{item.sessionIdx} · {dateTime(item.startedAt)}</option>)}
      </select><Link className="run-button" to={`/running/${sessionIdx}`}>러닝 기록으로 이동 →</Link>
      {!actual && !error && <span role="status">실제 경로를 불러오는 중…</span>}
    </div>}
    {runs && (page > 1 || runs.hasMore) && <Pagination page={page} hasMore={runs.hasMore} onChange={value => { setChosen(null); setRuns(null); setPage(value) }} />}
    {error && <p role="alert">{error}</p>}
    <RouteMapPanel key={`${route.idx}:${actual?.sessionIdx || ''}`} route={route} run={actual} />
  </>
}

export default function RequestDetailPage() {
  const { requestIdx, candidateIdx } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getRequest(requestIdx, controller.signal).then(result => {
      if (!controller.signal.aborted) { setData(result); setError(null) }
    }).catch(() => { if (!controller.signal.aborted) setError({ requestIdx, message: '추천 요청을 불러오지 못했습니다.' }) })
    return () => controller.abort()
  }, [requestIdx])

  if (error?.requestIdx === requestIdx) return <main className="running-page"><Link to="/requests">← 추천 요청</Link><p role="alert">{error.message}</p></main>
  if (data?.request.idx !== Number(requestIdx)) return <main className="running-page"><p role="status">추천 요청을 불러오는 중…</p></main>

  const { request, recommendations } = data
  const selected = recommendations.find(route => route.idx === Number(candidateIdx))
  const selectedIndex = recommendations.indexOf(selected)
  const comparison = { request, route: recommendations[0], alternatives: recommendations.slice(1) }

  return <main className="running-page">
    <Breadcrumb items={[
      ['회원 관리', '/users'], [request.nickname, `/users/${request.userIdx}`],
      [`요청 REQ-${request.idx}`, candidateIdx ? `/requests/${request.idx}` : null],
      ...(candidateIdx ? [[selected ? `후보 ${selectedIndex + 1}` : '후보']] : []),
    ]} />
    <header className="run-detail-header"><div><p className="run-eyebrow">추천 요청</p><h1>REQ-{request.idx}</h1>
      <p><Link to={`/users/${request.userIdx}`}>{request.nickname}</Link> · {dateTime(request.createdAt)}</p></div>
      <Badge status={request.selectedRecommendationIdx ? 'SELECTED' : 'UNSELECTED'} />
    </header>
    <section className="run-card explorer-conditions"><h2>사용자가 요청한 조건</h2><Metrics rows={requestRows(request)} /></section>
    <section aria-label="후보 비교"><div className="run-section-heading"><h2>추천 후보 {recommendations.length}개</h2>
      <Link to="/requests">전체 요청 →</Link></div>
      <nav className="explorer-tabs" aria-label="추천 후보 전환" style={{ marginTop: 16 }}>
        {recommendations.map((route, index) => <Link key={route.idx} to={`/requests/${request.idx}/candidates/${route.idx}`}
          className={selected?.idx === route.idx ? 'active' : ''} aria-current={selected?.idx === route.idx ? 'page' : undefined}>
          <strong>후보 {index + 1}</strong><small>{distance(route.totalDistance)} · {route.name}</small>
          {route.idx === request.selectedRecommendationIdx && <Badge status="SELECTED" />}
        </Link>)}
      </nav>
      {!recommendations.length && <p className="run-empty">추천 후보가 없습니다.</p>}
    </section>
    {selected ? <>
      <div className="run-section-heading"><h2>후보 {selectedIndex + 1} · {selected.name}</h2>
        {selected.idx === request.selectedRecommendationIdx && <Badge status="SELECTED" />}</div>
      <CandidateMap key={`${request.idx}:${selected.idx}`} request={request} route={selected} />
      <section className="run-card"><h2>추천 경로 특징</h2><Metrics rows={candidateRows(selected, request)} /></section>
    </> : candidateIdx ? <p role="alert">이 요청에 속한 후보를 찾을 수 없습니다. 위에서 후보를 선택해 주세요.</p> : null}
    {recommendations.length > 0 && <details className="explorer-comparison"><summary>후보 지표 한눈에 비교 · 다른 요청과 비교</summary>
      <RouteRequestComparison key={request.idx} detail={comparison} />
    </details>}
  </main>
}
