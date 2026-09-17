import axios from 'axios'

import {
  getAdminAccessToken,
} from '../utils/adminSession'

const apiClient = axios.create({
  baseURL: '/api',
  // baseURL: 'http://localhost:3000/api',
  // baseURL: 'http://runstop.hurwan.net/api',

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