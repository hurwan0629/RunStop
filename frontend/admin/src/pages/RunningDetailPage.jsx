import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRun } from '../api/runningApi'
import { getAdminUserDetail } from '../api/usersApi'
import { Badge, Breadcrumb, Metrics } from '../components/ExplorerUI'
import RouteMapPanel from '../components/RouteMapPanel'
import { candidateRows, dateTime, distance, duration, elapsed, pace, requestRows } from '../utils/explorer'

export default function RunningDetailPage() {
  const { sessionIdx } = useParams()
  const [detail, setDetail] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getRun(sessionIdx, controller.signal).then(async result => {
      if (controller.signal.aborted) return
      setDetail(result)
      setError(null)
      try {
        const member = await getAdminUserDetail(result.userIdx)
        if (!controller.signal.aborted) setUser(member.user)
      } catch { /* 회원 조회 실패여도 러닝 기록은 열 수 있다. */ }
    }).catch(() => { if (!controller.signal.aborted) setError({ sessionIdx, message: '러닝 기록을 불러오지 못했습니다.' }) })
    return () => controller.abort()
  }, [sessionIdx, refresh])

  if (error?.sessionIdx === sessionIdx) return <main className="running-page"><Link to="/running">← 러닝 목록</Link><p role="alert">{error.message}</p>
    <button className="run-button" onClick={() => { setError(null); setRefresh(n => n + 1) }}>다시 조회</button></main>
  if (detail?.sessionIdx !== Number(sessionIdx)) return <main className="running-page"><p role="status">러닝 기록을 불러오는 중…</p></main>
  const nickname = user?.userIdx === detail.userIdx ? user.nickname : `회원 ${detail.userIdx}`

  return <main className="running-page">
    <Breadcrumb items={[
      ['러닝 기록', '/running'], [nickname, `/users/${detail.userIdx}`],
      ...(detail.request ? [[`요청 REQ-${detail.request.idx}`, `/requests/${detail.request.idx}`]] : []), [`러닝 RUN-${detail.sessionIdx}`],
    ]} />
    <header className="run-detail-header"><div><p className="run-eyebrow">RUN-{detail.sessionIdx}</p>
      <h1>{detail.route?.name || '일반 러닝'}</h1><p>{dateTime(detail.startedAt)} · <Link to={`/users/${detail.userIdx}`}>{nickname}</Link></p></div>
      <Badge status={detail.status} /></header>
    <section className="run-summary">{[
      ['실제 달린 거리', distance(detail.distance)], ['소요 시간', duration(elapsed(detail))],
      ['평균 페이스', pace(detail.averagePace)], ['추천 코스 거리', distance(detail.route?.totalDistance)],
    ].map(([label, value]) => <div className="run-summary-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    {detail.route && <div className="explorer-heading-links">
      <Link className="run-button" to={`/requests/${detail.route.routeRequestIdx}/candidates/${detail.route.idx}`}>선택한 후보와 다른 추천 코스 비교 →</Link>
    </div>}
    <RouteMapPanel key={detail.sessionIdx} route={detail.route} run={detail} />
    {detail.request && <section className="run-card explorer-conditions"><h2>사용자가 요청한 조건</h2><Metrics rows={requestRows(detail.request)} /></section>}
    {detail.route && <section className="run-card"><h2>선택한 추천 경로 특징</h2><Metrics rows={candidateRows(detail.route, detail.request)} /></section>}
  </main>
}
