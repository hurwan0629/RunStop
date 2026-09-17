// ponytail: 회원별 상세 조회는 소규모 운영용. 회원 증가 시 서버 집계 API로 교체합니다.
export async function loadRunningOverview(listUsers, getDetail, signal) {
  const users = new Map()
  let page = 1
  let totalPages
  do {
    signal.throwIfAborted()
    const result = await listUsers({ page, limit: 100, signal })
    for (const user of result.items) {
      if (user.status !== 'WITHDRAWN') users.set(user.userIdx, user)
    }
    totalPages = result.totalPages
    page += 1
  } while (page <= totalPages)

  const rows = []
  const members = [...users.values()]
  // 한 번에 최대 5명만 조회해 서버에 요청이 몰리지 않게 합니다.
  for (let offset = 0; offset < members.length; offset += 5) {
    signal.throwIfAborted()
    const batch = await Promise.all(members.slice(offset, offset + 5).map(async (member) => {
      const detail = await getDetail(member.userIdx, signal)
      if (detail.user.status === 'WITHDRAWN') return null
      const { completedRunCount, totalDistanceMeter } = detail.runningSummary
      if (!Number.isInteger(completedRunCount) || completedRunCount < 0 ||
          !Number.isFinite(totalDistanceMeter) || totalDistanceMeter < 0) {
        throw new Error('러닝 집계 데이터가 올바르지 않습니다.')
      }
      return { userIdx: member.userIdx, nickname: detail.user.nickname, completedRunCount, totalDistanceMeter }
    }))
    rows.push(...batch.filter(Boolean))
  }
  signal.throwIfAborted()
  rows.sort((a, b) => b.completedRunCount - a.completedRunCount || b.totalDistanceMeter - a.totalDistanceMeter || a.userIdx - b.userIdx)
  const runnerCount = rows.filter((row) => row.completedRunCount > 0).length
  return {
    rows,
    runnerCount,
    usageRate: rows.length ? runnerCount / rows.length * 100 : 0,
    completedRunCount: rows.reduce((sum, row) => sum + row.completedRunCount, 0),
    totalDistanceMeter: rows.reduce((sum, row) => sum + row.totalDistanceMeter, 0),
  }
}
