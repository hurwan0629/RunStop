let loading

/** React 재마운트 시에도 공식 지도 SDK는 한 번만 로드한다. */
export function loadNaverMaps() {
  if (loading) return loading
  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID?.trim()
  if (!clientId) return Promise.reject(new Error('네이버 지도 Client ID가 설정되지 않았습니다.'))

  const script = document.createElement('script')
  loading = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('네이버 지도 연결 시간이 초과되었습니다.')), 15000)
    const fail = message => {
      window.clearTimeout(timer)
      reject(new Error(message))
    }

    // 비동기 콜백 뒤 SDK 본문의 전역 객체 등록까지 완료한 후 지도를 만든다.
    window.runstopNaverMapReady = () => queueMicrotask(() => {
      if (!window.naver?.maps) {
        fail('네이버 지도 SDK를 초기화하지 못했습니다. 웹 지도 인증 설정을 확인해 주세요.')
        return
      }
      window.clearTimeout(timer)
      resolve(window.naver.maps)
      delete window.runstopNaverMapReady
    })
    window.navermap_authFailure = () => {
      window.dispatchEvent(new Event('runstop:map-auth-error'))
      fail('네이버 지도 인증을 확인해 주세요. 웹 지도 사용 설정과 서비스 URL 등록이 필요합니다.')
    }
    script.onerror = () => fail('네이버 지도에 연결하지 못했습니다. 네트워크 연결을 확인해 주세요.')
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&callback=runstopNaverMapReady`
    script.async = true
    document.head.appendChild(script)
  }).catch(error => {
    script.remove()
    delete window.runstopNaverMapReady
    loading = undefined
    throw error
  })
  return loading
}
