import { useEffect, useState } from 'react'

import {
  createInquiryAnswer,
  getInquiryDetail,
  updateInquiryStatus,
} from '../api/inquiriesApi'

const statusLabels = {
  PENDING: '답변 대기',
  IN_PROGRESS: '처리 중',
  ANSWERED: '답변 완료',
}

function InquiryDetailDrawer({
  inquiryIdx,
  onClose,
  onUpdated,
}) {
  const [inquiry, setInquiry] = useState(null)
  const [answer, setAnswer] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // 문의 상세정보 불러오기
  const loadInquiry = async () => {
    if (!inquiryIdx) {
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await getInquiryDetail(inquiryIdx)

      // API 함수가 data를 한 번 벗겨서 반환하는 경우와
      // success, data 구조로 반환하는 경우를 모두 처리
      const data = response.data ?? response

      setInquiry(data)
      setAnswer(data.answer ?? '')
      setMemo(data.memo ?? '')
    } catch (error) {
      console.error(
        '문의 상세 내역 조회 중 오류 발생:',
        error,
      )

      setErrorMessage(
        error.response?.data?.message ??
          '문의 정보를 불러오는 중 오류가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInquiry()
  }, [inquiryIdx])

  // 문의 상태 변경
  const handleStatusChange = async (nextStatus) => {
    if (!inquiry) {
      return
    }

    // 답변 완료된 문의는 상태를 다시 변경하지 않음
    if (inquiry.status === 'ANSWERED') {
      return
    }

    // 현재 상태와 같은 버튼을 누른 경우
    if (inquiry.status === nextStatus) {
      return
    }

    try {
      setIsSaving(true)

      const response = await updateInquiryStatus(
        inquiryIdx,
        nextStatus,
      )

      const data = response.data ?? response

      setInquiry((previous) => ({
        ...previous,
        status: data.status,
      }))

      onUpdated?.()
    } catch (error) {
      console.error('문의 상태 변경 오류:', error)

      alert(
        error.response?.data?.message ??
          '처리 상태를 변경하지 못했습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  // 관리자 답변 등록
  const handleAnswerSubmit = async () => {
    if (!inquiry) {
      return
    }

    if (!answer.trim()) {
      alert('답변 내용을 입력해주세요.')
      return
    }

    try {
      setIsSaving(true)

      await createInquiryAnswer(
        inquiryIdx,
        answer.trim(),
        memo.trim(),
      )

      // 답변 등록 이후 변경된 문의 상세정보 다시 조회
      await loadInquiry()

      // 부모 문의 목록도 다시 조회
      onUpdated?.()

      alert('답변이 등록되었습니다.')
    } catch (error) {
      console.error('답변 등록 오류:', error)

      alert(
        error.response?.data?.message ??
          '답변을 등록하지 못했습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
    >
      <aside
        className="inquiry-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <h2>문의 상세</h2>

          <button
            type="button"
            className="drawer-close-button"
            onClick={onClose}
            aria-label="문의 상세 닫기"
          >
            ×
          </button>
        </header>

        <div className="drawer-content">
          {isLoading && (
            <p>문의 정보를 불러오는 중입니다...</p>
          )}

          {errorMessage && (
            <p role="alert">{errorMessage}</p>
          )}

          {!isLoading && inquiry && (
            <>
              <section className="inquiry-info-card">
                <div>
                  <span>문의 번호</span>
                  <strong>
                    INQ-{String(inquiry.idx).padStart(3, '0')}
                  </strong>
                </div>

                <div>
                  <span>접수일</span>
                  <strong>
                    {new Date(
                      inquiry.createdAt,
                    ).toLocaleDateString('ko-KR')}
                  </strong>
                </div>

                <div>
                  <span>처리 상태</span>
                  <strong>
                    {statusLabels[inquiry.status]}
                  </strong>
                </div>

                <div className="inquiry-title-area">
                  <span>제목</span>
                  <strong>{inquiry.title}</strong>
                </div>
              </section>

              <section>
                <h3>문의 내용</h3>

                <div className="inquiry-content-box">
                  {inquiry.content}
                </div>
              </section>

              <section>
                <h3>처리 상태 변경</h3>

                <div className="status-button-group">
                  <button
                    type="button"
                    className={
                      inquiry.status === 'PENDING'
                        ? 'active'
                        : ''
                    }
                    disabled={
                      isSaving ||
                      inquiry.status === 'ANSWERED'
                    }
                    onClick={() =>
                      handleStatusChange('PENDING')
                    }
                  >
                    답변 대기
                  </button>

                  <button
                    type="button"
                    className={
                      inquiry.status === 'IN_PROGRESS'
                        ? 'active'
                        : ''
                    }
                    disabled={
                      isSaving ||
                      inquiry.status === 'ANSWERED'
                    }
                    onClick={() =>
                      handleStatusChange('IN_PROGRESS')
                    }
                  >
                    처리 중
                  </button>

                  <button
                    type="button"
                    className={
                      inquiry.status === 'ANSWERED'
                        ? 'active'
                        : ''
                    }
                    disabled
                  >
                    답변 완료
                  </button>
                </div>
              </section>

              {inquiry.status === 'ANSWERED' ? (
                <>
                  {inquiry.memo && (
                    <section>
                      <h3>관리자 메모</h3>

                      <div className="inquiry-content-box">
                        {inquiry.memo}
                      </div>
                    </section>
                  )}

                  <section>
                    <h3>관리자 답변</h3>

                    <div className="inquiry-content-box">
                      {inquiry.answer}
                    </div>

                    {inquiry.answeredAt && (
                      <p>
                        답변일:{' '}
                        {new Date(
                          inquiry.answeredAt,
                        ).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <h3>관리자 메모</h3>

                    <textarea
                      value={memo}
                      onChange={(event) =>
                        setMemo(event.target.value)
                      }
                      placeholder="답변과 함께 저장할 메모입니다."
                      rows={3}
                    />

                    <p>
                      현재 메모만 별도로 저장하는 API는
                      없습니다. 답변 등록 시 함께 저장됩니다.
                    </p>
                  </section>

                  <section>
                    <h3>관리자 답변</h3>

                    <textarea
                      value={answer}
                      onChange={(event) =>
                        setAnswer(event.target.value)
                      }
                      placeholder="답변 내용을 입력해주세요."
                      rows={8}
                    />

                    <div>{answer.length}자</div>
                  </section>

                  <footer className="drawer-footer">
                    <button
                      type="button"
                      disabled={
                        isSaving || !answer.trim()
                      }
                      onClick={handleAnswerSubmit}
                    >
                      {isSaving
                        ? '등록 중...'
                        : '답변 완료'}
                    </button>
                  </footer>
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export default InquiryDetailDrawer