import apiClient from './client'

export async function getRuns(params, signal) {
  return (await apiClient.get('/admin/running-sessions', { params, signal })).data.data
}

export async function getRun(sessionIdx, signal) {
  return (await apiClient.get(`/admin/running-sessions/${sessionIdx}`, { signal })).data.data
}

export async function getRouteRequest(requestIdx, signal) {
  return (await apiClient.get(`/admin/route-requests/${requestIdx}`, { signal })).data.data
}

export async function getAnalytics(params, signal) {
  return (await apiClient.get('/admin/running-analytics', { params, signal })).data.data
}

export function period(days) {
  const now = Date.now() + 9 * 3600000
  return {
    from: new Date(now - (days - 1) * 86400000).toISOString().slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  }
}
