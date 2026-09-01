# 서비스 플로우 정리하기
> 현재 프론트와 데이터베이스 상태를 명확하게 알아야 서버에서 어떤 작업을 해주어야할지 명확하게 정의될 것 같아서 플로우들을 정리하려 합니다.

프론트에 있는 플로우를 나열하면
1. 회원가입 [x]
2. 로그인 [x]
3. 로그아웃 [x]
4. 아이디/비밀번호 찾기 [x]
4. 프로필 조회 및 수정 [x]
5. 러닝 목표설정 [x]
6. 장소 즐겨찾기 [x]
7. 코스 추천 요청 및 생성 -> 조회 -> 선택
8. 경로 즐겨찾기를 통한 러닝 
9. 러닝 시작 -> 실시간 기록 
10. 러닝 종료 / 결과 저장
11. 러닝 기록 조회
12. 문의

### 1. 회원가입
1. 폼 입력 `닉네임, 아이디, 비밀번호, 전화번호 (인증)`
2. 몸무게 및 신장 입력 (정수)
받을 때 다음과 같은 데이터를 받음
```
1. 아이디 중복 확인
POST /api/auth/check-login-id

2. 전화번호 인증번호 요청
POST /api/auth/phone/send
+ verificationId 반환 + 인증번호 sms 발송

3. 인증번호 검증
POST /api/auth/phone/verify
+ verificationId + code인증

4. 최종 회원가입
POST /api/auth/signup
→ loginId + password + nickname + ... + verificationId
```
### 2. 로그인
아이디 + 비밀번호 입력 -> 검증
`Authorization: Bearer <token>` 발급 및 ReactNative가 계속 사용
jwt 만료는 하루로, refresh 는 없이

### 3. 아이디/비밀번호 찾기
아이디 찾기는 다음과 같이
```
POST /api/auth/find-id/phone/send
POST /api/auth/find-id/phone/verify
```

비밀번호는 아래와 같이
```
POST /api/auth/password/check-login-id # 이거 삭제 후 아래으 /password/phone/send와 병합
POST /api/auth/password/phone/send
POST /api/auth/password/phone/verify
POST /api/auth/password/reset
```

### 4. 로그아웃
> 클라이언트에서 JWT 버리기

### 5. 회원탈퇴
아래와 같이 설정
- phone = NULL
- login_id = withdraw_[idx]_[random]
- status = WITHDRAWN
- withdrawn_at = now()
- password_hash = `crypto.randomBytes(32).toString("hex")` (사용 불가 값)

관련 데이터는 삭제하지 않는 방향으로.

### 6. 마이페이지 조회
``````md
GET /api/users/me/mypage
Authorization: Bearer <token>
```json
{
  "user": {
    "id": 15,
    "loginId": "user1234",
    "nickname": "runner",
    "exp": 1250
  },
  "goal": {
    "type": "WEEKLY",
    "targetDistance": 30.0,
    "runningDistance": 17.4
  },
  "running": {
    "totalCount": 24,
    "totalDistance": 183.7
  },
  "bookmark": {
    "routeCount": 5
  },
  "pace": {
    "bestPace": 285
  }
}
```
``````
**상단 바**
```md
- exp
- 닉네임
- 아이디
- 식별자
```

**목표**
```md
- 목표 종류[주간 / 월간]
- 목표 거리
- 달린 거리
```

**러닝 기록**
```md
- 총 러닝 횟수
- 총 달린 거리
```

**즐겨찾기 코스**
```md
- 나의 즐겨찾기 코스 개수
```

**페이스 분석**
```
- 최고 페이스
```

### 7. 프로필 편집
```
PATCH /api/users/me
Authorization: Bearer <token>
```
닉네임 변경 후 저장하기

### 8. 러닝 기록
총 거리, 총 러닝 횟수, 최장거리

running_sessions
- 날짜: running_sessions.started_at 에서 가져오기
- 거리: running_trackpoints 집계를 통해 거리 측정
- 이름: running_recommendations에 추천명 추가
- 시간: running_sessions.started_at ~ running_sessions.finished_at 로 확인
- 페이스: running_sessions.average_pace 에서 가져오기

### 9. 러닝 완료 (상세)
기본으로 제공해주는 데이터
```
- 즐겨찾기 상태: route_bookmarks 에서 가져오기
- 러닝 코스 이름: running_recommendations.name 에서 가져오기
- 총 걸린 시간: running_sessions.finished_at - running_sessions.started_at 에서 계산 (초단위)
- 총 평균 페이스: running_sessions.average_pace
- 소모 칼로리: ??? 일단 없애는 쪽으로
- 구간별 페이스: running_trackpoints를 집계에서 제공하기 (비정규화 없이)
- 의견이 이미 작성된 코스인지: running_recommendations.user_review 테이블에서 가져오기
```

**이번 코스 의견을 남겨서 사용자 러닝 선호도에 적용시키기**
```
입력창 후 의견 보내기 (이미 의견 등록된 running_recommendations.user_review의 경우에는 리뷰하지 못하게 하기 + running_sessions.finished_at가 있어야지만 등록 가능하게 해주기)
```

### 10. 즐겨찾기 코스
**즐겨찾기 목록**
```
즐겨찾기 list 보내주기
- running_recommendations.route를 위경도 리스트로 보내주어서 프론트에서 렌더링 할 수 있게 보내주기
- running_recommendations.name
- running_recommendations.user_review 와 running_recommendations.user_score가 있다면 보내주기
- running_recommendations의 feature_scores및 feature_values, total_ascent, slope_std 보내주기
```

**즑겨찾기 삭제**
```
그냥 row 삭제해주기 (사용자 인증하기 + route_bookmarks에 있건없건 delete 넣어주기)
```

### 11. 페이스 분석
**상단**
```
최근 6개월동안 각 월별 running_sessions.average_page 집계해서 평균 보내주기

구간별 페이스 평균의 경우에는 가장 최근 한 기록의 running_sessions만 가져와서 KM 단위로 프론트로 보내주기
```

### 12. 러닝 목표
**목표 확인 요청**
```
페이지에 들어왔을 때 이미 설정된 목표가 있는지 로컬 저장소를 확인하거나 서버쪽에 요청을 하여서 확인함. (이때 마지막 goals의 finished_at 및 end_date시간을 함께 확인하여 지나있으면 FAILED로 설정 및 finished_at을 업데이트 해주기 + 메인 페이지 접근시에도 동일하게 진행시켜주기)

서버에서는 running_goals를 통해 end_date 또는 finished_at가 최근에 포함되는 것이 있으면 running_goals.target_distance와 최근에 달린 running_sessions(IN_PROGRESS가 아닌)를 모두 참조하여 거리를 집계한 후 반환해주기 
```

**중지 요청**
```
목표가 진행중인 상태를 유지중일 때 프론트 쪽에서 중지 버튼을 통해서 해당 러닝 목표의 상태를 `STOPPED`로 설정해주고 finished_at 갱신해주기.
```

**목표 설정 요청**
```
사용자가 주간/월간을 선택하며 목표 거리를 설정하여 받게되면 이를 서버에서 이미 존재하는 거리가 존재하지 않는지 확인한 후 반환하게 설정해주기
```


### 13. 메인페이지 조회
```md
오늘 / 이번주 / 이번달 달린 거리 보여주기

```

**러닝 목표**
```md
- 러닝 목표: running_goal.target_distance에서 가져오기 
- 총 달린 거리: running_goal.start_date 이후에 달린 모든 running_sessions에서 집계하여 가져오기
```

**최근 러닝**
```
- 최근에 달린 러닝 하나 보여주기: running_sessions에서 IN_PROGRESS가 아닌 상태를 하나 가장 최근 기준으로 가져와서 running_recommendations.name, running_sessions의 [started_at, total_distance, average_pace, status] 보내주기
```

**즐겨찾기 코스**
```md
가장 최근에 등록한 (idx기준) 즐겨찾기 3개 보내주기
- running_recommendations.name에서 이름
- running_recommendations.total_distance 에서 거리
- feature_scores및 feature_values, total_ascent, slope_std 보내주기. (route는 제외)
```

### 14. 코스 설정
**1/4**
사용자가 저장한 즐겨찾기 포인트 위경도와 함께 보내주기

**2/4**
조건 설정 후 보내주기
```
- 시작 - 경유지0~2개 - 목표
- 러닝 조건: 문자열
- 경사도 설정
- 시설 종류 (현재 데이터베이스에 있는 )
  - CCTV + 가로등 + 보안등
  - 편의점
  - 화장실
  - 공원
  - (보행자 전용 도로는 제거)
- 사용자 요구사항 (llm을 이용하여 json으로 서버에서 정리)
```

**3/4**
사용자의 선택 화면 보여주기 - (입력 조건이 탐색 및 출력 가능한지 나타내주기)

안되면 안된다고 보내고 다시 검색창으로 이동하기

**4/4**
코스 3개 보내주기
```
- 점수
- 총 거리: route_recommendations.total_distance
- 상승 고도: route_recommendations.total_ascent
- 시설 종류 (feature_scores및 feature_values, total_ascent, slope_std 보내주기)
- 추천 이유 함께 보내줄 수 있으면 보내주거나 프론트에서 위를 참고하여 보내주기
```

### 15. 코스 상세
- 특정 route_recommendations.idx에 대한 데이터 정보 보내주기
```
- 모든 route_recommendations.route LineString 위경도 정보
- 위에서 보여줫던 데이터들 다시 보여주기
```

즐겨찾기 우상단 표시 (버튼)
```
토글을 통해 껐다 키면서 route_bookmarks에 따라 토글할 수 있게 해주기
```

### 16. 실시간 러닝
시간이 실시간으로 나오며 네트워크 상태에 따라 React Native에서 데이터를 내부에 저장하거나 서버로 지속적으로 저장 요청을 하는 방식으로 진행. (gps 위치)

시간 등도 캐싱해 두었다가 한번에 보내서 저장할 수 있는 방식으로.

# 특이사항
**추가할 요소**
- running_recommendations.name 
- running_sessions.status `IN_PROGRESS` `COMPLETED` `STOPPED` `FAILED`
- running_sessions.distance_m 집계 컬럼 하나 만들기 (러닝 종료 할 때 저장)
- 러닝 종료 (기록)에서 소모 칼로리와 평균 케이던스, 평균 심박수는 러닝 코스 설명력으로 가야할 듯 함
- running_recommendations.user_review 추가해야함. 한번의 러닝 코스에 대해서 사용자 의견은 한번만 등록 가능
- 메인 페이지의 오늘/이번주/이번달 3개를 한번에 보여주는데 목표는 주/월 목표 하나만 설정 가능함.
- 러닝 목표를 등록하지 않았을 때 메인 페이지의 출력이 필요함 (+러닝 목표의 시작일/종료일도 서버에서 주게 만들 생각)
- 즐겨찾기 코스에 별 보여주기 있는데 아예 별점하고 의견을 동시에 보내게 해서 더 객관적인 평가 하게 하는건 어떤가요? 그냥 코스 의견에 별점도 같이 보내주는 쪽으로. (+ 의견 및 별점 남기지 않았을 때 즐겨찾기에서 렌더링 되는 방식도 있어야해요)
- 페이스 분석에서 구간별 페이스를 가장 최근 기록의 구간별 페이스 또는 특정 기록에 대한 구간별 페이스로 바꾸는 것이 좋아 보입니다. 행을 많이 참조하여 계산을 해야해서 속도 저하의 우려가 있습니다.
- 러닝 목표가 이미 정해져있는 경우에 목표 실행량 + 포기 버튼이 있어야한다고 생각합니다.
- 즐겨찾기 경유지 설정이 있어야할 것 같습니다.