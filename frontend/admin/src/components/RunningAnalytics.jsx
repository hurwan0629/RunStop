import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnalytics, period } from '../api/runningApi'
import '../pages/RunningPage.css'

const metrics = { runs: '러닝 횟수', completed: '완료 횟수', distance: '완료 러닝 거리 (km)', requests: '저장된 추천 요청', selected: '선택된 추천 요청' }

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
  const x = index => 50 + index * 840 / Math.max(1, days.length - 1)
  const y = value => 210 - value * 170 / maximum
  const openDay = day => navigate(`/running?from=${day.date}&to=${day.date}`)
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
        <polyline points={values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} fill="none" stroke="#6652BB" strokeWidth="3" />
        {days.map((day, index) => <circle key={day.date} cx={x(index)} cy={y(values[index])} r={hover === index ? 7 : 4}
          fill="#6652BB" tabIndex="0" role="button" aria-label={`${day.date}: ${values[index].toFixed(1)}. 러닝 목록 보기`}
          onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onClick={() => openDay(day)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDay(day) } }}>
          <title>{day.date}: {values[index].toFixed(1)}</title>
        </circle>)}
        <text x="50" y="240" fill="#687286" fontSize="12">{range.from}</text>
        <text x="890" y="240" textAnchor="end" fill="#687286" fontSize="12">{range.to}</text>
      </svg>
      {current && <p aria-live="polite">{current.date} · 러닝 {current.runs}회 · 완료 {current.completed}회 · 추천 {current.requests}건 · 선택 {current.selected}건</p>}
      <p className="run-legend">한국 시간 기준. 러닝은 시작일 기준이며, 추천 선택은 해당 기간 요청의 현재 선택 상태입니다. 저장되지 않는 추천 실패는 집계하지 않습니다.</p>
    </>}
  </section>
}
