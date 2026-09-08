function Header() {
  const adminUser = JSON.parse(
    localStorage.getItem('adminUser') ?? 'null',
  )

  return (
    <header className="admin-header">
      <strong>대시보드</strong>

      <div className="header-admin">
        <div className="admin-avatar">
          A
        </div>

        <span>
          {adminUser?.nickname ?? '관리자'}님
        </span>
      </div>
    </header>
  )
}

export default Header