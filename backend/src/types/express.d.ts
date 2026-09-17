import type { UserRole } from "./user-context.js";

// 기존 TypeScript에 존재하는 Express.Request이라는 타입에 user: { idx, role: "USER" | "ADMIN" } 을 넣어주기
declare global {
  namespace Express {
    interface Request {
      user?: {
        idx: number;
        role: UserRole;
      };
    }
  }
}
