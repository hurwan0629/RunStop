import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActivityRuns, getRequests } from '../api/explorerApi'
import { Pagination, RequestsTable, RunsTable } from './ExplorerUI'

export default function ActivityList({ userIdx, kind = 'requests', compact = false }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const load = kind === 'requests' ? getRequests : getActivityRuns
    load({ ...(userIdx && { userIdx }), page }, controller.signal).then(data => {
      if (!controller.signal.aborted) { setResult(data); setError('') }
    }).catch(() => { if (!controller.signal.aborted) setError('활동 목록을 불러오지 못했습니다.') })
    return () => controller.abort()
  }, [userIdx, kind, page])
  const base = kind === 'requests' ? '/requests' : '/running'
  return <section className="run-card"><div className="run-section-heading">
    <h2>{kind === 'requests' ? '추천 요청' : '러닝 기록'}</h2><Link to={`${base}${userIdx ? `?userIdx=${userIdx}` : ''}`}>전체 보기 →</Link>
  </div>
    {error ? <p role="alert">{error}</p> : !result ? <p role="status">목록을 불러오는 중…</p> : <>
      {kind === 'requests' ? <RequestsTable items={compact ? result.items.slice(0, 5) : result.items} /> : <RunsTable items={result.items} />}
      {!compact && <Pagination page={page} hasMore={result.hasMore} onChange={next => { setResult(null); setPage(next) }} />}
    </>}
  </section>
}
