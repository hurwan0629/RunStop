import {useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../api/authApi'


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

  // 백엔드 수정 전까지 사용하는 임시 관리자 로그인 -> import jwt 파트 
  // if (import.meta.env.DEV) {
  //   if (
  //     loginId === 'admin' &&
  //     password === 'admin0000'
  //   ) {
  //     localStorage.setItem(
  //       'adminAccessToken',
  //       'mock-admin-token',
  //     )

  //     localStorage.setItem(
  //       'adminUser',
  //       JSON.stringify({
  //         loginId: 'admin',
  //         nickname: '관리자',
  //         role: 'ADMIN',
  //       }),
  //     )

  //     navigate('/')
  //     return
  //   }

  //   setErrorMessage(
  //     '아이디 또는 비밀번호가 일치하지 않습니다.',
  //   )
  //   return
  // }


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

    localStorage.setItem(
      'adminAccessToken',
      loginData.accessToken,
    )

    localStorage.setItem(
      'adminUser',
      JSON.stringify(loginData.user),
    )

    navigate('/')
  } catch (error) {
    setErrorMessage(
      error.response?.data?.message ??
        '로그인 중 오류가 발생했습니다.',
    )
  } finally {
    setIsLoading(false)
  }
}

  return(
    <main className="login-page">
      {/* 로그인 페이지 사이드 */}
      <section className='login-brand-section'>
        <div className='login-brand'>
          <div className="login-logo">R</div>

          <h1>RunStop</h1>
          <strong>ADMIN</strong>

          <p>러닝 코스 추천 서비스
              <br />
              RunStop 관리자 전용 페이지입니다
          </p>
        
        </div>
      </section>
      {/* 로그인  섹션 */}
      <section className='login-form-section'>
        <div className="login-form-container">
          <h2>관리자 로그인</h2>
          <p>RunStop 서비스 운영을 위한 관리자 전용 페이지입니다.</p>

          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="loginId">아이디 또는 이메일</label>

              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="아이디 또는 이메일을 입력하세요"
                autoComplete="username"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">비밀번호</label>

              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="비밀번호 표시 전환"
                >
                  {showPassword ? '숨기기' : '보기'}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p role="alert">{errorMessage}</p>
            )}

           <button type="submit" disabled={isLoading}>
          {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p>관리자 계정 문의: admin@runstop.com</p>
        </div>
        </section>
    </main>
  )

}
export default LoginPage; 