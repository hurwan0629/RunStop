import { useEffect, useMemo, useState } from 'react'
import { getInquiries } from '../api/inquiriesApi'
import InquiryDetailDrawer from '../components/InquiryDetailDrawer.jsx'

const LIMIT = 20

const statusLabels = {
  PENDING: '답변 대기',
  IN_PROGRESS: '처리 중',
  ANSWERED: '답변 완료',
}

function formatInquiryNumber(idx) {
  return `INQ-${String(idx).padStart(3, '0')}`
}

function formatDate(dateString) {
  if (!dateString) {
    return '-'
  }

  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function InquiriesPage() {
  // 백엔드에서 받아온 문의 목록
  const [inquiries, setInquiries] = useState([])

  // 목록 조회 조건
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')

  // 상세 Drawer에서 선택한 문의 번호
  const [selectedInquiryIdx, setSelectedInquiryIdx] =
    useState(null)

  // 상세에서 상태나 답변이 변경되었을 때 목록 새로고침
  const [reloadKey, setReloadKey] = useState(0)

  // 화면 상태
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCancelled = false

    const loadInquiries = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const data = await getInquiries({
          page,
          limit: LIMIT,
          status,
        })

        if (!isCancelled) {
          setInquiries(data.items ?? [])
        }
      } catch (error) {
        console.error('문의 목록 조회 오류:', error)

        if (isCancelled) {
          return
        }

        setInquiries([])

        if (error.response?.status === 401) {
          setErrorMessage(
            '로그인이 필요하거나 토큰이 유효하지 않습니다.',
          )
          return
        }

        if (error.response?.status === 403) {
          setErrorMessage('관리자 권한이 필요합니다.')
          return
        }

        setErrorMessage(
          error.response?.data?.message ??
            '문의 목록을 불러오지 못했습니다.',
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInquiries()

    return () => {
      isCancelled = true
    }
  }, [page, status, reloadKey])

  /*
   * 현재 백엔드에는 keyword 검색 기능이 없기 때문에
   * 현재 페이지에서 받아온 문의 제목만 검색한다.
   */
  const filteredInquiries = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    if (!normalizedKeyword) {
      return inquiries
    }

    return inquiries.filter((inquiry) =>
      inquiry.title
        .toLowerCase()
        .includes(normalizedKeyword),
    )
  }, [inquiries, keyword])

  /*
   * 현재 백엔드 응답에는 전체 개수 total이 없다.
   * 따라서 요약 숫자는 현재 받아온 페이지 기준이다.
   */
  const summary = useMemo(() => {
    return {
      total: inquiries.length,

      pending: inquiries.filter(
        (inquiry) => inquiry.status === 'PENDING',
      ).length,

      inProgress: inquiries.filter(
        (inquiry) =>
          inquiry.status === 'IN_PROGRESS',
      ).length,

      answered: inquiries.filter(
        (inquiry) => inquiry.status === 'ANSWERED',
      ).length,
    }
  }, [inquiries])

  const handleStatusFilterChange = (event) => {
    setStatus(event.target.value)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus('')
    setPage(1)
  }

  const handleInquiryUpdated = () => {
    setReloadKey((previous) => previous + 1)
  }

  const handlePreviousPage = () => {
    setPage((previous) => Math.max(1, previous - 1))
  }

  const handleNextPage = () => {
    setPage((previous) => previous + 1)
  }

  return (
    <main className="inquiries-page">
      {/* 페이지 제목 */}
      <header className="page-title-area">
        <h1>문의 관리</h1>

        <p>
          사용자가 접수한 문의를 확인하고 답변 및
          처리할 수 있습니다.
        </p>
      </header>

      {/* 문의 상태 요약 */}
      <section className="inquiry-summary-section">
        <div className="summary-card summary-total">
          <span>전체 문의</span>

          <strong>
            {summary.total}
            <small>건</small>
          </strong>
        </div>

        <div className="summary-card summary-pending">
          <span>답변 대기</span>

          <strong>
            {summary.pending}
            <small>건</small>
          </strong>
        </div>

        <div className="summary-card summary-progress">
          <span>처리 중</span>

          <strong>
            {summary.inProgress}
            <small>건</small>
          </strong>
        </div>

        <div className="summary-card summary-answered">
          <span>답변 완료</span>

          <strong>
            {summary.answered}
            <small>건</small>
          </strong>
        </div>
      </section>

      <p className="summary-description">
        현재 조회된 페이지의 문의를 기준으로 계산한
        숫자입니다.
      </p>

      {/* 검색 및 필터 */}
      <section className="inquiry-filter-section">
        <div className="keyword-search">
          <label htmlFor="inquiryKeyword">
            문의 제목 검색
          </label>

          <input
            id="inquiryKeyword"
            type="search"
            value={keyword}
            onChange={(event) =>
              setKeyword(event.target.value)
            }
            placeholder="제목 검색"
          />
        </div>

        <div className="status-filter">
          <label htmlFor="inquiryStatus">
            처리 상태
          </label>

          <select
            id="inquiryStatus"
            value={status}
            onChange={handleStatusFilterChange}
          >
            <option value="">전체 상태</option>
            <option value="PENDING">답변 대기</option>
            <option value="IN_PROGRESS">처리 중</option>
            <option value="ANSWERED">답변 완료</option>
          </select>
        </div>

        <button
          type="button"
          className="filter-reset-button"
          onClick={handleReset}
        >
          초기화
        </button>
      </section>

      {/* 로딩 및 오류 */}
      {isLoading && (
        <div className="inquiry-message">
          문의 목록을 불러오는 중입니다.
        </div>
      )}

      {!isLoading && errorMessage && (
        <div
          className="inquiry-message error-message"
          role="alert"
        >
          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={handleInquiryUpdated}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 문의 목록 */}
      {!isLoading && !errorMessage && (
        <section className="inquiry-table-section">
          <table className="inquiry-table">
            <thead>
              <tr>
                <th>문의 번호</th>
                <th>제목</th>
                <th>접수일</th>
                <th>처리 상태</th>
                <th>상세</th>
              </tr>
            </thead>

            <tbody>
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="empty-table-cell"
                  >
                    조회된 문의가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.idx}>
                    <td>
                      {formatInquiryNumber(inquiry.idx)}
                    </td>

                    <td className="inquiry-title-cell">
                      {inquiry.title}
                    </td>

                    <td>
                      {formatDate(inquiry.createdAt)}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${inquiry.status.toLowerCase()}`}
                      >
                        {statusLabels[inquiry.status] ??
                          inquiry.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="detail-button"
                        onClick={() =>
                          setSelectedInquiryIdx(
                            inquiry.idx,
                          )
                        }
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* 페이지 이동 */}
          <div className="pagination">
            <button
              type="button"
              disabled={page === 1}
              onClick={handlePreviousPage}
            >
              이전
            </button>

            <span>{page} 페이지</span>

            <button
              type="button"
              /*
               * total 값이 없기 때문에 LIMIT보다 적게
               * 반환되면 마지막 페이지로 판단한다.
               */
              disabled={inquiries.length < LIMIT}
              onClick={handleNextPage}
            >
              다음
            </button>
          </div>
        </section>
      )}

      {/* 문의 상세 Drawer */}
      {selectedInquiryIdx !== null && (
        <InquiryDetailDrawer
          inquiryIdx={selectedInquiryIdx}
          onClose={() =>
            setSelectedInquiryIdx(null)
          }
          onUpdated={handleInquiryUpdated}
        />
      )}
    </main>
  )
}

export default InquiriesPage