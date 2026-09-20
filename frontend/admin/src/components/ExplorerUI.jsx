import { Link, useNavigate } from 'react-router-dom'
import { dateTime, distance, duration, elapsed, pace, routeLabels, rowAction } from '../utils/explorer'
import '../pages/RunningPage.css'
import './Explorer.css'

const statuses = { COMPLETED: '완료', IN_PROGRESS: '진행 중', STOPPED: '중단', CANCELLED: '취소', FAILED: '실패', ENABLED: '정상', SUSPENDED: '이용 정지', WITHDRAWN: '탈퇴', SELECTED: '사용자 선택', UNSELECTED: '선택 전', READY: '추천 완료', EMPTY: '후보 없음', PENDING: '답변 대기', ANSWERED: '답변 완료' }
export function Badge({ status }) {
  return <span className={`explorer-badge ${['COMPLETED', 'ENABLED', 'SELECTED', 'READY', 'ANSWERED'].includes(status) ? 'positive' : ['FAILED', 'SUSPENDED'].includes(status) ? 'warning' : ''}`}>{statuses[status] || '—'}</span>
}

export function Breadcrumb({ items }) {
  return <nav className="explorer-breadcrumb" aria-label="현재 위치">{items.map(([label, to], index) => <span key={`${label}:${index}`}>
    {index > 0 && <b aria-hidden="true">›</b>}{to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}
  </span>)}</nav>
}

export function Metrics({ rows }) {
  return <dl className="explorer-metrics">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

export function ClickRow({ to, children }) {
  const navigate = useNavigate()
  return <tr className="explorer-row" tabIndex={0} onClick={event => rowAction(event, () => navigate(to))}
    onKeyDown={event => rowAction(event, () => navigate(to))}>{children}</tr>
}

export function RequestsTable({ items }) {
  return <div className="run-table-wrap"><table className="run-table"><thead><tr>
    <th>요청</th><th>회원</th><th>요청 시각</th><th>목표 거리</th><th>코스 유형</th><th>추천 결과</th><th>사용자 선택</th>
  </tr></thead><tbody>{items.map(q => <ClickRow key={q.idx} to={`/requests/${q.idx}`}>
    <td><Link to={`/requests/${q.idx}`}>REQ-{q.idx}</Link></td><td><Link to={`/users/${q.userIdx}`}>{q.nickname}</Link></td>
    <td>{dateTime(q.createdAt)}</td><td>{distance(q.elementConditions?.targetDistance)}</td><td>{routeLabels[q.routeType] || '—'}</td>
    <td><Badge status={q.candidateCount ? 'READY' : 'EMPTY'} /> <small>{q.candidateCount}개</small></td>
    <td><Badge status={q.selectedRecommendationIdx ? 'SELECTED' : 'UNSELECTED'} /></td>
  </ClickRow>)}</tbody></table>{!items.length && <p className="run-empty">추천 요청이 없습니다.</p>}</div>
}

export function RunsTable({ items }) {
  return <div className="run-table-wrap"><table className="run-table"><thead><tr>
    <th>러닝</th><th>회원</th><th>시작 시각</th><th>거리</th><th>소요 시간</th><th>평균 페이스</th><th>추천 코스</th><th>상태</th>
  </tr></thead><tbody>{items.map(run => <ClickRow key={run.sessionIdx} to={`/running/${run.sessionIdx}`}>
    <td><Link to={`/running/${run.sessionIdx}`}>RUN-{run.sessionIdx}</Link></td><td><Link to={`/users/${run.userIdx}`}>{run.nickname}</Link></td>
    <td>{dateTime(run.startedAt)}</td><td>{distance(run.distance)}</td><td>{duration(elapsed(run))}</td><td>{pace(run.averagePace)}</td>
    <td>{run.requestIdx ? <Link to={`/requests/${run.requestIdx}/candidates/${run.routeIdx}`}>{run.routeName || '추천 코스'}</Link> : '일반 러닝'}</td>
    <td><Badge status={run.status} /></td>
  </ClickRow>)}</tbody></table>{!items.length && <p className="run-empty">러닝 기록이 없습니다.</p>}</div>
}

export function Pagination({ page, hasMore, onChange }) {
  return <nav className="run-pagination" aria-label="페이지 이동"><button className="run-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>이전</button>
    <span>{page}페이지</span><button className="run-button" disabled={!hasMore} onClick={() => onChange(page + 1)}>다음</button></nav>
}
