import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnalytics, period } from '../api/runningApi'
import '../pages/RunningPage.css'

const metrics = { runs: '러닝 횟수', completed: '완료 횟수', distance: '완료 러닝 거리 (km)', requests: '추천 요청', selected: '선택된 추천 요청' }

export default function RunningAnalytics() {
  const navigate = useNavigate()
  const [range, setRange] = useState(() => period(30))
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState('runs')
  const [hover, setHover] = useState(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getAnalytics(range, controller.signal).then(result => {
      if (!controller.signal.aborted) { setData(result); setError('') }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.response?.data?.error?.message || '기간 통계를 불러오지 못했습니다.')
    })
    return () => controller.abort()
  }, [range, refresh])

  const changeRange = value => { setData(null); setHover(null); setError(''); setRange(value) }
  const days = data?.days || []
  const total = key => days.reduce((sum, day) => sum + Number(day[key]), 0)
  const values = days.map(day => Number(day[metric]) / (metric === 'distance' ? 1000 : 1))
  const maximum = Math.max(1, ...values)
  const step = 840 / Math.max(1, days.length)
  const x = index => 50 + (index + .5) * step
  const y = value => 210 - value * 170 / maximum
  const openDay = day => navigate(`${['requests', 'selected'].includes(metric) ? '/requests' : '/running'}?from=${day.date}&to=${day.date}${metric === 'selected' ? '&selection=SELECTED' : ''}`)
  const current = days[hover] || days[days.length - 1]

  return <section className="run-card">
    <h2>러닝과 코스 선택 추이</h2>
    <form className="run-filters" key={`${range.from}:${range.to}`} onSubmit={event => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      changeRange({ from: form.get('from'), to: form.get('to') })
    }}>
      <button type="button" onClick={() => changeRange(period(7))}>최근 7일</button>
      <button type="button" onClick={() => changeRange(period(30))}>최근 30일</button>
      <label>시작일<input type="date" name="from" defaultValue={range.from} required /></label>
      <label>종료일<input type="date" name="to" defaultValue={range.to} required /></label>
      <button>기간 적용</button>
      <button type="button" onClick={() => { setData(null); setError(''); setRefresh(n => n + 1) }}>새로고침</button>
    </form>
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">통계 조회 중…</p> : <>
      <div className="run-chart-stats">
        <div>러닝 횟수<strong>{total('runs')}회</strong></div>
        <div>완료율<strong>{total('runs') ? `${(total('completed') / total('runs') * 100).toFixed(1)}%` : '—'}</strong></div>
        <div>완료 러닝 거리<strong>{(total('distance') / 1000).toFixed(1)}km</strong></div>
        <div>추천 선택<strong>{total('selected')} / {total('requests')}</strong></div>
      </div>
      <div className="run-filters"><label>그래프 항목<select value={metric} onChange={event => setMetric(event.target.value)}>
        {Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label></div>
      <svg className="run-chart" viewBox="0 0 940 250" role="img" aria-label={`${metrics[metric]} 일별 그래프. 날짜를 선택하면 러닝 목록으로 이동합니다.`}>
        {[0, .5, 1].map(ratio => <g key={ratio}>
          <line x1="50" x2="890" y1={y(maximum * ratio)} y2={y(maximum * ratio)} stroke="#e4e5ec" />
          <text x="42" y={y(maximum * ratio) + 4} textAnchor="end" fontSize="12" fill="#687286">{(maximum * ratio).toFixed(metric === 'distance' ? 1 : 0)}</text>
        </g>)}
        {days.map((day, index) => <rect key={day.date} x={x(index) - step * .33} y={y(values[index])} width={step * .66}
          height={Math.max(2, 210 - y(values[index]))} rx="5"
          fill={hover === index ? '#493495' : '#9b8bd3'} tabIndex="0" role="button" aria-label={`${day.date}: ${values[index].toFixed(1)}. 기록 목록 보기`}
          onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onClick={() => openDay(day)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDay(day) } }}>
          <title>{day.date}: {values[index].toFixed(1)}</title>
        </rect>)}
        <text x="50" y="240" fill="#687286" fontSize="12">{range.from}</text>
        <text x="890" y="240" textAnchor="end" fill="#687286" fontSize="12">{range.to}</text>
      </svg>
      {current && <p aria-live="polite">{current.date} · 러닝 {current.runs}회 · 거리 {(Number(current.distance) / 1000).toFixed(2)} km · 추천 {current.requests}건 · 선택 {current.selected}건</p>}
      <p className="run-legend">한국 시간 기준 · 그래프의 날짜를 선택하면 해당 기간의 기록으로 이동합니다.</p>
    </>}
  </section>
}
