import { withTransaction } from "../infra/db/transaction.js";
import type { AdminSuspensionDTO } from "../dto/admin/admin.dto.js";

/** 회원 상태와 메모를 함께 변경하며, 동시 요청의 기존 메모도 보존합니다. */
export async function suspendUser(input: AdminSuspensionDTO) {
  return withTransaction(async (client) => {
    const target = await client.query<{ status: string }>(
      "SELECT status FROM service.users WHERE idx = $1 FOR UPDATE",
      [input.userIdx],
    );
    if (!target.rows[0]) return { kind: "not_found" as const };
    if (target.rows[0].status === "WITHDRAWN") return { kind: "withdrawn" as const };

    const result = await client.query<{
      idx: number;
      status: "SUSPENDED";
      suspended_until: Date | null;
    }>(
      `UPDATE service.users
       SET status = 'SUSPENDED',
           suspended_until = $2::timestamptz,
           admin_memo = concat_ws(E'\n', NULLIF(admin_memo, ''),
             '[' || to_char(clock_timestamp() AT TIME ZONE 'Asia/Seoul',
                            'YYYY-MM-DD HH24:MI:SS') || ' KST] 정지 사유: ' || $3::text),
           updated_at = now()
       WHERE idx = $1
       RETURNING idx, status, suspended_until`,
      [input.userIdx, input.suspendedUntil, input.reason],
    );
    const user = result.rows[0]!;
    return {
      kind: "success" as const,
      data: {
        userIdx: user.idx,
        status: user.status,
        suspendedUntil: user.suspended_until?.toISOString() ?? null,
      },
    };
  });
}
