import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import LogoutIcon from './LogoutIcon'

import './Header.css'

const pageTitles = {
  '/dashboard': '대시보드',
  '/users': '회원 관리',
  '/inquiries': '문의 관리',
}

function Header({ onLogout }) {
  const location = useLocation()

  const [isProfileOpen, setIsProfileOpen] =
    useState(false)

  const pageTitle =
    pageTitles[location.pathname] ?? '관리자'

  const handleLogout = () => {
    setIsProfileOpen(false)
    onLogout()
  }

  return (
    <header className="admin-header">
      <h2 className="admin-header-title">
        {pageTitle}
      </h2>

      <div className="admin-header-actions">
        <div className="profile-wrapper">
          <button
            type="button"
            className="admin-profile-button"
            onClick={() =>
              setIsProfileOpen((previous) => !previous)
            }
          >
            <span className="admin-avatar">
              A
            </span>

            <span className="admin-name">
              관리자님
            </span>

            <svg
              className={`profile-chevron ${
                isProfileOpen ? 'open' : ''
              }`}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <button
                type="button"
                className="profile-logout-button"
                onClick={handleLogout}
              >
                <LogoutIcon size={19} />

                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header