import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useSearchParams } from 'react-router-dom'

import { getInquiries, getInquirySummary } from '../api/inquiriesApi'
import InquiryDetailDrawer from '../components/InquiryDetailDrawer.jsx'

import './InquiriesPage.css'



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

  return new Date(
    dateString,
  ).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function InquiriesPage() {

  
  const [inquiries, setInquiries] = useState([])

  const [summary, setSummary] = useState({
  total: 0,
  pending: 0,
  inProgress: 0,
  answered: 0,
})
  

  const [page, setPage] = useState(1)

  const [searchParams, setSearchParams] =
    useSearchParams()

  const status = searchParams.get('status') ?? ''

  const [keyword, setKeyword] = useState('')

  const [selectedInquiryIdx, setSelectedInquiryIdx] =
    useState(null)

  const [reloadKey, setReloadKey] = useState(0)

  const [isLoading, setIsLoading] = useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    let isCancelled = false

    const loadInquiries = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [inquiryData, summaryData] = await Promise.all([
        getInquiries({
          page,
          limit: LIMIT,
          status,
        }),
        getInquirySummary(),
      ])

      if (!isCancelled) {
        setInquiries(inquiryData.items ?? [])
        setSummary(summaryData)
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
          error.response?.data?.error?.message ??
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

  const filteredInquiries = useMemo(() => {
    const normalizedKeyword = keyword
      .trim()
      .toLowerCase()

    if (!normalizedKeyword) {
      return inquiries
    }

    return inquiries.filter((inquiry) =>
      inquiry.title
        .toLowerCase()
        .includes(normalizedKeyword),
    )
  }, [inquiries, keyword])

  

  const handleStatusChange = (nextStatus) => {
    const nextSearchParams = new URLSearchParams(
      searchParams,
    )

    if (nextStatus) {
      nextSearchParams.set('status', nextStatus)
    } else {
      nextSearchParams.delete('status')
    }

    setSearchParams(nextSearchParams)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setSearchParams({})
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
      <header className="page-title-area">
        <h1>문의 관리</h1>

        <p>
          사용자가 접수한 문의를 확인하고 답변 및
          처리할 수 있습니다.
        </p>
      </header>

      <section className="inquiry-summary-section">
        <button
          type="button"
          className={`summary-card summary-total ${
            !status ? 'active' : ''
          }`}
          onClick={() => handleStatusChange('')}
        >
          <span>전체 문의</span>

          <strong>
            {summary.total}
            <small>건</small>
          </strong>
        </button>

        <button
          type="button"
          className={`summary-card summary-pending ${
            status === 'PENDING' ? 'active' : ''
          }`}
          onClick={() =>
            handleStatusChange('PENDING')
          }
        >
          <span>답변 대기</span>

          <strong>
            {summary.pending}
            <small>건</small>
          </strong>
        </button>

        <button
          type="button"
          className={`summary-card summary-progress ${
            status === 'IN_PROGRESS' ? 'active' : ''
          }`}
          onClick={() =>
            handleStatusChange('IN_PROGRESS')
          }
        >
          <span>처리 중</span>

          <strong>
            {summary.inProgress}
            <small>건</small>
          </strong>
        </button>

        <button
          type="button"
          className={`summary-card summary-answered ${
            status === 'ANSWERED' ? 'active' : ''
          }`}
          onClick={() =>
            handleStatusChange('ANSWERED')
          }
        >
          <span>답변 완료</span>

          <strong>
            {summary.answered}
            <small>건</small>
          </strong>
        </button>
      </section>

      <section className="inquiry-filter-section">
        <div className="keyword-search">
          <span className="search-icon">⌕</span>

          <input
            id="inquiryKeyword"
            type="search"
            value={keyword}
            onChange={(event) =>
              setKeyword(event.target.value)
            }
            placeholder="문의 제목 검색"
            aria-label="문의 제목 검색"
          />
        </div>

        <div className="status-filter">
          <select
            id="inquiryStatus"
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value)
            }
            aria-label="처리 상태"
          >
            <option value="">전체 상태</option>
            <option value="PENDING">
              답변 대기
            </option>
            <option value="IN_PROGRESS">
              처리 중
            </option>
            <option value="ANSWERED">
              답변 완료
            </option>
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
              disabled={inquiries.length < LIMIT}
              onClick={handleNextPage}
            >
              다음
            </button>
          </div>
        </section>
      )}

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