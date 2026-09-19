import { useEffect, useRef, useState } from 'react'
import { loadNaverMaps } from '../api/naverMaps'

export default function RunningMap({ detail, mode, alternativeId, segmentIndex, fitVersion }) {
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
      if (active) setError('네이버 지도 인증을 확인해 주세요. 웹 지도 사용 설정과 서비스 URL 등록이 필요합니다.')
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
    }).catch(error => {
      if (active) setError(error.message)
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
    if (mode !== 'track' && detail.route) draw(detail.route.path, '#303C87', mode === 'compare', 4, mode === 'compare' ? 0.65 : 0.95)
    if (mode !== 'course') detail.trackPaths.forEach(path => draw(path, '#118A75', false, 4, segmentIndex === null ? 0.95 : 0.35))
    const segment = segmentIndex === null ? null : detail.segments[segmentIndex]
    if (segment) draw(segment.path, '#E87831', false, 5)

    const primaryPaths = mode === 'course' ? [detail.route?.path || []] : detail.trackPaths
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
      const points = segment ? coordinates(segment.path) : allPoints
      if (points.length) map.fitBounds(points, { top: 40, right: 40, bottom: 40, left: 40, maxZoom: 17 })
      lastFocus.current = focus
    }
    return () => {
      if (window.naver?.maps === maps) overlays.forEach(overlay => overlay.setMap(null))
    }
  }, [map, error, detail, mode, alternativeId, segmentIndex, fitVersion])

  return <div className="run-map-shell">
    <div className="run-map" ref={container} aria-label="네이버 지도에서 추천 코스와 실제 주행 비교" />
    {(!map || error) && <div className="run-map-message" role={error ? 'alert' : 'status'}>
      <strong>{error ? '지도를 불러오지 못했어요' : '네이버 지도를 불러오는 중…'}</strong>
      {error && <><p>{error}</p><button className="run-button" onClick={() => window.location.reload()}>다시 불러오기</button></>}
    </div>}
  </div>
}
