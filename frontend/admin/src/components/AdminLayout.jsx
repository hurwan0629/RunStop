import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />

      <div className="admin-content">
        <Header />

        <div className="admin-page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout