import type { InquiryAnswerDTO, InquiryAnswerResponseDTO } from "../dto/inquiries/inquiry-answer.dto.js";
import type { InquiryCreateDTO } from "../dto/inquiries/inquiry-create.dto.js";
import type { InquiryDetailDTO } from "../dto/inquiries/inquiry-detail.dto.js";
import type {
  InquiryListQueryDTO,
  InquiryListResponseDTO,
} from "../dto/inquiries/inquiry-list.dto.js";
import type {
  InquiryStatusUpdateDTO,
  InquiryStatusUpdateResponseDTO,
} from "../dto/inquiries/inquiry-status-update.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  answerInquiry as answerInquiryRepository,
  createInquiry as createInquiryRepository,
  findInquiries,
  findInquiryByIdx,
  updateInquiryStatus as updateInquiryStatusRepository,
  type InquiryDetailRow,
} from "../repositories/inquiries.repository.js";
import type { UserRole } from "../types/user-context.js";

function canReadInquiry(row: InquiryDetailRow, userIdx: number, role: UserRole): boolean {
  return role === "ADMIN" || row.userIdx === userIdx;
}

function toInquiryDetailDTO(row: InquiryDetailRow): InquiryDetailDTO {
  return {
    idx: row.idx,
    title: row.title,
    content: row.content,
    status: row.status,
    answer: row.answer,
    createdAt: row.createdAt.toISOString(),
    answeredAt: row.answeredAt ? row.answeredAt.toISOString() : null,
  };
}

/**
 * 사용자 또는 관리자의 문의 목록 항목을 반환합니다.
 */
export async function listInquiries(
  userIdx: number,
  role: UserRole,
  query: InquiryListQueryDTO,
): Promise<InquiryListResponseDTO> {
  const items = await findInquiries({
    userIdx: role === "ADMIN" ? undefined : userIdx,
    status: query.status,
    page: query.page,
    limit: query.limit,
  });

  return {
    items: items.map((item) => ({
      idx: item.idx,
      title: item.title,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 사용자 문의를 생성합니다.
 */
export async function createInquiry(
  userIdx: number,
  dto: InquiryCreateDTO,
): Promise<InquiryDetailDTO> {
  const inquiry = await createInquiryRepository({
    userIdx,
    title: dto.title,
    content: dto.content,
  });

  return toInquiryDetailDTO(inquiry);
}

/**
 * 문의 상세 데이터를 반환합니다.
 */
export async function getInquiryDetail(
  userIdx: number,
  role: UserRole,
  inquiryIdx: number,
): Promise<InquiryDetailDTO> {
  const inquiry = await findInquiryByIdx(inquiryIdx);

  if (!inquiry) {
    throw new ApiError({
      status: 404,
      code: "INQUIRY_NOT_FOUND",
      message: "문의를 찾을 수 없습니다.",
    });
  }

  if (!canReadInquiry(inquiry, userIdx, role)) {
    throw new ApiError({
      status: 403,
      code: "INQUIRY_ACCESS_DENIED",
      message: "문의 조회 권한이 없습니다.",
    });
  }

  return toInquiryDetailDTO(inquiry);
}

/**
 * 문의 처리 상태를 변경합니다.
 */
export async function updateInquiryStatus(
  inquiryIdx: number,
  dto: InquiryStatusUpdateDTO,
): Promise<InquiryStatusUpdateResponseDTO> {
  const inquiry = await findInquiryByIdx(inquiryIdx);

  if (!inquiry) {
    throw new ApiError({
      status: 404,
      code: "INQUIRY_NOT_FOUND",
      message: "문의를 찾을 수 없습니다.",
    });
  }

  const updated = await updateInquiryStatusRepository(inquiryIdx, dto.status);

  if (!updated) {
    throw new ApiError({
      status: 409,
      code: "INQUIRY_STATUS_UPDATE_FAILED",
      message: "문의 상태 변경에 실패했습니다.",
    });
  }

  return {
    idx: updated.idx,
    status: updated.status,
  };
}

/**
 * 문의에 대한 관리자 답변을 저장합니다.
 */
export async function answerInquiry(
  inquiryIdx: number,
  adminUserIdx: number,
  dto: InquiryAnswerDTO,
): Promise<InquiryAnswerResponseDTO> {
  const inquiry = await findInquiryByIdx(inquiryIdx);

  if (!inquiry) {
    throw new ApiError({
      status: 404,
      code: "INQUIRY_NOT_FOUND",
      message: "문의를 찾을 수 없습니다.",
    });
  }

  if (inquiry.answer !== null) {
    throw new ApiError({
      status: 409,
      code: "INQUIRY_ALREADY_ANSWERED",
      message: "이미 답변이 등록된 문의입니다.",
    });
  }

  const answered = await answerInquiryRepository(
    inquiryIdx,
    dto.answer,
    dto.memo,
    adminUserIdx,
  );

  if (!answered || !answered.answererIdx || !answered.answeredAt) {
    throw new ApiError({
      status: 409,
      code: "INQUIRY_ANSWER_FAILED",
      message: "문의 답변 저장에 실패했습니다.",
    });
  }

  return {
    idx: answered.idx,
    status: "ANSWERED",
    answererIdx: answered.answererIdx,
    answeredAt: answered.answeredAt.toISOString(),
  };
}
