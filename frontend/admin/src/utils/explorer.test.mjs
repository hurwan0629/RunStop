import test from 'node:test'
import assert from 'node:assert/strict'
import { candidateRows, requestRows, plannedSegments, duration, rowAction } from './explorer.js'

test('요청 조건을 한글화하고 과거 기록의 결측값과 실제 0을 구분한다', () => {
  const request = { routeType: 'LOOP', elementConditions: { targetDistance: 5000, slopePreference: 'NORMAL', facilityPreferences: { toilet: 'PREFER', store: 'IGNORE' } } }
  const rows = Object.fromEntries(requestRows(request))
  assert.equal(rows['경사'], '약간 경사짐')
  assert.equal(rows['화장실'], '선호')
  assert.equal(rows['편의점'], '상관없음')
  const route = { totalDistance: 5500, score: 0, featureValues: { toilet_count: 0, nature: { waterRatio: .12 } } }
  const original = JSON.stringify(route)
  const features = Object.fromEntries(candidateRows(route, request))
  assert.equal(features['목표 거리 차이'], '10%')
  assert.equal(features['화장실'], '0개')
  assert.equal(features['CCTV'], '—')
  assert.equal(features['하천 인접률'], '12%')
  assert.equal(features['조건 평가 점수'], '0')
  assert.equal(JSON.stringify(route), original)
})

test('추천 구간은 좌표 인덱스와 경사를 보존하고 실제 시간과 페이스를 만들지 않는다', () => {
  const path = [{ lat: 0, lng: 0 }, { lat: 0, lng: .01 }, { lat: 0, lng: .02 }]
  const route = { path, featureValues: { mapLayers: { slopeSegments: [
    { fromIndex: 0, toIndex: 1, slopePct: 2 }, { fromIndex: 1, toIndex: 2, slopePct: 7 },
    { fromIndex: 1, toIndex: 200, slopePct: 10 },
  ] } } }
  const parts = plannedSegments(route)
  assert.equal(parts.length, 2)
  assert.deepEqual(parts[1].path, path.slice(1))
  assert.equal(parts[1].environment.slope.avgSlopePct, 7)
  assert.ok(Math.abs(parts[0].distanceTo - 1111.95) < .01)
  assert.equal(parts[1].distanceFrom, parts[0].distanceTo)
  assert.equal(parts[1].durationSeconds, null)
  assert.equal(parts[1].pace, null)
  assert.equal(plannedSegments({ path }).length, 1)
  assert.deepEqual(plannedSegments(null), [])
})

test('행의 Enter/Space 이동과 셀 링크 동작이 중복 실행되지 않는다', () => {
  let moved = 0
  const currentTarget = {}
  const event = { target: currentTarget, currentTarget, type: 'keydown', key: 'Enter', preventDefault() {} }
  rowAction(event, () => moved++)
  rowAction({ ...event, key: ' ' }, () => moved++)
  rowAction({ ...event, key: 'Tab' }, () => moved++)
  rowAction({ ...event, type: 'click', target: { closest: () => ({}) } }, () => moved++)
  assert.equal(moved, 2)
  assert.equal(duration(59.8), '1분 0초')
})
