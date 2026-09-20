import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRequests } from '../api/explorerApi'
import { Pagination, RequestsTable } from '../components/ExplorerUI'

export default function RequestsPage() {
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const page = Number(params.get('page')) || 1
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getRequests(Object.fromEntries(new URLSearchParams(key)), controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult({ key, ...data }); setError(null) } })
      .catch(() => { if (!controller.signal.aborted) setError({ key, message: '추천 요청을 불러오지 못했습니다.' }) })
    return () => controller.abort()
  }, [key])

  return <main className="running-page">
    <header className="run-page-title"><h1>추천 요청</h1><p>요청 조건부터 후보 비교, 사용자의 선택까지 확인하세요.</p></header>
    {params.get('userIdx') && <Link to={`/users/${params.get('userIdx')}`}>회원 정보로 이동 →</Link>}
    <form className="run-filters" key={key} onSubmit={event => {
      event.preventDefault()
      setParams(Object.fromEntries([...new FormData(event.currentTarget)].filter(([, value]) => value !== '')))
    }}>
      <label>요청·회원 검색<input name="keyword" defaultValue={params.get('keyword') || ''} placeholder="요청 번호 또는 회원 이름" maxLength={100} /></label>
      <label>코스 유형<select name="routeType" defaultValue={params.get('routeType') || ''}><option value="">전체 유형</option><option value="LOOP">순환</option><option value="ONE_WAY">편도</option><option value="ROUND_TRIP">왕복</option></select></label>
      <label>선택 여부<select name="selection" defaultValue={params.get('selection') || ''}><option value="">전체</option><option value="SELECTED">사용자 선택</option><option value="UNSELECTED">선택 전</option></select></label>
      <label>시작일<input name="from" type="date" defaultValue={params.get('from') || ''} /></label>
      <label>종료일<input name="to" type="date" defaultValue={params.get('to') || ''} /></label>
      {params.get('userIdx') && <input type="hidden" name="userIdx" value={params.get('userIdx')} />}
      <button>검색</button><button type="button" onClick={() => setParams({})}>초기화</button>
    </form>
    {error?.key === key ? <p role="alert">{error.message}</p> : result?.key !== key ? <p role="status">요청을 불러오는 중…</p> : <>
      <RequestsTable items={result.items} /><Pagination page={page} hasMore={result.hasMore} onChange={value => setParams({ ...Object.fromEntries(params), page: value })} />
    </>}
  </main>
}
