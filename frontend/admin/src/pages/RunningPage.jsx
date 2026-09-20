import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { period } from '../api/runningApi'
import { getActivityRuns as getRuns } from '../api/explorerApi'
import { RunsTable } from '../components/ExplorerUI'
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
      <RunsTable items={result.items} />
      <div className="run-pagination">
        <button className="run-button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>이전</button>
        <span>{page}페이지</span>
        <button className="run-button" disabled={!result.hasMore} onClick={() => update({ page: String(page + 1) })}>다음</button>
      </div>
    </>}
  </main>
}
