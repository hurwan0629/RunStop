import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getAdminUserDetail,
} from '../api/usersApi'

import './UserDetailPage.css'

const userStatusLabels = {
  ENABLED: '정상',
  SUSPENDED: '이용 정지',
  WITHDRAWN: '탈퇴',
}

const inquiryStatusLabels = {
  PENDING: '답변 대기',
  IN_PROGRESS: '처리 중',
  ANSWERED: '답변 완료',
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

function formatDistance(distanceMeter) {
  return `${(
    distanceMeter / 1000
  ).toFixed(1)}km`
}

function UserDetailPage() {
  const navigate = useNavigate()
  const { userIdx } = useParams()

  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    const loadUserDetail = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const data = await getAdminUserDetail(
          userIdx,
        )

        setDetail(data)
      } catch (error) {
        console.error(
          '회원 상세 조회 오류:',
          error,
        )

        setErrorMessage(
          error.response?.data?.error?.message ??
            '회원 상세 정보를 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadUserDetail()
  }, [userIdx])

  if (isLoading) {
    return (
      <main className="user-detail-page">
        <p className="detail-message">
          회원 상세 정보를 불러오는 중입니다.
        </p>
      </main>
    )
  }

  if (errorMessage || !detail) {
    return (
      <main className="user-detail-page">
        <button
          type="button"
          className="detail-back-button"
          onClick={() => navigate('/users')}
        >
          ← 회원 목록
        </button>

        <p className="detail-message error">
          {errorMessage}
        </p>
      </main>
    )
  }

  const {
    user,
    runningSummary,
    recentInquiries,
    adminMemo,
  } = detail

  return (
    <main className="user-detail-page">
      <button
        type="button"
        className="detail-back-button"
        onClick={() => navigate('/users')}
      >
        ← 회원 목록
      </button>

      <header className="user-detail-header">
        <div className="detail-profile">
          <span className="detail-avatar">
            {user.nickname.charAt(0)}
          </span>

          <div>
            <p>회원 상세 정보</p>

            <h1>{user.nickname}</h1>

            <span>{user.loginId}</span>
          </div>
        </div>

        <span
          className={
            `detail-status-badge ${user.status.toLowerCase()}`
          }
        >
          {userStatusLabels[user.status]}
        </span>
      </header>

      <section className="detail-info-card">
        <h2>기본 정보</h2>

        <div className="detail-info-grid">
          <div>
            <span>회원 번호</span>
            <strong>U{String(user.userIdx).padStart(3, '0')}</strong>
          </div>

          <div>
            <span>전화번호</span>
            <strong>{user.phoneNumber ?? '-'}</strong>
          </div>

          <div>
            <span>가입일</span>
            <strong>{formatDate(user.joinedAt)}</strong>
          </div>

          <div>
            <span>최근 접속일</span>
            <strong>
              {formatDate(user.lastLoginAt)}
            </strong>
          </div>

          <div>
            <span>누적 경험치</span>
            <strong>
              {user.totalExp.toLocaleString()} EXP
            </strong>
          </div>

          <div>
            <span>정지 종료일</span>
            <strong>
              {formatDate(user.suspendedUntil)}
            </strong>
          </div>
        </div>
      </section>

      <section className="detail-running-section">
        <h2>러닝 활동 요약</h2>

        <div className="running-summary-grid">
          <article>
            <span>완료한 러닝</span>

            <strong>
              {runningSummary.completedRunCount}
              <small>회</small>
            </strong>
          </article>

          <article>
            <span>누적 러닝 거리</span>

            <strong>
              {formatDistance(
                runningSummary.totalDistanceMeter,
              )}
            </strong>
          </article>
        </div>
      </section>

      <section className="detail-inquiry-section">
        <div className="detail-section-title">
          <h2>최근 문의</h2>

          <span>
            최근 5건까지 표시됩니다.
          </span>
        </div>

        {recentInquiries.length === 0 ? (
          <div className="detail-empty-box">
            등록된 문의가 없습니다.
          </div>
        ) : (
          <div className="recent-inquiry-list">
            {recentInquiries.map((inquiry) => (
              <article key={inquiry.inquiryIdx}>
                <div>
                  <strong>{inquiry.title}</strong>

                  <span>
                    {formatDate(inquiry.createdAt)}
                  </span>
                </div>

                <span
                  className={
                    `inquiry-status ${inquiry.status.toLowerCase()}`
                  }
                >
                  {inquiryStatusLabels[inquiry.status]}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detail-memo-section">
        <h2>관리자 메모</h2>

        <div className="admin-memo-box">
          {adminMemo || '등록된 관리자 메모가 없습니다.'}
        </div>
      </section>
    </main>
  )
}

export default UserDetailPage