import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRuns, period } from '../api/runningApi'
import './RunningPage.css'

const statusLabels = { COMPLETED: '완료', IN_PROGRESS: '진행 중', STOPPED: '중단', CANCELLED: '취소', FAILED: '실패' }

export default function RunningPage() {
  const [params, setParams] = useSearchParams()
  const range = period(30)
  const from = params.get('from') || range.from
  const to = params.get('to') || range.to
  const userIdx = params.get('userIdx') || ''
  const page = Number(params.get('page')) || 1
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getRuns({ from, to, page, ...(userIdx && { userIdx }) }, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult(data); setError('') } })
      .catch(error => {
        if (!controller.signal.aborted) setError(error.response?.data?.error?.message || '러닝 목록을 불러오지 못했습니다.')
      })
    return () => controller.abort()
  }, [from, to, page, userIdx])

  const update = changes => {
    setResult(null)
    setError('')
    setParams(Object.fromEntries(Object.entries({ from, to, ...(userIdx && { userIdx }), ...changes })
      .filter(([, value]) => value !== undefined && value !== '')))
  }

  return <main className="running-page">
    <header className="run-page-title">
      <h1>러닝 기록</h1>
      <p>회원의 실제 이동 경로와 추천 코스를 확인하세요.</p>
    </header>
    <form className="run-filters" onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      update({ from: data.get('from'), to: data.get('to'), userIdx: data.get('userIdx') || undefined })
    }} key={`${from}:${to}:${userIdx}`}>
      <label>시작일<input name="from" type="date" defaultValue={from} required /></label>
      <label>종료일<input name="to" type="date" defaultValue={to} required /></label>
      <label>회원 번호<input name="userIdx" type="number" min="1" defaultValue={userIdx} placeholder="전체 회원" /></label>
      <button type="submit">기록 조회</button>
    </form>
    {error ? <p role="alert">{error}</p> : !result ? <p role="status">조회 중…</p> : <>
      <div className="run-table-wrap"><table className="run-table">
        <thead><tr><th>러닝</th><th>사용자</th><th>시작 시각 (KST)</th><th>선택한 코스</th><th>거리</th><th>상태</th></tr></thead>
        <tbody>{result.items.map(run => <tr key={run.sessionIdx}>
          <td><Link to={`/running/${run.sessionIdx}`}>#{run.sessionIdx} 지도 보기</Link></td>
          <td><Link to={`/users/${run.userIdx}`}>{run.nickname}</Link></td>
          <td>{new Date(run.startedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
          <td>{run.routeName || '코스 정보 없음'}</td>
          <td>{run.distance == null ? '—' : `${(run.distance / 1000).toFixed(2)}km`}</td>
          <td><span className={`run-status ${run.status === 'COMPLETED' ? 'complete' : ''}`}>{statusLabels[run.status] || run.status}</span></td>
        </tr>)}</tbody>
      </table>
      {!result.items.length && <p className="run-empty">해당 기간의 러닝이 없습니다. 조회 기간을 변경해 보세요.</p>}
      </div>
      <div className="run-pagination">
        <button className="run-button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>이전</button>
        <span>{page}페이지</span>
        <button className="run-button" disabled={!result.hasMore} onClick={() => update({ page: String(page + 1) })}>다음</button>
      </div>
    </>}
  </main>
}
