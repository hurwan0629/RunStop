import type { Request, Response } from "express";
import { adminSuspensionSchema } from "../dto/admin/admin.dto.js";
import { ApiError } from "../middleware/error.js";
import { suspendUser as suspendUserRepository } from "../repositories/admin.repository.js";

export async function suspendUser(req: Request, res: Response): Promise<void> {
  const parsed = adminSuspensionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ADMIN_SUSPENSION_REQUEST",
      message: "회원 정지 요청 값이 올바르지 않습니다.",
      details: parsed.error.flatten(),
    });
  }
  const result = await suspendUserRepository(parsed.data);
  if (result.kind === "not_found") {
    throw new ApiError({ status: 404, code: "USER_NOT_FOUND", message: "회원을 찾을 수 없습니다." });
  }
  if (result.kind === "withdrawn") {
    throw new ApiError({ status: 409, code: "WITHDRAWN_USER", message: "탈퇴한 회원은 정지할 수 없습니다." });
  }
  res.json({ success: true, data: result.data });
}
