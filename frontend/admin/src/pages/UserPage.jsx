import {
  useEffect,
  useState,
} from 'react'

import { getAdminUsers } from '../api/usersApi'
import UserDetailDrawer from '../components/UserDetailDrawer'

import './UserPage.css'

const LIMIT = 10

const statusLabels = {
  ENABLED: '정상',
  SUSPENDED: '이용 정지',
  WITHDRAWN: '탈퇴',
}

function formatUserId(userIdx) {
  return `U${String(userIdx).padStart(3, '0')}`
}

function formatDate(dateString) {
  if (!dateString) {
    return '-'
  }

  const date = new Date(dateString)

  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}.${month}.${day}`
}

function UserPage() {
  const [apiData, setApiData] = useState({
    items: [],
    total: 0,
    totalPages: 0,
    summary: {
      total: 0,
      enabled: 0,
      suspended: 0,
      withdrawn: 0,
    },
  })

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')

  const [isLoading, setIsLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [selectedUserIdx, setSelectedUserIdx] =
    useState(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const data = await getAdminUsers({
          page,
          limit: LIMIT,
          keyword,
          status,
        })

        setApiData(data)
      } catch (error) {
        console.error(
          '회원 목록 조회 오류:',
          error,
        )

        setErrorMessage(
          error.response?.data?.error?.message ??
            '회원 목록을 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [page, keyword, status, reloadKey])

  const handleStatusChange = (nextStatus) => {
    setStatus(nextStatus)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus('')
    setPage(1)
  }

  const users = apiData.items
  const summary = apiData.summary
  const totalPages = apiData.totalPages

  return (
    <>
      <main className="users-page">
        <header className="users-page-title">
          <h1>회원 관리</h1>

          <p>
            RunStop에 가입한 사용자를 조회하고
            계정 상태를 관리합니다.
          </p>
        </header>

        <section className="user-summary-grid">
          <article className="user-summary-card">
            <span>전체 회원</span>

            <strong>
              {summary.total}
              <small>명</small>
            </strong>
          </article>

          <article className="user-summary-card">
            <span>정상 회원</span>

            <strong>
              {summary.enabled}
              <small>명</small>
            </strong>
          </article>

          <article className="user-summary-card">
            <span>이용 정지</span>

            <strong className="suspended-count">
              {summary.suspended}
              <small>명</small>
            </strong>
          </article>

          <article className="user-summary-card">
            <span>탈퇴 회원</span>

            <strong className="withdrawn-count">
              {summary.withdrawn}
              <small>명</small>
            </strong>
          </article>
        </section>

        <section className="users-filter-section">
          <label className="user-search-box">
            <span>⌕</span>

            <input
              type="search"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="닉네임 또는 아이디 검색"
            />
          </label>

          <div className="user-status-filter">
            <button
              type="button"
              className={!status ? 'active' : ''}
              onClick={() => handleStatusChange('')}
            >
              전체
            </button>

            <button
              type="button"
              className={
                status === 'ENABLED' ? 'active' : ''
              }
              onClick={() =>
                handleStatusChange('ENABLED')
              }
            >
              정상
            </button>

            <button
              type="button"
              className={
                status === 'SUSPENDED'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleStatusChange('SUSPENDED')
              }
            >
              이용 정지
            </button>

            <button
              type="button"
              className={
                status === 'WITHDRAWN'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleStatusChange('WITHDRAWN')
              }
            >
              탈퇴
            </button>
          </div>

          <button
            type="button"
            className="user-reset-button"
            onClick={handleReset}
          >
            초기화
          </button>
        </section>

        <section className="users-table-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>회원 ID</th>
                <th>닉네임 / 아이디</th>
                <th>가입일</th>
                <th>최근 접속일</th>
                <th>계정 상태</th>
                <th>문의 수</th>
                <th>상세</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan="7"
                    className="users-empty-message"
                  >
                    회원 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && errorMessage && (
                <tr>
                  <td
                    colSpan="7"
                    className="users-empty-message error"
                  >
                    {errorMessage}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                users.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="users-empty-message"
                    >
                      등록된 회원이 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                !errorMessage &&
                users.map((user) => (
                  <tr key={user.userIdx}>
                    <td>
                      {formatUserId(user.userIdx)}
                    </td>

                    <td>
                      <div className="user-profile-cell">
                        <span className="user-avatar">
                          {user.nickname.charAt(0)}
                        </span>

                        <div>
                          <strong>
                            {user.nickname}
                          </strong>

                          <span>
                            {user.loginId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {formatDate(user.joinedAt)}
                    </td>

                    <td>
                      {formatDate(user.lastLoginAt)}
                    </td>

                    <td>
                      <span
                        className={
                          `user-status-badge ${user.status.toLowerCase()}`
                        }
                      >
                        {statusLabels[user.status]}
                      </span>
                    </td>

                    <td>
                      {user.inquiryCount ?? 0}건
                    </td>

                    <td>
                      <button
                        type="button"
                        className="user-detail-button"
                        onClick={() =>
                          setSelectedUserIdx(
                            user.userIdx,
                          )
                        }
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <nav className="users-pagination">
              <button
                type="button"
                onClick={() =>
                  setPage((previous) =>
                    Math.max(1, previous - 1),
                  )
                }
                disabled={page === 1}
              >
                ‹
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1,
              ).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={
                    page === pageNumber ? 'active' : ''
                  }
                  onClick={() =>
                    setPage(pageNumber)
                  }
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setPage((previous) =>
                    Math.min(
                      totalPages,
                      previous + 1,
                    ),
                  )
                }
                disabled={page === totalPages}
              >
                ›
              </button>
            </nav>
          )}
        </section>
      </main>

      {selectedUserIdx && (
        <UserDetailDrawer
          userIdx={selectedUserIdx}
          onClose={() => setSelectedUserIdx(null)}
          onUpdated={() =>
            setReloadKey(
              (previous) => previous + 1,
            )
          }
        />
      )}
    </>
  )
}

export default UserPage