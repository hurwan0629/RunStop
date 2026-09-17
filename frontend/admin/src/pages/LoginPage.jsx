import {useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../api/authApi'

import {
  saveAdminSession,
} from '../utils/adminSession'
import './LoginPage.css'

function LoginPage(){
  const navigate = useNavigate()
  
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

 

  const handleLogin = async (event) => {
  event.preventDefault()

  if (!loginId.trim()) {
    setErrorMessage('아이디를 입력해주세요.')
    return
  }

  if (!password.trim()) {
    setErrorMessage('비밀번호를 입력해주세요.')
    return
  }

 

  try {
    setIsLoading(true)
    setErrorMessage('')

    const responseData = await loginAdmin(
      loginId,
      password,
    )

    const loginData =
      responseData.data ?? responseData

    if (loginData.user?.role !== 'ADMIN') {
      setErrorMessage(
        '관리자 권한이 없는 계정입니다.',
      )
      return
    }

    saveAdminSession({
      accessToken: loginData.accessToken,
      user: loginData.user,
    })

    navigate('/dashboard',{
      replace: true,
    })
  } catch (error) {
    setErrorMessage(
      error.response?.data?.error?.message ??
        '로그인 중 오류가 발생했습니다.',
    )
  } finally {
    setIsLoading(false)
  }
}

  return (
  <div className="login-page">
    {/* 왼쪽 영역 */}

    <section className="login-brand-section">
      <svg
    className="login-route-lines"
    viewBox="0 0 1200 800"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
 <path d="M -80 390 C 140 205, 360 195, 540 335 S 850 575, 1220 330" />

<path
  d="M -80 390 C 140 205, 360 195, 540 335 S 850 575, 1220 330"
  transform="translate(0 58)"
/>

<path
  d="M -80 390 C 140 205, 360 195, 540 335 S 850 575, 1220 330"
  transform="translate(0 116)"
/>
  </svg>
      <div className="login-brand">
        <h1>RunStop</h1>
        <p>ADMIN</p>
        <span>러닝 코스 추천 서비스</span>
      </div>
    </section>

    {/* 오른쪽 로그인 영역 */}
    <section className="login-form-section">
      <div className="login-form-container">
        <h2>관리자 로그인</h2>
        <p className="login-description">
          RunStop 관리자 페이지입니다.
        </p>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력해주세요"
            />
          </div>

          <div className="login-field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해주세요"
            />
          </div>

          {errorMessage && (
            <p className="login-error">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </section>
  </div>
)

}
export default LoginPage; 