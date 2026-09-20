import { useEffect, useRef, useState } from 'react'
import { getRequest as getRouteRequest } from '../api/explorerApi'

import { Link } from 'react-router-dom'
import { requestRows, candidateRows } from '../utils/explorer'

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
    .map((route, index) => ({ route, request: group.request, label: `후보 ${index + 1}`,
      rows: [...requestRows(group.request), ...candidateRows(route, group.request)] })))

  return <section className="run-card">
    <div className="run-section-heading"><div><h2>요청 조건과 후보 비교</h2>
      <p>요청 #{detail.request?.idx ?? '—'}</p></div></div>
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
        <Link to={`/requests/${request?.idx}/candidates/${route.idx}`}>REQ-{request?.idx} · {label}</Link>
        {(route.idx === request?.selectedRecommendationIdx) && <span className="run-tag">사용자 선택</span>}
      </th>)}</tr></thead>
      <tbody>{columns[0]?.rows.map(([label], index) => <tr key={`${index}:${label}`}><th scope="row">{index === 0 && <small>요청 조건 · </small>}{index === requestRows(detail.request).length && <small>추천 결과 · </small>}{label}</th>
        {columns.map(column => <td key={`${column.request?.idx}:${column.route.idx}`}>{column.rows[index][1]}</td>)}
      </tr>)}</tbody>
    </table></div>
  </section>
}
