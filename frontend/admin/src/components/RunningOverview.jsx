import { useEffect, useState } from 'react'
import { getAdminUsers, getAdminUserDetail } from '../api/usersApi'
import { loadRunningOverview } from '../utils/runningOverview'
import './RunningOverview.css'

const formatKm = (meters) => (meters / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const PAGE_SIZE = 20

export default function RunningOverview() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [state, setState] = useState({ loading: true })
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    loadRunningOverview(getAdminUsers, getAdminUserDetail, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, updatedAt: new Date(), loading: false })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          controller.abort()
          setState({ loading: false, error: '집계 미완료: 회원 정보를 모두 조회하지 못했습니다. 새로고침으로 다시 시도하세요.' })
        }
      })
    return () => controller.abort()
  }, [refreshKey])

  const { loading, error, data, updatedAt } = state
  const pageCount = Math.max(1, Math.ceil((data?.rows.length ?? 0) / PAGE_SIZE))

  function refresh() {
    setState({ loading: true })
    setPage(1)
    setRefreshKey((key) => key + 1)
  }

  return (
    <section className="running-overview" aria-labelledby="running-overview-title" aria-busy={loading}>
      <header className="running-overview-header">
        <div>
          <h2 id="running-overview-title">누적 러닝 현황</h2>
          <p>탈퇴 회원 제외 · 완료된 러닝 기준 · 전체 기간</p>
        </div>
        <button type="button" className="dashboard-detail-button" onClick={refresh} disabled={loading}>
          {loading ? '조회 중…' : '새로고침'}
        </button>
      </header>
      {loading && <p className="running-overview-message" role="status">회원별 러닝 기록을 집계하고 있습니다.</p>}
      {error && <p className="running-overview-message running-overview-error" role="alert">{error}</p>}
      {data && <>
        <div className="running-overview-cards">
          {[
            ['러닝 경험 회원', `${data.runnerCount.toLocaleString()}명`],
            ['누적 이용률', data.rows.length ? `${data.usageRate.toFixed(1)}%` : '—'],
            ['완료 러닝', `${data.completedRunCount.toLocaleString()}회`],
            ['총 러닝 거리', `${formatKm(data.totalDistanceMeter)} km`],
          ].map(([label, value]) => <div className="running-overview-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <div className="running-overview-rate">
          <label htmlFor="running-usage">1회 이상 완료한 회원 {data.runnerCount.toLocaleString()}명 / 집계 대상 {data.rows.length.toLocaleString()}명</label>
          <progress id="running-usage" max="100" value={data.usageRate} />
          <small>마지막 조회: {updatedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (KST)</small>
        </div>
        <div className="dashboard-table-wrapper">
          <table className="running-overview-table">
            <caption>회원별 누적 기록 · 완료 횟수 순</caption>
            <thead><tr><th scope="col">회원 번호</th><th scope="col">닉네임</th><th scope="col">완료 횟수</th><th scope="col">누적 거리</th></tr></thead>
            <tbody>
              {data.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => (
                <tr key={row.userIdx}><td>{row.userIdx}</td><td>{row.nickname}</td><td>{row.completedRunCount.toLocaleString()}회</td><td>{formatKm(row.totalDistanceMeter)} km</td></tr>
              ))}
              {!data.rows.length && <tr><td colSpan="4">집계할 회원이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && <nav className="running-overview-pagination" aria-label="회원별 러닝 현황 페이지">
          <button type="button" className="dashboard-detail-button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
          <span aria-live="polite">{page} / {pageCount}</span>
          <button type="button" className="dashboard-detail-button" disabled={page === pageCount} onClick={() => setPage(page + 1)}>다음</button>
        </nav>}
      </>}
    </section>
  )
}
