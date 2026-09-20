import { useEffect, useRef, useState } from 'react'
import { loadNaverMaps } from '../api/naverMaps'

export default function RunningMap({ detail, mode, alternativeId, segmentIndex, fitVersion, layers, facilityPoints = [], natureSegments = [], actualSegments = [] }) {
  const container = useRef(null)
  const lastFocus = useRef('')
  const [map, setMap] = useState(null)
  const [error, setError] = useState('')

  // 공식 네이버 웹 지도를 사용한다. 인증 실패도 빈 지도 대신 안내한다.
  useEffect(() => {
    let active = true
    let instance
    let resizeObserver
    const authFailed = () => {
      if (active) setError('현재 지도 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    }
    window.addEventListener('runstop:map-auth-error', authFailed)

    loadNaverMaps().then(maps => {
      if (!active) return
      instance = new maps.Map(container.current, {
        center: new maps.LatLng(37.5665, 126.978),
        zoom: 14,
        scrollWheel: false,
        zoomControl: true,
        zoomControlOptions: { position: maps.Position.TOP_LEFT },
        mapTypeControl: false,
      })
      resizeObserver = new ResizeObserver(() => instance.autoResize())
      resizeObserver.observe(container.current)
      setMap(instance)
    }).catch(() => {
      if (active) setError('지도 연결을 확인한 후 다시 시도해 주세요.')
    })

    return () => {
      active = false
      window.removeEventListener('runstop:map-auth-error', authFailed)
      resizeObserver?.disconnect()
      // 인증 실패 시 SDK가 전역 객체까지 해제하므로 다시 호출하지 않는다.
      if (window.naver?.maps) instance?.destroy()
      lastFocus.current = ''
    }
  }, [])

  useEffect(() => {
    if (!map || error) return
    const maps = window.naver.maps
    const overlays = []
    const allPoints = []
    const coordinates = path => path.map(point => new maps.LatLng(point.lat, point.lng))
    const draw = (path, color, dashed = false, weight = 4, opacity = 0.9) => {
      const points = coordinates(path)
      allPoints.push(...points)
      if (points.length < 2) return
      overlays.push(new maps.Polyline({
        map, path: points, strokeColor: color, strokeWeight: weight,
        strokeOpacity: opacity, strokeStyle: dashed ? 'dash' : 'solid',
        strokeLineCap: 'round', strokeLineJoin: 'round', zIndex: overlays.length + 1,
      }))
    }

    // 기본은 실제 주행 하나, 비교할 때만 선택 코스와 다른 후보를 추가한다.
    const alternative = detail.alternatives.find(route => route.idx === alternativeId)
    if (mode === 'compare' && alternative) draw(alternative.path, '#9762BD', true, 3)
    if ((layers ? layers.planned : mode !== 'track') && detail.route) draw(detail.route.path, '#303C87', true, 5, 0.8)
    if (layers ? layers.actual : mode !== 'course') detail.trackPaths.forEach(path => draw(path, '#118A75', false, 5, segmentIndex === null ? 0.95 : 0.35))

    // 주변 환경은 선택한 항목만 추가하며 카메라 범위에는 경로만 사용한다.
    const routeBounds = [...allPoints]
    for (const part of natureSegments) {
      if (layers?.[part.type]) draw(part.path, part.type === 'park' ? '#41a269' : '#2e9ed8', false, 9, .6)
    }
    if (layers?.slope) {
      const sources = [{ path: detail.route?.path || [], mapLayers: detail.route?.featureValues?.mapLayers },
        ...actualSegments.map(s => ({ path: s.path, mapLayers: s.environment?.mapLayers }))]
      sources.forEach(source => source.mapLayers?.slopeSegments?.forEach(part => {
        if (part.slopePct != null) draw(source.path.slice(part.fromIndex, part.toIndex + 1), part.slopePct < 3 ? '#41a269' : part.slopePct < 7 ? '#e7a126' : '#dd5a52', false, 6)
      }))
    }
    const facilityStyles = { toilet: ['WC', '#5866c9'], store: ['편', '#cb6599'], cctv: ['C', '#ab48db'], light: ['등', '#e78421'], security: ['보', '#d04376'] }
    facilityPoints.forEach(point => {
      if (!layers?.[point.type] || !facilityStyles[point.type]) return
      const [label, color] = facilityStyles[point.type]
      overlays.push(new maps.Marker({ map, position: new maps.LatLng(point.lat, point.lng), title: point.name, zIndex: 90,
        icon: { content: `<span style="display:grid;place-items:center;width:24px;height:24px;border:2px solid white;border-radius:50%;background:${color};color:white;font:700 10px sans-serif;box-shadow:0 2px 5px #0004">${label}</span>`,
          size: new maps.Size(28, 28), anchor: new maps.Point(14, 14) },
      }))
    })
    const segment = segmentIndex === null ? null : detail.segments[segmentIndex]
    if (segment) draw(segment.path, '#E87831', false, 5)

    const primaryPaths = layers ? (layers.actual && detail.trackPaths.length ? detail.trackPaths : layers.planned ? [detail.route?.path || []] : [])
      : mode === 'course' ? [detail.route?.path || []] : detail.trackPaths
    const first = primaryPaths.find(path => path.length)?.[0]
    const last = primaryPaths.filter(path => path.length).at(-1)?.at(-1)
    for (const [point, title, color] of [[first, '출발', '#fff'], [last, '도착', '#17204e']]) {
      if (point) overlays.push(new maps.Marker({
        map, position: new maps.LatLng(point.lat, point.lng), title, zIndex: 100,
        icon: {
          content: `<span style="display:block;width:12px;height:12px;box-sizing:border-box;border:2px solid #17204e;border-radius:50%;background:${color}"></span>`,
          size: new maps.Size(12, 12), anchor: new maps.Point(6, 6),
        },
      }))
    }

    // 구간·표시 대상 변경과 전체 보기 요청에만 카메라를 맞춘다.
    const focus = `${detail.sessionIdx}:${mode}:${alternativeId}:${segmentIndex}:${fitVersion}`
    if (lastFocus.current !== focus) {
      const points = segment ? coordinates(segment.path) : routeBounds.length ? routeBounds
        : coordinates([...(detail.route?.path || []), ...detail.trackPaths.flat()])
      if (points.length) map.fitBounds(points, { top: 40, right: 40, bottom: 40, left: 40, maxZoom: 17 })
      lastFocus.current = focus
    }
    return () => {
      if (window.naver?.maps === maps) overlays.forEach(overlay => overlay.setMap(null))
    }
  }, [map, error, detail, mode, alternativeId, segmentIndex, fitVersion, layers, facilityPoints, natureSegments, actualSegments])

  return <div className="run-map-shell">
    <div className="run-map" ref={container} aria-label="네이버 지도에서 추천 코스와 실제 주행 비교" />
    {(!map || error) && <div className="run-map-message" role={error ? 'alert' : 'status'}>
      <strong>{error ? '지도를 불러오지 못했어요' : '네이버 지도를 불러오는 중…'}</strong>
      {error && <><p>{error}</p><button className="run-button" onClick={() => window.location.reload()}>다시 불러오기</button></>}
    </div>}
  </div>
}
