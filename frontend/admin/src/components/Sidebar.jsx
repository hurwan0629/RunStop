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
          {[['/dashboard', '대시보드', 'dashboard'], ['/users', '회원 관리', 'users'],
            ['/requests', '추천 요청', 'inquiries'], ['/running', '러닝 기록', 'dashboard'], ['/inquiries', '문의 관리', 'inquiries']]
            .map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon"><SidebarMenuIcon type={icon} /></span><span>{label}</span>
            </NavLink>)}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="admin-info">
          <strong>관리자</strong>
          <span>운영 관리</span>
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
