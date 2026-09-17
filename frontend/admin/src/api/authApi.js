import apiClient from './client'

export const loginAdmin = async (loginId, password) => {
  const response = await apiClient.post('/auth/login', {
    loginId,
    password,
  })

  return response.data
}