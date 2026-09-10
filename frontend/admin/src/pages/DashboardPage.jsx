import {
  useEffect,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import { getAdminDashboard } from '../api/dashboardApi'

import './DashboardPage.css'

import DashboardCardIcon from '../components/DashboardCardIcon'

const statusLabels = {
  PENDING: '답변 대기',
  IN_PROGRESS: '처리 중',
  ANSWERED: '답변 완료',
}

function formatInquiryId(inquiryIdx) {
  return `INQ-${String(inquiryIdx).padStart(3, '0')}`
}

function formatShortDate(dateString) {
  if (!dateString) {
    return '-'
  }

  const date = new Date(dateString)

  return `${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function DashboardPage() {
  const navigate = useNavigate()

  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const data = await getAdminDashboard()

        setDashboard(data)
      } catch (error) {
        console.error(
          '대시보드 조회 오류:',
          error,
        )

        setErrorMessage(
          error.response?.data?.error?.message ??
            '대시보드 정보를 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const summary = dashboard?.summary ?? {
    totalUsers: 0,
    todayJoinedUsers: 0,
    pendingInquiries: 0,
    todayAnsweredInquiries: 0,
  }

  const recentInquiries =
    dashboard?.recentInquiries ?? []

  return (
    <main className="dashboard-page">
      <header className="dashboard-title">
        <h1>대시보드</h1>

        <p>
          오늘의 RunStop 운영 현황을 확인하세요.
        </p>
      </header>

      <section className="dashboard-summary-grid">
  <button
    type="button"
    className="dashboard-summary-card"
    onClick={() => navigate('/users')}
  >
    <div className="dashboard-card-header">
      <span>전체 회원 수</span>

      <DashboardCardIcon type="users" />
    </div>

    <strong>
      {summary.totalUsers.toLocaleString()}
      <small>명</small>
    </strong>
  </button>

  <button
    type="button"
    className="dashboard-summary-card"
    onClick={() => navigate('/users')}
  >
    <div className="dashboard-card-header">
      <span>오늘 가입한 회원</span>

      <DashboardCardIcon type="userPlus" />
    </div>

    <strong>
      {summary.todayJoinedUsers.toLocaleString()}
      <small>명</small>
    </strong>
  </button>

  <button
    type="button"
    className="dashboard-summary-card"
    onClick={() => navigate('/inquiries')}
  >
    <div className="dashboard-card-header">
      <span>답변 대기 문의</span>

      <DashboardCardIcon type="message" />
    </div>

    <strong>
      {summary.pendingInquiries.toLocaleString()}
      <small>건</small>
    </strong>
  </button>

  <button
    type="button"
    className="dashboard-summary-card"
    onClick={() => navigate('/inquiries')}
  >
    <div className="dashboard-card-header">
      <span>오늘 처리 완료 문의</span>

      <DashboardCardIcon type="checkCircle" />
    </div>

    <strong>
      {summary.todayAnsweredInquiries.toLocaleString()}
      <small>건</small>
    </strong>
  </button>
    </section>

      <section className="recent-inquiries-card">
        <header className="recent-inquiries-header">
          <h2>최근 문의</h2>

          <button
            type="button"
            onClick={() => navigate('/inquiries')}
          >
            전체 문의 보기
            <span>→</span>
          </button>
        </header>

        <div className="dashboard-table-wrapper">
          <table className="dashboard-inquiries-table">
            <thead>
              <tr>
                <th>문의 번호</th>
                <th>제목</th>
                <th>작성자</th>
                <th>접수일</th>
                <th>처리 상태</th>
                <th>담당 관리자</th>
                <th>상세</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan="7"
                    className="dashboard-empty-message"
                  >
                    대시보드 정보를 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && errorMessage && (
                <tr>
                  <td
                    colSpan="7"
                    className="dashboard-empty-message error"
                  >
                    {errorMessage}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                recentInquiries.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="dashboard-empty-message"
                    >
                      최근 등록된 문의가 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                !errorMessage &&
                recentInquiries.map((inquiry) => (
                  <tr key={inquiry.inquiryIdx}>
                    <td>
                      {formatInquiryId(
                        inquiry.inquiryIdx,
                      )}
                    </td>

                    <td className="dashboard-inquiry-title">
                      {inquiry.title}
                    </td>

                    <td>
                      {inquiry.authorNickname}
                    </td>

                    <td>
                      {formatShortDate(
                        inquiry.createdAt,
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          `dashboard-inquiry-status ${inquiry.status.toLowerCase()}`
                        }
                      >
                        {statusLabels[inquiry.status]}
                      </span>
                    </td>

                    <td>
                      {inquiry.answererNickname ?? '-'}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="dashboard-detail-button"
                        onClick={() =>
                          navigate('/inquiries')
                        }
                      >
                        확인
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default DashboardPage