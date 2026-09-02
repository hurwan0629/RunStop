# DTO 스키마

DTO는 Controller 요청 검증과 Service 인자 타입의 기준입니다.

## Auth DTO

### `loginSchema`

- 타입: `LoginDTO`
- 사용 함수:
  - `login`
  - `loginUser`
- 스키마:

```json
{
  "loginId": "string",
  "password": "string"
}
```

### `loginIdCheckSchema`

- 타입: `LoginIdCheckDTO`
- 사용 함수:
  - `checkLoginId`
  - `checkLoginIdAvailability`
- 스키마:

```json
{
  "loginId": "string"
}
```

### `phoneVerificationSendSchema`

- 타입: `PhoneVerificationSendDTO`
- 사용 함수:
  - `sendSignupPhoneVerification`
  - `sendFindIdPhoneVerification`
- 스키마:

```json
{
  "phone": "string"
}
```

### `passwordResetPhoneVerificationSendSchema`

- 타입: `PasswordResetPhoneVerificationSendDTO`
- 사용 함수:
  - `sendPasswordResetPhoneVerification`
- 스키마:

```json
{
  "loginId": "string",
  "phone": "string"
}
```

### `phoneVerificationVerifySchema`

- 타입: `PhoneVerificationVerifyDTO`
- 사용 함수:
  - `verifySignupPhoneCode`
  - `verifyFindIdPhoneCode`
  - `verifyPasswordResetPhoneCode`
- 스키마:

```json
{
  "verificationId": "uuid",
  "code": "123456"
}
```

### `signupSchema`

- 타입: `SignupDTO`
- 사용 함수:
  - `signup`
  - `signupUser`
- 스키마:

```json
{
  "loginId": "string",
  "password": "string",
  "nickname": "string",
  "phone": "string",
  "verificationId": "uuid",
  "profile": {
    "weightKg": 72.5,
    "heightCm": 175.3
  }
}
```

### `passwordResetSchema`

- 타입: `PasswordResetDTO`
- 사용 함수:
  - `resetPassword`
  - `resetUserPassword`
- 스키마:

```json
{
  "verificationId": "uuid",
  "newPassword": "string"
}
```

### `authResponseSchema`

- 타입: `AuthResponseDTO`
- 반환 함수:
  - `loginUser`
  - `signupUser`
- 스키마:

```json
{
  "accessToken": "string",
  "user": {
    "idx": 1,
    "nickname": "string",
    "role": "USER"
  }
}
```

## 기타 DTO

아래 DTO는 skeleton 도메인 구현 시 Controller와 Service 인자 타입으로 사용합니다.

- `paginationSchema`
- `coordinateSchema`
- `userProfileSchema`
- `userProfileUpdateSchema`
- `userResponseSchema`
- `runningStartSchema`
- `runningTrackpointsSchema`
- `runningFinishSchema`
- `runningHistoryItemSchema`
- `runningSessionSchema`
- `routeRequestSchema`
- `routeRequestPointSchema`
- `routeSelectSchema`
- `routeRecommendationSchema`
- `routeDetailSchema`
- `pointBookmarkSchema`
- `routeBookmarkSchema`
- `inquiryCreateSchema`
- `inquiryListItemSchema`
- `inquiryDetailSchema`
- `inquiryStatusUpdateSchema`
- `inquiryAnswerSchema`
- `workerRouteRequestSchema`
- `workerRouteResponseSchema`
- `routeFeatureSchema`

## Users 마이페이지 DTO

### `myPageResponseSchema`

- 타입: `MyPageResponseDTO`
- 반환 함수:
  - `getMyPageSummary`
  - `getMyPage`
- 스키마:

```json
{
  "user": {
    "idx": 1,
    "loginId": "runner01",
    "nickname": "러너",
    "role": "USER",
    "totalExp": 1200
  },
  "profile": {
    "weightKg": 72.5,
    "heightCm": 175.3,
    "runningSettings": {},
    "profileImageUrl": null
  },
  "currentGoal": {
    "idx": 3,
    "goalType": "MONTHLY",
    "startDate": "2026-09-01",
    "endDate": "2026-09-30",
    "progressDistance": 23500,
    "targetDistance": 100000
  },
  "runningSummary": {
    "totalCount": 18,
    "totalDistance": 84500,
    "bestPace": 312
  },
  "bookmarkSummary": {
    "routeBookmarkCount": 6
  }
}
```

## Users 수정 DTO

### `userProfileUpdateSchema`

- 타입: `UserProfileUpdateDTO`
- 사용 함수:
  - `updateMe`
  - `updateCurrentUser`
- 스키마:

```json
{
  "nickname": "러너",
  "weightKg": 72.5,
  "heightCm": 175.3,
  "runningSettings": {
    "targetDistanceM": 5000,
    "maxSlopePercent": 8
  }
}
```

### `userUpdateResponseSchema`

- 타입: `UserUpdateResponseDTO`
- 반환 함수:
  - `updateCurrentUser`
  - `updateMe`
- 스키마:

```json
{
  "user": {
    "idx": 1,
    "nickname": "러너"
  },
  "profile": {
    "weightKg": 72.5,
    "heightCm": 175.3,
    "runningSettings": {},
    "profileImageUrl": null
  }
}
```
