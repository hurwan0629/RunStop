import { Outlet, useNavigate } from 'react-router-dom'

import Header from './Header'
import Sidebar from './Sidebar'

import {
  clearAdminSession,
} from '../utils/adminSession'

import './AdminLayout.css'

function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAdminSession()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <div className="admin-layout">
      <Sidebar onLogout={handleLogout} />

      <div className="admin-content">
        <Header onLogout={handleLogout} />

        <div className="admin-page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout