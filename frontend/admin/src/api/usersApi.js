import apiClient from './client'

export const getAdminUsers = async ({
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
} = {}) => {
  const response = await apiClient.get(
    '/admin/users',
    {
      params: {
        page,
        limit,
        ...(keyword && { keyword }),
        ...(status && { status }),
      },
    },
  )

  return response.data.data
}

export const getAdminUserDetail = async (
  userIdx,
) => {
  const response = await apiClient.get(
    `/admin/users/${userIdx}`,
  )

  return response.data.data
}

export const updateAdminUserStatus = async (
  userIdx,
  payload,
) => {
  const response = await apiClient.patch(
    `/admin/users/${userIdx}/status`,
    payload,
  )

  return response.data.data
}