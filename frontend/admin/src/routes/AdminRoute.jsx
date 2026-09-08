import { Navigate, Outlet } from 'react-router-dom'

function AdminRoute() {
  const token = localStorage.getItem('adminAccessToken')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default AdminRoute