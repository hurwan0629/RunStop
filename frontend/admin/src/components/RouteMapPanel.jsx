import { useState } from 'react'
import RunningMap from './RunningMap'
import { Metrics } from './ExplorerUI'
import { distance, duration, number, pace, plannedSegments } from '../utils/explorer'

const layerOptions = [
  ['planned', '추천 경로', '#303c87'], ['actual', '실제 이동 경로', '#118a75'],
  ['park', '공원', '#41a269'], ['water', '하천', '#2e9ed8'], ['slope', '경사', '#e87831'],
  ['toilet', '화장실', '#5866c9'], ['store', '편의점', '#cb6599'], ['cctv', 'CCTV', '#ab48db'],
  ['light', '가로등', '#e78421'], ['security', '보안등', '#d04376'],
]

export default function RouteMapPanel({ route, run }) {
  const [layers, setLayers] = useState({ planned: true, actual: true })
  const [segmentIndex, setSegmentIndex] = useState(null)
  const [fitVersion, setFitVersion] = useState(0)
  const [segmentSource, setSegmentSource] = useState('actual')
  const hasActual = Boolean(run?.trackPaths?.length)
  const actualSegments = run?.segments || []
  const showActual = hasActual && segmentSource === 'actual'
  const segments = showActual ? actualSegments : plannedSegments(route)
  const selected = segments[segmentIndex]
  const features = route?.featureValues || {}
  // 실제 GPS 구간별 환경도 함께 표시하되 같은 시설은 좌표·유형으로 한 번만 표시한다.
  const environments = [features, ...actualSegments.map(s => s.environment).filter(Boolean)]
  const points = [...new Map(environments.flatMap(e => e.facilityPoints || [])
    .map(p => [`${p.type}:${p.lat}:${p.lng}`, p])).values()]
  const nature = environments.flatMap(e => e.mapLayers?.natureSegments || [])
  const available = {
    planned: Boolean(route?.path?.length > 1), actual: hasActual,
    park: nature.some(s => s.type === 'park'), water: nature.some(s => s.type === 'water'),
    slope: Boolean(features.mapLayers?.slopeSegments?.some(s => s.slopePct != null)
      || actualSegments.some(s => s.environment?.mapLayers?.slopeSegments?.some(p => p.slopePct != null))),
    ...Object.fromEntries(['toilet', 'store', 'cctv', 'light', 'security'].map(type => [type, points.some(p => p.type === type)])),
  }
  const detail = { sessionIdx: run?.sessionIdx ?? `route-${route?.idx}`, route, alternatives: [], trackPaths: run?.trackPaths || [], segments }
  const selectSegment = index => {
    setSegmentIndex(index === segmentIndex ? null : index)
    setLayers(current => ({ ...current, [showActual ? 'actual' : 'planned']: true }))
  }

  return <>
    <div className="explorer-map-layout">
      <section className="run-card run-map-card">
        <div className="run-section-heading"><div><h2>경로 지도</h2><p>추천 경로와 실제 이동 경로를 비교하세요.</p></div>
          <button className="run-button" onClick={() => { setSegmentIndex(null); setFitVersion(n => n + 1) }}>전체 경로 보기</button></div>
        <RunningMap detail={detail} mode="compare" segmentIndex={segmentIndex} fitVersion={fitVersion}
          layers={layers} facilityPoints={points} natureSegments={nature} actualSegments={actualSegments} />
        <div className="run-map-footer"><div className="run-map-legend">
          {available.planned && layers.planned && <span><i className="course" />추천 경로</span>}
          {available.actual && layers.actual && <span><i className="track" />실제 이동 경로</span>}
          {selected && <span><i className="segment" />선택 구간</span>}
        </div>{layers.slope && <p>경사: 초록 3% 미만 · 주황 3–7% · 빨강 7% 이상</p>}
          {!available.planned && !available.actual && <p>표시할 경로가 없습니다.</p>}</div>
      </section>
      <aside className="run-card explorer-layers"><h2>지도 표시</h2>
        {layerOptions.filter(([key]) => available[key]).map(([key, label, color]) => <label key={key}>
          <input type="checkbox" checked={Boolean(layers[key])} onChange={event => {
            setLayers({ ...layers, [key]: event.target.checked })
            if (!event.target.checked && key === (showActual ? 'actual' : 'planned')) setSegmentIndex(null)
          }} /><i style={{ background: color }} />{label}
          {['toilet', 'store', 'cctv', 'light', 'security'].includes(key) && <span className="explorer-layer-count">{points.filter(p => p.type === key).length}개</span>}
        </label>)}
      </aside>
    </div>

    <section className="run-card">
      <div className="run-section-heading"><div><h2>구간 분석</h2><p>{showActual ? '실제 달린 구간의 기록' : '추천 코스의 거리와 경사'}</p></div>
        {hasActual && route && <div className="run-mode-switch">{[['actual', '실제 러닝'], ['planned', '추천 코스']].map(([key, label]) => <button key={key}
          aria-pressed={segmentSource === key} onClick={() => { setSegmentSource(key); setSegmentIndex(null) }}>{label}</button>)}</div>}
      </div>
      <div className="run-segment-layout">
        <div className="run-segments">{segments.map((part, index) => <button key={index} aria-pressed={segmentIndex === index} className={segmentIndex === index ? 'active' : ''} onClick={() => selectSegment(index)}>
          <span className="run-segment-number">{index + 1}</span><span><strong>{distance(part.distanceFrom)} → {distance(part.distanceTo)}</strong>
            <small>{showActual ? duration(part.durationSeconds) : `평균 경사 ${number(part.environment?.slope?.avgSlopePct, '%')}`}</small></span>
          {showActual && <span>{pace(part.pace)}</span>}
        </button>)}{!segments.length && <p className="run-empty">구간 기록이 없습니다.</p>}</div>
        <div className="run-environment" aria-live="polite"><h3>{selected ? `${segmentIndex + 1}번 구간` : '구간을 선택하세요'}</h3>
          {selected ? <Metrics rows={[
            ['구간 거리', distance(selected.distanceTo - selected.distanceFrom)],
            ...(showActual ? [['소요 시간', duration(selected.durationSeconds)], ['평균 페이스', pace(selected.pace)]] : []),
            ['평균 경사', number(selected.environment?.slope?.avgSlopePct, '%')],
            ...['toilet', 'store', 'cctv', 'security', 'light'].filter(type => selected.environment?.facilityPoints?.some(p => p.type === type)).map(type => [
              layerOptions.find(([key]) => key === type)[1], `${selected.environment.facilityPoints.filter(p => p.type === type).length}개`,
            ]),
          ]} /> : <p>구간을 누르면 지도에 해당 부분이 강조됩니다.</p>}
        </div>
      </div>
      {showActual && segments.length > 0 && <><h3>구간별 페이스</h3><div className="explorer-pace-bars">
        {segments.map((part, index) => <button key={index} title={`${index + 1}번 구간 · ${pace(part.pace)}`} aria-label={`${index + 1}번 구간 · ${pace(part.pace)}`}
          aria-pressed={segmentIndex === index} style={{ height: `${Math.max(20, part.pace / Math.max(...segments.map(s => s.pace)) * 100)}%` }} onClick={() => selectSegment(index)}>
          <span>{index + 1}</span></button>)}
      </div></>}
    </section>
  </>
}
