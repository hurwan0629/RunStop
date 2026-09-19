import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const colors = ['#9855C4', '#C98613']
const coordinates = path => path.map(p => [p.lat, p.lng])

export default function RunningMap({ detail, visibleAlternatives, segmentIndex }) {
  const container = useRef(null)
  const map = useRef(null)
  const lastFocus = useRef('')

  useEffect(() => {
    const instance = L.map(container.current).setView([37.5665, 126.978], 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance)
    map.current = instance
    return () => { instance.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (!map.current) return
    const group = L.featureGroup().addTo(map.current)
    const allPoints = []
    const draw = (path, color, label, dashed = false, weight = 5) => {
      const points = coordinates(path)
      allPoints.push(...points)
      if (points.length < 2) return
      // 시설·코스 이름은 HTML로 해석하지 않고 텍스트로 넣는다.
      const caption = document.createElement('span')
      caption.textContent = label
      L.polyline(points, { color, weight, opacity: 0.9, dashArray: dashed ? '8 7' : undefined })
        .bindTooltip(caption).addTo(group)
    }

    detail.alternatives.forEach((route, index) => {
      if (visibleAlternatives.includes(route.idx)) draw(route.path, colors[index % colors.length], route.name, true)
    })
    if (detail.route) draw(detail.route.path, '#191970', '선택한 코스', false, 7)
    detail.trackPaths.forEach(path => draw(path, '#159E86', '실제 주행'))
    const segment = segmentIndex === null ? null : detail.segments[segmentIndex]
    if (segment) draw(segment.path, '#F06D24', '선택한 주행 구간', false, 9)

    // 후보 표시 토글은 사용자가 옮겨 둔 지도를 초기화하지 않는다.
    const focus = `${detail.sessionIdx}:${segmentIndex}`
    if (lastFocus.current !== focus) {
      const points = segment ? coordinates(segment.path) : allPoints
      if (points.length) map.current.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 17 })
      lastFocus.current = focus
    }
    return () => group.remove()
  }, [detail, visibleAlternatives, segmentIndex])

  return <div className="run-map" ref={container} aria-label="추천 코스와 실제 주행 비교 지도" />
}
