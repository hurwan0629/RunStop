import React from 'react'

function DashboardPage() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-title">
        <h1>대시보드</h1>
        <p>
          오늘의 RunStop 운영 현황을 확인하세요.
        </p>
      </div>

      <section className="dashboard-summary">
        <div className="dashboard-card">
          <span>전체 회원 수</span>
          <strong>-</strong>
          <small>
            회원관리 API 연결 예정
          </small>
        </div>

        <div className="dashboard-card">
          <span>오늘 가입한 회원</span>
          <strong>-</strong>
          <small>
            회원관리 API 연결 예정
          </small>
        </div>

        <div className="dashboard-card">
          <span>답변 대기 문의</span>
          <strong>-</strong>
          <small>
            집계 API 연결 예정
          </small>
        </div>

        <div className="dashboard-card">
          <span>오늘 처리 완료 문의</span>
          <strong>-</strong>
          <small>
            집계 API 연결 예정
          </small>
        </div>
      </section>
    </main>
  )
}

export default DashboardPage