import { createHmac, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../middleware/error.js";

type SendVerificationSmsInput = {
  phone: string;
  code: string;
};

const SOLAPI_MESSAGES_URL = "https://api.solapi.com/messages/v4/send-many/detail";

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

function createSolapiAuthHeader(): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", env.SOLAPI_API_SECRET!)
    .update(date + salt)
    .digest("hex");

  return `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendVerificationSmsByConsole(
  input: SendVerificationSmsInput,
): Promise<void> {
  console.log(`[SMS 인증번호] phone=${input.phone}, code=${input.code}`);
}

async function sendVerificationSmsByApi(
  input: SendVerificationSmsInput,
): Promise<void> {
  const response = await fetch(SOLAPI_MESSAGES_URL, {
    method: "POST",
    headers: {
      Authorization: createSolapiAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{
        to: normalizePhoneNumber(input.phone),
        from: normalizePhoneNumber(env.SOLAPI_FROM_NUMBER!),
        text: `[RunStop] 인증번호는 ${input.code}입니다.`,
      }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new ApiError({
      status: 502,
      code: "SMS_SEND_FAILED",
      message: "SMS 발송에 실패했습니다.",
      details: {
        status: response.status,
        body: body.slice(0, 500),
      },
    });
  }
}

/**
 * 전화번호 인증 SMS 메시지를 발송합니다.
 */
export async function sendVerificationSms(
  input: SendVerificationSmsInput,
): Promise<void> {
  if (env.SMS_API_ENABLED) {
    await sendVerificationSmsByApi(input);
    return;
  }

  await sendVerificationSmsByConsole(input);
}
