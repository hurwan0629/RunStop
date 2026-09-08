// 관리자 페이지 사이드 바

import {
  NavLink,
  useNavigate,
} from 'react-router-dom'

function Sidebar() {
  const navigate = useNavigate()

  const adminUser = JSON.parse(
    localStorage.getItem('adminUser') ?? 'null',
  )

  const handleLogout = () => {
    localStorage.removeItem('adminAccessToken')
    localStorage.removeItem('adminUser')

    navigate('/login', { replace: true })
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <strong>RunStop</strong>
        <span>ADMIN</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink to="/dashboard">
          대시보드
        </NavLink>

        <NavLink to="/users">
          회원 관리
        </NavLink>

        <NavLink to="/inquiries">
          문의 관리
        </NavLink>
      </nav>

      <div className="sidebar-user">
        <strong>
          {adminUser?.nickname ?? '관리자'}
        </strong>

        <span>
          {adminUser?.email ??
            adminUser?.loginId ??
            'admin'}
        </span>

        <button
          type="button"
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}

export default Sidebar