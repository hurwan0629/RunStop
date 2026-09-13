import apiClient from './client'

export const getAdminDashboard = async () => {
  const response = await apiClient.get(
    '/admin/dashboard',
  )

  return response.data.data
}