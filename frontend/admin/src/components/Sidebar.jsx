import { NavLink } from 'react-router-dom'

import LogoutIcon from './LogoutIcon'
import SidebarMenuIcon from './SidebarMenuIcon'
import './Sidebar.css'

function Sidebar({ onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-main">
        <div className="sidebar-logo">
          <strong>RunStop</strong>
          <span>ADMIN</span>
        </div>

        <nav className="sidebar-menu">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">
              <SidebarMenuIcon type="dashboard" />
            </span>

            <span>대시보드</span>
          </NavLink>

          <NavLink
            to="/users"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">
              <SidebarMenuIcon type="users" />
            </span>

            <span>회원 관리</span>
          </NavLink>

          <NavLink
            to="/inquiries"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">
              <SidebarMenuIcon type="inquiries" />
            </span>

            <span>문의 관리</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="admin-info">
          <strong>관리자</strong>
          <span>admin@runstop.com</span>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          <LogoutIcon size={18} />

          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar