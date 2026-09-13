export const ADMIN_TOKEN_KEY =
  'adminAccessToken'

export const ADMIN_USER_KEY = 'adminUser'

export function getAdminAccessToken() {
  return localStorage.getItem(
    ADMIN_TOKEN_KEY,
  )
}

export function saveAdminSession({
  accessToken,
  user,
}) {
  localStorage.setItem(
    ADMIN_TOKEN_KEY,
    accessToken,
  )

  localStorage.setItem(
    ADMIN_USER_KEY,
    JSON.stringify(user),
  )
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_USER_KEY)

  // 이전에 잘못 저장됐을 수 있는 토큰도 함께 제거
  localStorage.removeItem('accessToken')
}