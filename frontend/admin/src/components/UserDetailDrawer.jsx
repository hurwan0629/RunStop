import {
  useEffect,
  useState,
} from 'react'

import {
  getAdminUserDetail,
  updateAdminUserStatus,
} from '../api/usersApi'

import './UserDetailDrawer.css'

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

  return new Date(
    dateString,
  ).toLocaleDateString('ko-KR')
}

function formatDistance(meter) {
  return (meter / 1000).toFixed(1)
}

function UserDetailDrawer({
  userIdx,
  onClose,
  onUpdated,
}) {
  const [detail, setDetail] = useState(null)
  const [reason, setReason] = useState('')
  const [suspendedUntil, setSuspendedUntil] =
    useState('')
  const [actionMode, setActionMode] =
    useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] =
    useState('')

  const loadUserDetail = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const data = await getAdminUserDetail(userIdx)

      setDetail(data)
    } catch (error) {
      console.error('회원 상세 조회 오류:', error)

      setErrorMessage(
        error.response?.data?.error?.message ??
          '회원 정보를 불러오지 못했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUserDetail()
  }, [userIdx])

  const closeActionForm = () => {
    setActionMode(null)
    setReason('')
    setSuspendedUntil('')
  }

  const handleStatusUpdate = async () => {
    if (!detail || !actionMode) {
      return
    }

    if (!reason.trim()) {
      alert('상태 변경 사유를 입력해주세요.')
      return
    }

    const isSuspending =
      actionMode === 'SUSPENDED'

    const confirmed = window.confirm(
      isSuspending
        ? '이 회원을 이용 정지할까요?'
        : '이 회원의 이용 정지를 해제할까요?',
    )

    if (!confirmed) {
      return
    }

    try {
      setIsSaving(true)

      await updateAdminUserStatus(
        userIdx,
        isSuspending
          ? {
              status: 'SUSPENDED',
              suspendedUntil: suspendedUntil
                ? new Date(
                    suspendedUntil,
                  ).toISOString()
                : null,
              reason: reason.trim(),
            }
          : {
              status: 'ENABLED',
              reason: reason.trim(),
            },
      )

      await loadUserDetail()
      onUpdated?.()
      closeActionForm()

      alert(
        isSuspending
          ? '이용 정지 처리되었습니다.'
          : '이용 정지가 해제되었습니다.',
      )
    } catch (error) {
      console.error('회원 상태 변경 오류:', error)

      alert(
        error.response?.data?.error?.message ??
          '회원 상태를 변경하지 못했습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const user = detail?.user
  const isWithdrawn = user?.status === 'WITHDRAWN'
  const isSuspended = user?.status === 'SUSPENDED'

  return (
    <div
      className="user-detail-backdrop"
      onClick={onClose}
    >
      <aside
        className="user-detail-drawer"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className="user-drawer-header">
          <h2>회원 상세 정보</h2>

          <button
            type="button"
            className="user-drawer-close-button"
            onClick={onClose}
            aria-label="회원 상세 정보 닫기"
          >
            ×
          </button>
        </header>

        <div className="user-drawer-content">
          {isLoading && (
            <p className="user-drawer-message">
              회원 정보를 불러오는 중입니다.
            </p>
          )}

          {errorMessage && (
            <p className="user-drawer-message error">
              {errorMessage}
            </p>
          )}

          {!isLoading && user && (
            <>
              <section className="drawer-user-profile">
                <span className="drawer-user-avatar">
                  {user.nickname.charAt(0)}
                </span>

                <div>
                  <h3>{user.nickname}</h3>
                  <p>{user.loginId}</p>
                </div>
              </section>

              <section className="drawer-basic-info">
                <div>
                  <span>회원 ID</span>
                  <strong>
                    {formatUserId(user.userIdx)}
                  </strong>
                </div>

                <div>
                  <span>계정 상태</span>
                  <strong
                    className={
                      `drawer-status ${user.status.toLowerCase()}`
                    }
                  >
                    {statusLabels[user.status]}
                  </strong>
                </div>

                <div>
                  <span>가입일</span>
                  <strong>
                    {formatDate(user.joinedAt)}
                  </strong>
                </div>

                <div>
                  <span>최근 접속일</span>
                  <strong>
                    {formatDate(user.lastLoginAt)}
                  </strong>
                </div>
              </section>

              <section className="drawer-section">
                <h3>러닝 기록 요약</h3>

                <div className="drawer-running-grid">
                  <article>
                    <strong>
                      {
                        detail.runningSummary
                          .completedRunCount
                      }
                    </strong>
                    <span>총 러닝 횟수</span>
                  </article>

                  <article>
                    <strong>
                      {formatDistance(
                        detail.runningSummary
                          .totalDistanceMeter,
                      )}
                    </strong>
                    <span>총 거리(km)</span>
                  </article>
                </div>
              </section>

              <section className="drawer-section">
                <h3>
                  작성한 문의 내역 (
                  {detail.recentInquiries.length})
                </h3>

                {detail.recentInquiries.length === 0 ? (
                  <p className="drawer-empty-text">
                    작성한 문의가 없습니다.
                  </p>
                ) : (
                  <ul className="drawer-inquiry-list">
                    {detail.recentInquiries.map(
                      (inquiry) => (
                        <li key={inquiry.inquiryIdx}>
                          <strong>{inquiry.title}</strong>

                          <span>
                            {formatDate(
                              inquiry.createdAt,
                            )}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </section>

              <section className="drawer-section">
                <h3>관리자 메모</h3>

                <div className="drawer-memo-box">
                  {detail.adminMemo ||
                    '등록된 관리자 메모가 없습니다.'}
                </div>
              </section>

              <section className="drawer-section">
                <h3>계정 상태 변경</h3>

                {isWithdrawn ? (
                  <p className="drawer-disabled-message">
                    탈퇴 회원은 계정 상태를 변경할 수
                    없습니다.
                  </p>
                ) : (
                  <>
                    {!actionMode && (
                      <button
                        type="button"
                        className={
                          isSuspended
                            ? 'drawer-enable-button'
                            : 'drawer-suspend-button'
                        }
                        onClick={() =>
                          setActionMode(
                            isSuspended
                              ? 'ENABLED'
                              : 'SUSPENDED',
                          )
                        }
                      >
                        {isSuspended
                          ? '이용 정지 해제'
                          : '이용 정지'}
                      </button>
                    )}

                    {actionMode && (
                      <div className="drawer-action-form">
                        <label>
                          <span>변경 사유</span>

                          <textarea
                            value={reason}
                            onChange={(event) =>
                              setReason(
                                event.target.value,
                              )
                            }
                            placeholder="상태 변경 사유를 입력해주세요."
                            rows="3"
                          />
                        </label>

                        {actionMode ===
                          'SUSPENDED' && (
                          <label>
                            <span>
                              이용 정지 종료일
                              <small>
                                비워두면 기간 제한 없음
                              </small>
                            </span>

                            <input
                              type="datetime-local"
                              value={suspendedUntil}
                              onChange={(event) =>
                                setSuspendedUntil(
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        )}

                        <div className="drawer-action-buttons">
                          <button
                            type="button"
                            className="drawer-cancel-button"
                            onClick={closeActionForm}
                            disabled={isSaving}
                          >
                            취소
                          </button>

                          <button
                            type="button"
                            className={
                              actionMode ===
                              'SUSPENDED'
                                ? 'drawer-suspend-button'
                                : 'drawer-enable-button'
                            }
                            onClick={handleStatusUpdate}
                            disabled={isSaving}
                          >
                            {isSaving
                              ? '처리 중...'
                              : actionMode ===
                                  'SUSPENDED'
                                ? '이용 정지 확인'
                                : '정지 해제 확인'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export default UserDetailDrawer