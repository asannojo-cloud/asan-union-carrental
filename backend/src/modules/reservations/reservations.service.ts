import { pool } from "../../db/pool";
import { AppError } from "../../middleware/errorHandler";
import { getVehicleById } from "../vehicles/vehicles.service";
import { isValidDateString, isPastDateKST, weekdayOf } from "../../utils/kstDate";

export interface ReservationInput {
  vehicleId: number;
  rentalDate: string;
  name: string;
  department: string;
  phone: string;
  destination?: string | null;
  purpose?: string | null;
}

export interface CreateOptions {
  createdBy: string; // 'user' 또는 관리자 username
  forceStatus?: "PENDING" | "CONFIRMED"; // 관리자 직접등록은 CONFIRMED로 저장 (PRD 21절)
  allowPastDate?: boolean; // 관리자 전용, 기본값 false (PRD 31절)
}

const PHONE_RE = /^[0-9-]{9,14}$/;

/**
 * PRD 30절 — 예약 가능 여부 판단 우선순위. 아래 순서를 그대로 따른다.
 * 1. 날짜가 정상적인 날짜인지, 2. 과거 날짜인지, 3. 차량 존재/활성 여부,
 * 4. 차량 이용 가능 요일, 5. 동일 차량/날짜 중복 여부(호출자가 트랜잭션 내에서 처리),
 * 6. 필수 입력값.
 */
async function validateBeforeCreate(input: ReservationInput, opts: CreateOptions) {
  // 1. 날짜 형식/실존 여부
  if (!isValidDateString(input.rentalDate)) {
    throw new AppError(400, "올바른 날짜를 선택해주세요.");
  }

  // 2. 과거 날짜 (PRD 31절 — 관리자 기본값도 제한, 명시적으로 허용한 경우만 예외)
  if (isPastDateKST(input.rentalDate) && !opts.allowPastDate) {
    throw new AppError(400, "지난 날짜는 예약할 수 없습니다.");
  }

  // 3. 차량 존재 및 활성화 여부
  const vehicle = await getVehicleById(input.vehicleId);
  if (!vehicle || !vehicle.active) {
    throw new AppError(400, "선택한 차량을 이용할 수 없습니다.");
  }

  // 4. 차량 이용 가능 요일 (서버 측 검증 — PRD 13절, 프론트엔드 비활성화만으로 대체하지 않음)
  const weekday = weekdayOf(input.rentalDate);
  if (!vehicle.available_weekdays.includes(weekday)) {
    throw new AppError(400, `${vehicle.vehicle_name}는(은) 해당 요일에 이용할 수 없습니다.`);
  }

  // 6. 필수 입력값 확인
  if (!input.name?.trim()) throw new AppError(400, "이름을 입력해주세요.");
  if (!input.department?.trim()) throw new AppError(400, "실과를 입력해주세요.");
  if (!input.phone?.trim() || !PHONE_RE.test(input.phone.trim())) {
    throw new AppError(400, "올바른 전화번호를 입력해주세요.");
  }

  return vehicle;
}

export async function createReservation(input: ReservationInput, opts: CreateOptions) {
  await validateBeforeCreate(input, opts);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 5. 동일 차량/동일 날짜 기존 예약 여부 — 트랜잭션 내에서 선확인(친절한 메시지용).
    //    최종 방어선은 아래 UNIQUE 인덱스(uq_reservations_vehicle_date_active)이며, 동시
    //    요청 경합 상황에서는 이 선확인을 통과하더라도 INSERT가 unique_violation으로 막힌다.
    const existing = await client.query(
      `SELECT id FROM reservations WHERE vehicle_id = $1 AND rental_date = $2 AND status <> 'CANCELLED'
       FOR UPDATE`,
      [input.vehicleId, input.rentalDate]
    );
    if (existing.rows.length > 0) {
      throw new AppError(409, "이미 예약된 차량입니다.");
    }

    const status = opts.forceStatus ?? "PENDING";
    const insertResult = await client.query(
      `INSERT INTO reservations
         (reservation_number, vehicle_id, rental_date, name, department, phone, destination, purpose,
          status, created_by, confirmed_at)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $8 = 'CONFIRMED' THEN now() ELSE NULL END)
       RETURNING id`,
      [
        input.vehicleId,
        input.rentalDate,
        input.name.trim(),
        input.department.trim(),
        input.phone.trim(),
        input.destination?.trim() || null,
        input.purpose?.trim() || null,
        status,
        opts.createdBy,
      ]
    );
    const id = insertResult.rows[0].id;

    // PRD 42절 — 고유 예약번호 자동 생성. 전역 고유 id를 사용해 동시 생성 상황에서도 충돌하지 않는다.
    const { rows } = await client.query(
      `UPDATE reservations
       SET reservation_number = 'R' || to_char(rental_date::date, 'YYYYMMDD') || '-' || lpad(id::text, 4, '0')
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    // PostgreSQL unique_violation — 동시 요청 경합으로 다른 요청이 먼저 커밋된 경우 (PRD 12, 39, 40절)
    if ((err as { code?: string }).code === "23505") {
      throw new AppError(409, "다른 사용자가 먼저 예약을 신청했습니다. 해당 차량은 현재 예약할 수 없습니다.");
    }
    throw err;
  } finally {
    client.release();
  }
}

/** 공개 캘린더용 — 개인정보 없이 차량/날짜별 상태만 반환한다 (PRD 24, 25절). */
export async function getCalendarStatus(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const { rows } = await pool.query(
    `SELECT vehicle_id, rental_date, status
     FROM reservations
     WHERE status <> 'CANCELLED'
       AND rental_date >= $1::date
       AND rental_date < ($1::date + INTERVAL '1 month')`,
    [startDate]
  );
  return rows;
}

export interface AdminListFilters {
  date?: string;
  vehicleId?: number;
  status?: string;
  name?: string;
  department?: string;
  phone?: string;
}

export async function listReservationsAdmin(filters: AdminListFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.date) {
    values.push(filters.date);
    clauses.push(`r.rental_date = $${values.length}`);
  }
  if (filters.vehicleId) {
    values.push(filters.vehicleId);
    clauses.push(`r.vehicle_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    clauses.push(`r.status = $${values.length}`);
  }
  if (filters.name) {
    values.push(`%${filters.name}%`);
    clauses.push(`r.name ILIKE $${values.length}`);
  }
  if (filters.department) {
    values.push(`%${filters.department}%`);
    clauses.push(`r.department ILIKE $${values.length}`);
  }
  if (filters.phone) {
    values.push(`%${filters.phone}%`);
    clauses.push(`r.phone ILIKE $${values.length}`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT r.*, v.vehicle_name
     FROM reservations r
     JOIN vehicles v ON v.id = r.vehicle_id
     ${where}
     ORDER BY r.rental_date DESC, r.id DESC`,
    values
  );
  return rows;
}

export async function getReservationByIdAdmin(id: number) {
  const { rows } = await pool.query(
    `SELECT r.*, v.vehicle_name
     FROM reservations r
     JOIN vehicles v ON v.id = r.vehicle_id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function confirmReservation(id: number) {
  const { rows } = await pool.query(
    `UPDATE reservations SET status = 'CONFIRMED', confirmed_at = now(), updated_at = now()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING *`,
    [id]
  );
  if (rows.length === 0) {
    throw new AppError(400, "예약신청 상태에서만 확정할 수 있습니다.");
  }
  return rows[0];
}

export async function cancelReservation(id: number) {
  const { rows } = await pool.query(
    `UPDATE reservations SET status = 'CANCELLED', cancelled_at = now(), updated_at = now()
     WHERE id = $1 AND status IN ('PENDING', 'CONFIRMED')
     RETURNING *`,
    [id]
  );
  if (rows.length === 0) {
    throw new AppError(400, "이미 취소되었거나 존재하지 않는 예약입니다.");
  }
  return rows[0];
}

export async function deleteReservation(id: number) {
  const { rowCount } = await pool.query(`DELETE FROM reservations WHERE id = $1`, [id]);
  if (rowCount === 0) {
    throw new AppError(404, "예약을 찾을 수 없습니다.");
  }
}

export interface UpdateInput extends Partial<ReservationInput> {
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
}

/** 관리자 예약 수정 (PRD 23절) — 이용일/차량 변경 시 변경된 조합에 대한 중복예약 검사를 다시 수행한다. */
export async function updateReservationAdmin(id: number, patch: UpdateInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: currentRows } = await client.query(`SELECT * FROM reservations WHERE id = $1 FOR UPDATE`, [id]);
    const current = currentRows[0];
    if (!current) throw new AppError(404, "예약을 찾을 수 없습니다.");

    const nextVehicleId = patch.vehicleId ?? current.vehicle_id;
    const nextDate = patch.rentalDate ?? current.rental_date;
    const nextStatus = patch.status ?? current.status;
    const dateOrVehicleChanged = nextVehicleId !== current.vehicle_id || nextDate !== current.rental_date;

    if (dateOrVehicleChanged && nextStatus !== "CANCELLED") {
      if (!isValidDateString(nextDate)) throw new AppError(400, "올바른 날짜를 선택해주세요.");
      const vehicle = await getVehicleById(nextVehicleId);
      if (!vehicle || !vehicle.active) throw new AppError(400, "선택한 차량을 이용할 수 없습니다.");
      const weekday = weekdayOf(nextDate);
      if (!vehicle.available_weekdays.includes(weekday)) {
        throw new AppError(400, `${vehicle.vehicle_name}는(은) 해당 요일에 이용할 수 없습니다.`);
      }
      const dup = await client.query(
        `SELECT id FROM reservations
         WHERE vehicle_id = $1 AND rental_date = $2 AND status <> 'CANCELLED' AND id <> $3
         FOR UPDATE`,
        [nextVehicleId, nextDate, id]
      );
      if (dup.rows.length > 0) throw new AppError(409, "해당 차량은 이미 예약되어 있습니다.");
    }

    if (patch.phone !== undefined && !PHONE_RE.test(patch.phone.trim())) {
      throw new AppError(400, "올바른 전화번호를 입력해주세요.");
    }

    // confirmed_at/cancelled_at은 상태가 "새로 그 상태로 바뀔 때"만 현재 시각으로 갱신하고,
    // 그 외에는 기존 값을 그대로 유지한다 (JS에서 계산 — 단순 UPDATE로 처리해 가독성을 확보).
    const confirmedAt =
      nextStatus === "CONFIRMED" && current.status !== "CONFIRMED" ? new Date() : current.confirmed_at;
    const cancelledAt =
      nextStatus === "CANCELLED" && current.status !== "CANCELLED" ? new Date() : current.cancelled_at;

    const { rows } = await client.query(
      `UPDATE reservations SET
         vehicle_id = $1,
         rental_date = $2,
         name = $3,
         department = $4,
         phone = $5,
         destination = $6,
         purpose = $7,
         status = $8,
         confirmed_at = $9,
         cancelled_at = $10,
         updated_at = now()
       WHERE id = $11
       RETURNING *`,
      [
        nextVehicleId,
        nextDate,
        patch.name?.trim() ?? current.name,
        patch.department?.trim() ?? current.department,
        patch.phone?.trim() ?? current.phone,
        patch.destination !== undefined ? patch.destination?.trim() || null : current.destination,
        patch.purpose !== undefined ? patch.purpose?.trim() || null : current.purpose,
        nextStatus,
        confirmedAt,
        cancelledAt,
        id,
      ]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "23505") {
      throw new AppError(409, "해당 차량은 이미 예약되어 있습니다.");
    }
    throw err;
  } finally {
    client.release();
  }
}
