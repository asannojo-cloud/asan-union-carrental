import { pool } from "../../db/pool";

export type AuditAction = "VIEW" | "CREATE" | "UPDATE" | "CONFIRM" | "CANCEL" | "DELETE";

export interface LogAuditInput {
  adminUsername: string;
  action: AuditAction;
  reservationId?: number | null;
  reservationNumber?: string | null;
  detail?: Record<string, unknown> | null;
}

/**
 * 관리자의 열람/생성/수정/확정/취소/완전삭제를 기록한다 (PRD 개인정보 접근통제 보완 —
 * "누가 언제 어떤 예약을 보았거나 지웠는지" 완전삭제 이후에도 추적 가능해야 한다는 요구사항).
 * 로그 기록 실패가 본 작업(예약 처리)까지 실패시키지 않도록 호출부에서 별도 에러 처리 없이
 * fire-and-forget에 가깝게 사용하되, 실패 시 콘솔에는 남긴다.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_username, action, reservation_id, reservation_number, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.adminUsername,
        input.action,
        input.reservationId ?? null,
        input.reservationNumber ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
      ]
    );
  } catch (err) {
    console.error("[audit] 감사로그 기록 실패", err);
  }
}

export interface AuditListFilters {
  reservationId?: number;
  adminUsername?: string;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
}

export async function listAuditLogs(filters: AuditListFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.reservationId) {
    values.push(filters.reservationId);
    clauses.push(`reservation_id = $${values.length}`);
  }
  if (filters.adminUsername) {
    values.push(`%${filters.adminUsername}%`);
    clauses.push(`admin_username ILIKE $${values.length}`);
  }
  if (filters.action) {
    values.push(filters.action);
    clauses.push(`action = $${values.length}`);
  }
  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    clauses.push(`created_at >= $${values.length}::date`);
  }
  if (filters.dateTo) {
    values.push(filters.dateTo);
    clauses.push(`created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 500`,
    values
  );
  return rows;
}

export async function listAuditLogsForReservation(reservationId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM audit_logs WHERE reservation_id = $1 ORDER BY created_at DESC`,
    [reservationId]
  );
  return rows;
}
