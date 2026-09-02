import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type InquiryStatus = "PENDING" | "IN_PROGRESS" | "ANSWERED";

export type InquiryListRow = {
  idx: number;
  title: string;
  status: InquiryStatus;
  createdAt: Date;
};

export type InquiryDetailRow = InquiryListRow & {
  userIdx: number;
  content: string;
  answer: string | null;
  answererIdx: number | null;
  memo: string | null;
  answeredAt: Date | null;
};

export type FindInquiriesInput = {
  userIdx?: number | undefined;
  status?: InquiryStatus | undefined;
  page: number;
  limit: number;
};

export type CreateInquiryInput = {
  userIdx: number;
  title: string;
  content: string;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapInquiryListRow(row: {
  idx: number;
  title: string;
  status: InquiryStatus;
  created_at: Date;
}): InquiryListRow {
  return {
    idx: row.idx,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapInquiryDetailRow(row: {
  idx: number;
  users_idx: number;
  title: string;
  content: string;
  status: InquiryStatus;
  answer: string | null;
  answerer_idx: number | null;
  memo: string | null;
  created_at: Date;
  answered_at: Date | null;
}): InquiryDetailRow {
  return {
    idx: row.idx,
    userIdx: row.users_idx,
    title: row.title,
    content: row.content,
    status: row.status,
    answer: row.answer,
    answererIdx: row.answerer_idx,
    memo: row.memo,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
  };
}

/**
 * 사용자 또는 관리자의 문의 목록 항목을 조회합니다.
 */
export async function findInquiries(
  input: FindInquiriesInput,
  client?: QueryClient,
): Promise<InquiryListRow[]> {
  const offset = (input.page - 1) * input.limit;
  const result = await getQueryClient(client).query<{
    idx: number;
    title: string;
    status: InquiryStatus;
    created_at: Date;
  }>(
    `
      SELECT
        idx,
        title,
        status,
        created_at
      FROM service.inquiries
      WHERE ($1::integer IS NULL OR users_idx = $1)
        AND ($2::service.inquiry_status IS NULL OR status = $2)
      ORDER BY created_at DESC, idx DESC
      LIMIT $3
      OFFSET $4
    `,
    [input.userIdx ?? null, input.status ?? null, input.limit, offset],
  );

  return result.rows.map(mapInquiryListRow);
}

/**
 * 사용자 문의를 추가합니다.
 */
export async function createInquiry(
  input: CreateInquiryInput,
  client?: QueryClient,
): Promise<InquiryDetailRow> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    title: string;
    content: string;
    status: InquiryStatus;
    answer: string | null;
    answerer_idx: number | null;
    memo: string | null;
    created_at: Date;
    answered_at: Date | null;
  }>(
    `
      INSERT INTO service.inquiries (
        users_idx,
        title,
        content,
        status
      )
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING
        idx,
        users_idx,
        title,
        content,
        status,
        answer,
        answerer_idx,
        memo,
        created_at,
        answered_at
    `,
    [input.userIdx, input.title, input.content],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("문의 생성 결과를 확인할 수 없습니다.");
  }

  return mapInquiryDetailRow(row);
}

/**
 * 기본 키로 문의 상세 데이터를 조회합니다.
 */
export async function findInquiryByIdx(
  inquiryIdx: number,
  client?: QueryClient,
): Promise<InquiryDetailRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    title: string;
    content: string;
    status: InquiryStatus;
    answer: string | null;
    answerer_idx: number | null;
    memo: string | null;
    created_at: Date;
    answered_at: Date | null;
  }>(
    `
      SELECT
        idx,
        users_idx,
        title,
        content,
        status,
        answer,
        answerer_idx,
        memo,
        created_at,
        answered_at
      FROM service.inquiries
      WHERE idx = $1
      LIMIT 1
    `,
    [inquiryIdx],
  );

  const row = result.rows[0];

  return row ? mapInquiryDetailRow(row) : null;
}

/**
 * 문의 처리 상태를 갱신합니다.
 */
export async function updateInquiryStatus(
  inquiryIdx: number,
  status: InquiryStatus,
  client?: QueryClient,
): Promise<InquiryDetailRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    title: string;
    content: string;
    status: InquiryStatus;
    answer: string | null;
    answerer_idx: number | null;
    memo: string | null;
    created_at: Date;
    answered_at: Date | null;
  }>(
    `
      UPDATE service.inquiries
      SET status = $2::service.inquiry_status
      WHERE idx = $1
      RETURNING
        idx,
        users_idx,
        title,
        content,
        status,
        answer,
        answerer_idx,
        memo,
        created_at,
        answered_at
    `,
    [inquiryIdx, status],
  );

  const row = result.rows[0];

  return row ? mapInquiryDetailRow(row) : null;
}

/**
 * 문의 답변 필드를 갱신합니다.
 */
export async function answerInquiry(
  inquiryIdx: number,
  answer: string,
  memo: string | undefined,
  answererIdx: number,
  client?: QueryClient,
): Promise<InquiryDetailRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    title: string;
    content: string;
    status: InquiryStatus;
    answer: string | null;
    answerer_idx: number | null;
    memo: string | null;
    created_at: Date;
    answered_at: Date | null;
  }>(
    `
      UPDATE service.inquiries
      SET
        answer = $2,
        memo = COALESCE($3, memo),
        answerer_idx = $4,
        status = 'ANSWERED',
        answered_at = now()
      WHERE idx = $1
        AND answer IS NULL
      RETURNING
        idx,
        users_idx,
        title,
        content,
        status,
        answer,
        answerer_idx,
        memo,
        created_at,
        answered_at
    `,
    [inquiryIdx, answer, memo ?? null, answererIdx],
  );

  const row = result.rows[0];

  return row ? mapInquiryDetailRow(row) : null;
}
