# Solapi SMS 연동 정리

## 대상 파일

```text
backend/src/adapters/sms/sms.client.ts
backend/src/services/phone-verification.service.ts
```

## `sms.client.ts`

`SMS_API_ENABLED=false`이면 콘솔 출력 방식을 유지한다.

```ts
if (env.SMS_API_ENABLED) {
  await sendVerificationSmsByApi(input);
  return;
}

await sendVerificationSmsByConsole(input);
```

Solapi API 호출은 Node 기본 `crypto`와 `fetch`만 사용한다.

추가 dependency는 없다.

## Solapi 인증 헤더

매 요청마다 다음 값을 생성한다.

```text
date = new Date().toISOString()
salt = randomBytes(16).toString("hex")
signature = HMAC-SHA256(apiSecret, date + salt)
```

Authorization 헤더:

```ts
return `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
```

## 발송 API

사용 엔드포인트:

```text
POST https://api.solapi.com/messages/v4/send-many/detail
```

요청 body:

```ts
{
  messages: [{
    to: normalizePhoneNumber(input.phone),
    from: normalizePhoneNumber(env.SOLAPI_FROM_NUMBER!),
    text: `[RunStop] 인증번호는 ${input.code}입니다.`,
  }],
}
```

전화번호는 숫자만 남긴다.

```ts
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}
```

## 실패 처리

Solapi 응답이 실패이면 `SMS_SEND_FAILED`를 던진다.

```text
status: 502
code: SMS_SEND_FAILED
details.status: Solapi HTTP status
details.body: 응답 body 앞 500자
```

## 인증 record 저장 순서

기존 흐름은 verification record를 먼저 저장한 뒤 SMS를 보냈다.

변경 후:

```text
1. verificationId 생성
2. code 생성
3. SMS 발송
4. 발송 성공 시 verificationStore 저장
5. verificationId 반환
```

이유:

```text
SMS 발송 실패 시 사용자가 받을 수 없는 코드가 verificationStore에 남지 않게 한다.
```

## 공식 문서 기준

- Solapi API Key 인증: https://solapi.com/developers/api/authentication-api-key
- Solapi 메시지 발송: https://solapi.com/developers/api/messages
