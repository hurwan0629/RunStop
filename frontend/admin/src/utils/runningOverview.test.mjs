import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadRunningOverview } from './runningOverview.js'

test('모든 페이지 집계, 중복·탈퇴 제외, 이용률 및 거리 계산', async () => {
  const pages = []
  const details = []
  const result = await loadRunningOverview(async ({ page }) => {
    pages.push(page)
    return { totalPages: 2, items: page === 1
      ? [{ userIdx: 1, status: 'ENABLED' }, { userIdx: 2, status: 'WITHDRAWN' }]
      : [{ userIdx: 1, status: 'ENABLED' }, { userIdx: 3, status: 'SUSPENDED' }, { userIdx: 4, status: 'ENABLED' }] }
  }, async (id) => {
    details.push(id)
    return { user: { nickname: `회원${id}`, status: id === 4 ? 'WITHDRAWN' : 'ENABLED' },
      runningSummary: { completedRunCount: id === 1 ? 2 : 0, totalDistanceMeter: id === 1 ? 3500 : 0 } }
  }, new AbortController().signal)
  assert.deepEqual(pages, [1, 2])
  assert.deepEqual(details, [1, 3, 4])
  assert.equal(result.rows.length, 2)
  assert.equal(result.runnerCount, 1)
  assert.equal(result.usageRate, 50)
  assert.equal(result.completedRunCount, 2)
  assert.equal(result.totalDistanceMeter, 3500)
})

test('회원 없음은 빈 집계, 상세 실패는 전체 집계 실패', async () => {
  const empty = await loadRunningOverview(async () => ({ items: [], totalPages: 0 }),
    async () => assert.fail('빈 목록에서 상세 조회 금지'), new AbortController().signal)
  assert.equal(empty.usageRate, 0)
  assert.deepEqual(empty.rows, [])
  await assert.rejects(loadRunningOverview(async () => ({ items: [{ userIdx: 1, status: 'ENABLED' }], totalPages: 1 }),
    async () => { throw new Error('조회 실패') }, new AbortController().signal), /조회 실패/)
})

test('상세 조회 동시 실행은 최대 5개, 완료 횟수 순 정렬', async () => {
  let active = 0
  let maxActive = 0
  const result = await loadRunningOverview(async () => ({ totalPages: 1,
    items: Array.from({ length: 12 }, (_, i) => ({ userIdx: i + 1, status: 'ENABLED' })) }),
  async (id) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((resolve) => setTimeout(resolve, 1))
    active -= 1
    return { user: { nickname: `${id}`, status: 'ENABLED' }, runningSummary: { completedRunCount: id, totalDistanceMeter: id * 1000 } }
  }, new AbortController().signal)
  assert.equal(maxActive, 5)
  assert.equal(result.rows[0].userIdx, 12)
  assert.equal(result.rows.length, 12)
})

test('취소된 요청은 API 호출 중단, 잘못된 통계는 실패 처리', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(loadRunningOverview(async () => assert.fail('취소 후 호출 금지'), null, controller.signal), { name: 'AbortError' })
  await assert.rejects(loadRunningOverview(async () => ({ totalPages: 1, items: [{ userIdx: 1, status: 'ENABLED' }] }),
    async () => ({ user: { status: 'ENABLED' }, runningSummary: { completedRunCount: -1, totalDistanceMeter: 0 } }),
    new AbortController().signal), /올바르지/)
})
