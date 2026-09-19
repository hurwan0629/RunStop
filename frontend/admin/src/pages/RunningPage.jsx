import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRuns, period } from '../api/runningApi'
import './RunningPage.css'

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
    <h1>러닝 기록</h1>
    <p>러닝을 선택하면 선택한 코스·실제 주행·같이 추천된 다른 코스를 비교할 수 있습니다.</p>
    <form className="run-filters" onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      update({ from: data.get('from'), to: data.get('to'), userIdx: data.get('userIdx') || undefined })
    }} key={`${from}:${to}:${userIdx}`}>
      <label>시작일<input name="from" type="date" defaultValue={from} required /></label>
      <label>종료일<input name="to" type="date" defaultValue={to} required /></label>
      <label>회원 번호<input name="userIdx" type="number" min="1" defaultValue={userIdx} placeholder="전체 회원" /></label>
      <button>조회</button>
    </form>
    {error ? <p role="alert">{error}</p> : !result ? <p role="status">조회 중…</p> : <>
      <table className="run-table">
        <thead><tr><th>러닝</th><th>사용자</th><th>시작 시각 (KST)</th><th>선택한 코스</th><th>거리</th><th>상태</th></tr></thead>
        <tbody>{result.items.map(run => <tr key={run.sessionIdx}>
          <td><Link to={`/running/${run.sessionIdx}`}>#{run.sessionIdx} 지도 보기</Link></td>
          <td><Link to={`/users/${run.userIdx}`}>{run.nickname}</Link></td>
          <td>{new Date(run.startedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
          <td>{run.routeName || '코스 정보 없음'}</td>
          <td>{run.distance == null ? '—' : `${(run.distance / 1000).toFixed(2)}km`}</td>
          <td>{run.status}</td>
        </tr>)}</tbody>
      </table>
      {!result.items.length && <p>해당 기간의 러닝이 없습니다.</p>}
      <div className="run-filters">
        <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>이전</button>
        <span>{page}페이지</span>
        <button disabled={!result.hasMore} onClick={() => update({ page: String(page + 1) })}>다음</button>
      </div>
    </>}
  </main>
}
