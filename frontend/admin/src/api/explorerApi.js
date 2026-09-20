import apiClient from './client'

export async function getRequests(params, signal) {
  return (await apiClient.get('/admin/recommendation-requests', { params, signal })).data.data
}

export async function getRequest(idx, signal) {
  return (await apiClient.get(`/admin/recommendation-requests/${idx}`, { signal })).data.data
}

export async function getActivityRuns(params, signal) {
  return (await apiClient.get('/admin/activity-runs', { params, signal })).data.data
}

export async function getUserActivity(idx, signal) {
  return (await apiClient.get(`/admin/user-activity/${idx}`, { signal })).data.data
}
