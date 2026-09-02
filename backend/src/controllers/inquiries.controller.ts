import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  inquiryAnswerResponseSchema,
  inquiryAnswerSchema,
} from "../dto/inquiries/inquiry-answer.dto.js";
import { inquiryCreateSchema } from "../dto/inquiries/inquiry-create.dto.js";
import { inquiryDetailSchema } from "../dto/inquiries/inquiry-detail.dto.js";
import {
  inquiryListQuerySchema,
  inquiryListResponseSchema,
} from "../dto/inquiries/inquiry-list.dto.js";
import {
  inquiryStatusUpdateResponseSchema,
  inquiryStatusUpdateSchema,
} from "../dto/inquiries/inquiry-status-update.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  answerInquiry as answerInquiryService,
  createInquiry as createInquiryService,
  getInquiryDetail as getInquiryDetailService,
  listInquiries as listInquiriesService,
  updateInquiryStatus as updateInquiryStatusService,
} from "../services/inquiries.service.js";

const inquiryParamsSchema = z.object({
  inquiryIdx: z.coerce.number().int().positive(),
});

function getAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  return req.user;
}

function parseInquiryIdx(req: Request): number {
  const parseResult = inquiryParamsSchema.safeParse(req.params);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_INQUIRY_PARAMS",
      message: "문의 경로 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  return parseResult.data.inquiryIdx;
}

/**
 * 현재 사용자 또는 관리자 화면에 필요한 문의 목록을 반환합니다.
 */
export async function listInquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getAuthenticatedUser(req);
  const parseResult = inquiryListQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_INQUIRY_LIST_QUERY",
      message: "문의 목록 조회 조건이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await listInquiriesService(user.idx, user.role, parseResult.data);

  res.json({
    success: true,
    data: inquiryListResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자의 새 문의를 생성합니다.
 */
export async function createInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getAuthenticatedUser(req);
  const parseResult = inquiryCreateSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_INQUIRY_CREATE_REQUEST",
      message: "문의 생성 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await createInquiryService(user.idx, parseResult.data);

  res.json({
    success: true,
    data: inquiryDetailSchema.parse(result),
  });
}

/**
 * 문의 상세 데이터를 반환합니다.
 */
export async function getInquiryDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getAuthenticatedUser(req);
  const inquiryIdx = parseInquiryIdx(req);
  const result = await getInquiryDetailService(user.idx, user.role, inquiryIdx);

  res.json({
    success: true,
    data: inquiryDetailSchema.parse(result),
  });
}

/**
 * 문의 처리 상태를 변경합니다.
 */
export async function updateInquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const inquiryIdx = parseInquiryIdx(req);
  const parseResult = inquiryStatusUpdateSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_INQUIRY_STATUS_REQUEST",
      message: "문의 상태 변경 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await updateInquiryStatusService(inquiryIdx, parseResult.data);

  res.json({
    success: true,
    data: inquiryStatusUpdateResponseSchema.parse(result),
  });
}

/**
 * 문의에 관리자 답변을 등록합니다.
 */
export async function answerInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getAuthenticatedUser(req);
  const inquiryIdx = parseInquiryIdx(req);
  const parseResult = inquiryAnswerSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_INQUIRY_ANSWER_REQUEST",
      message: "문의 답변 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await answerInquiryService(inquiryIdx, user.idx, parseResult.data);

  res.json({
    success: true,
    data: inquiryAnswerResponseSchema.parse(result),
  });
}
