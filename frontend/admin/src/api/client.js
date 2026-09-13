import axios from 'axios'

import {
  getAdminAccessToken,
} from '../utils/adminSession'

const apiClient = axios.create({
  baseURL: '/api',

  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAdminAccessToken()

  const isLoginRequest =
    config.url?.includes('/auth/login')

  if (token && !isLoginRequest) {
    config.headers.Authorization =
      `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }

  return config
})

export default apiClient