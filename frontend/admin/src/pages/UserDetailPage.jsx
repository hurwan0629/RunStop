import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminUserDetail } from '../api/usersApi'
import { getUserActivity } from '../api/explorerApi'
import { Badge, Breadcrumb, Metrics } from '../components/ExplorerUI'
import ActivityList from '../components/ActivityList'
import UserDetailDrawer from '../components/UserDetailDrawer'
import { dateTime, distance } from '../utils/explorer'

export default function UserDetailPage() {
  const { userIdx } = useParams()
  const [detail, setDetail] = useState(null)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getAdminUserDetail(userIdx).then(data => {
      if (!controller.signal.aborted) { setDetail(data); setError(null) }
    }).catch(() => { if (!controller.signal.aborted) setError({ userIdx, message: '회원 정보를 불러오지 못했습니다.' }) })
    getUserActivity(userIdx, controller.signal).then(data => {
      if (!controller.signal.aborted) setActivity({ ...data, userIdx })
    }).catch(() => { /* 기본 회원 정보와 활동 목록은 별도로 조회한다. */ })
    return () => controller.abort()
  }, [userIdx, refresh])

  if (error?.userIdx === userIdx) return <main className="running-page"><Link to="/users">← 회원 관리</Link><p role="alert">{error.message}</p></main>
  if (detail?.user.userIdx !== Number(userIdx)) return <main className="running-page"><p role="status">회원 정보를 불러오는 중…</p></main>
  const { user, runningSummary, recentInquiries, adminMemo } = detail
  const summary = activity?.userIdx === userIdx ? activity : null

  return <main className="running-page">
    <Breadcrumb items={[[ '회원 관리', '/users' ], [user.nickname]]} />
    <header className="run-detail-header"><div><p className="run-eyebrow">회원 {user.userIdx}</p><h1>{user.nickname}</h1><p>{user.loginId}</p></div>
      <div className="explorer-heading-links"><Badge status={user.status} /><button className="run-button" onClick={() => setEditing(true)}>계정 관리</button></div>
    </header>
    <section className="run-summary">{[
      ['완료한 러닝', `${runningSummary.completedRunCount}회`], ['누적 러닝 거리', distance(runningSummary.totalDistanceMeter)],
      ['추천 요청', summary ? `${summary.requestCount}건` : '—'], ['최근 러닝', dateTime(summary?.lastRunAt)],
    ].map(([label, value]) => <div className="run-summary-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="run-card explorer-conditions"><h2>회원 정보</h2><Metrics rows={[
      ['전화번호', user.phoneNumber || '—'], ['가입일', dateTime(user.joinedAt)], ['최근 접속', dateTime(user.lastLoginAt)],
      ['누적 경험치', `${user.totalExp.toLocaleString()} EXP`], ...(user.suspendedUntil ? [['정지 종료일', dateTime(user.suspendedUntil)]] : []),
    ]} /></section>
    <ActivityList key={`requests:${userIdx}`} userIdx={userIdx} /><ActivityList key={`runs:${userIdx}`} userIdx={userIdx} kind="runs" />
    <section className="run-card"><div className="run-section-heading"><h2>최근 문의</h2><Link to="/inquiries">문의 관리 →</Link></div>
      {recentInquiries.length ? recentInquiries.map(inquiry => <Link className="run-alternative" to={`/inquiries?inquiryIdx=${inquiry.inquiryIdx}`} key={inquiry.inquiryIdx}>
        <span><strong>{inquiry.title}</strong><small>{dateTime(inquiry.createdAt)}</small></span><Badge status={inquiry.status} /></Link>) : <p className="run-muted">등록된 문의가 없습니다.</p>}
    </section>
    <section className="run-card"><h2>관리자 메모</h2><p>{adminMemo || '등록된 메모가 없습니다.'}</p></section>
    {editing && <UserDetailDrawer userIdx={userIdx} onClose={() => setEditing(false)} onUpdated={() => setRefresh(n => n + 1)} />}
  </main>
}
