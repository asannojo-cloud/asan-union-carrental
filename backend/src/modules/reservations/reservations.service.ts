import crypto from "crypto";
import { pool } from "../../db/pool";
import { AppError } from "../../middleware/errorHandler";
import { getVehicleById } from "../vehicles/vehicles.service";
import { isValidDateString, isPastDateKST, weekdayOf, dateRange } from "../../utils/kstDate";
import { formatDateKorean } from "../../utils/formatDate";

export interface ReservationInput {
  vehicleId: number;
  startDate: string;
  endDate: string; // 단일 날짜 예약은 startDate와 동일한 값
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

// 한 번에 신청할 수 있는 최대 대여 일수. 과도하게 긴 기간 신청으로 인한 오남용을 막는다.
const MAX_RENTAL_DAYS = 14;

/**
 * PRD 30절 — 예약 가능 여부 판단 우선순위. 아래 순서를 그대로 따르되, 여러 날짜(기간)
 * 신청을 지원하기 위해 4번(이용 가능 요일) 검증은 기간 내 모든 날짜에 대해 수행한다.
 * 1. 날짜가 정상적인 날짜인지, 2. 과거 날짜인지, 3. 차량 존재/활성 여부,
 * 4. 차량 이용 가능 요일(기간 내 모든 날짜), 5. 동일 차량/날짜 중복 여부(트랜잭션 내 처리),
 * 6. 필수 입력값.
 */
async function validateBeforeCreate(input: ReservationInput, opts: CreateOptions) {
  // 1. 날짜 형식/실존 여부
  if (!isValidDateString(input.startDate) || !isValidDateString(input.endDate)) {
    throw new AppError(400, "올바른 날짜를 선택해주세요.");
  }
  if (input.endDate < input.startDate) {
    throw new AppError(400, "종료일은 시작일보다 빠를 수 없습니다.");
  }

  const dates = dateRange(input.startDate, input.endDate);
  if (dates.length > MAX_RENTAL_DAYS) {
    throw new AppError(400, `한 번에 신청할 수 있는 대여 기간은 최대 ${MAX_RENTAL_DAYS}일입니다.`);
  }

  // 2. 과거 날짜 (PRD 31절 — 관리자 기본값도 제한, 명시적으로 허용한 경우만 예외)
  if (isPastDateKST(input.startDate) && !opts.allowPastDate) {
    throw new AppError(400, "지난 날짜는 예약할 수 없습니다.");
  }

  // 3. 차량 존재 및 활성화 여부
  const vehicle = await getVehicleById(input.vehicleId);
  if (!vehicle || !vehicle.active) {
    throw new AppError(400, "선택한 차량을 이용할 수 없습니다.");
  }

  // 4. 차량 이용 가능 요일 — 기간에 포함된 모든 날짜가 이용 가능해야 한다.
  for (const d of dates) {
    const weekday = weekdayOf(d);
    if (!vehicle.available_weekdays.includes(weekday)) {
      throw new AppError(400, `${vehicle.vehicle_name}는(은) ${formatDateKorean(d)}에 이용할 수 없습니다.`);
    }
  }

  // 6. 필수 입력값 확인
  if (!input.name?.trim()) throw new AppError(400, "이름을 입력해주세요.");
  if (!input.department?.trim()) throw new AppError(400, "실과를 입력해주세요.");
  if (!input.phone?.trim() || !PHONE_RE.test(input.phone.trim())) {
    throw new AppError(400, "올바른 전화번호를 입력해주세요.");
  }

  return { vehicle, dates };
}

/**
 * 예약 생성. 기간(startDate~endDate)에 포함된 날짜마다 reservations 행을 하나씩 만든다
 * (예약 단위는 여전히 "1일"). 같은 요청으로 신청된 행들은 booking_group_id로 묶이며,
 * 트랜잭션으로 묶여있어 기간 내 단 하루라도 이미 예약되어 있으면 전체가 취소(all-or-nothing)된다.
 */
export async function createReservation(input: ReservationInput, opts: CreateOptions) {
  const { dates } = await validateBeforeCreate(input, opts);
  const bookingGroupId = crypto.randomUUID();
  const status = opts.forceStatus ?? "PENDING";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const created: unknown[] = [];
    for (const date of dates) {
      // 5. 동일 차량/동일 날짜 기존 예약 여부 — 트랜잭션 내에서 선확인(친절한 메시지용).
      //    최종 방어선은 uq_reservations_vehicle_date_active UNIQUE 인덱스이며, 동시 요청
      //    경합 상황에서는 이 선확인을 통과하더라도 INSERT가 unique_violation으로 막힌다.
      const existing = await client.query(
        `SELECT id FROM reservations WHERE vehicle_id = $1 AND rental_date = $2 AND status <> 'CANCELLED'
         FOR UPDATE`,
        [input.vehicleId, date]
      );
      if (existing.rows.length > 0) {
        throw new AppError(409, `${formatDateKorean(date)}은(는) 이미 예약된 차량입니다.`);
      }

      const insertResult = await client.query(
        `INSERT INTO reservations
           (reservation_number, vehicle_id, rental_date, name, department, phone, destination, purpose,
            status, created_by, booking_group_id, confirmed_at)
         VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $8 = 'CONFIRMED' THEN now() ELSE NULL END)
         RETURNING id`,
        [
          input.vehicleId,
          date,
          input.name.trim(),
          input.department.trim(),
          input.phone.trim(),
          input.destination?.trim() || null,
          input.purpose?.trim() || null,
          status,
          opts.createdBy,
          bookingGroupId,
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
      created.push(rows[0]);
    }

    await client.query("COMMIT");
    return created;
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

/** 관리자 캘린더용 — 예약이 실제로 있는 날짜만 예약자 이름/실과까지 함께 반환한다. */
export async function getCalendarStatusAdmin(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const { rows } = await pool.query(
    `SELECT id, vehicle_id, rental_date, status, name, department
     FROM reservations
     WHERE status <> 'CANCELLED'
       AND rental_date >= $1::date
       AND rental_date < ($1::date + INTERVAL '1 month')
     ORDER BY rental_date`,
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

/** 같은 요청으로 함께 신청된 예약(같은 booking_group_id)을 모두 조회한다. */
export async function getBookingGroup(groupId: string) {
  const { rows } = await pool.query(
    `SELECT r.*, v.vehicle_name
     FROM reservations r
     JOIN vehicles v ON v.id = r.vehicle_id
     WHERE r.booking_group_id = $1
     ORDER BY r.rental_date`,
    [groupId]
  );
  return rows;
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

/** 같은 그룹(여러 날짜 묶음 예약)을 한 번에 확정/취소한다. */
export async function confirmBookingGroup(groupId: string) {
  const { rows } = await pool.query(
    `UPDATE reservations SET status = 'CONFIRMED', confirmed_at = now(), updated_at = now()
     WHERE booking_group_id = $1 AND status = 'PENDING'
     RETURNING *`,
    [groupId]
  );
  if (rows.length === 0) {
    throw new AppError(400, "예약신청 상태인 예약이 없습니다.");
  }
  return rows;
}

export async function cancelBookingGroup(groupId: string) {
  const { rows } = await pool.query(
    `UPDATE reservations SET status = 'CANCELLED', cancelled_at = now(), updated_at = now()
     WHERE booking_group_id = $1 AND status IN ('PENDING', 'CONFIRMED')
     RETURNING *`,
    [groupId]
  );
  if (rows.length === 0) {
    throw new AppError(400, "취소할 수 있는 예약이 없습니다.");
  }
  return rows;
}

export async function deleteReservation(id: number) {
  const { rowCount } = await pool.query(`DELETE FROM reservations WHERE id = $1`, [id]);
  if (rowCount === 0) {
    throw new AppError(404, "예약을 찾을 수 없습니다.");
  }
}

export interface UpdateInput {
  vehicleId?: number;
  rentalDate?: string;
  name?: string;
  department?: string;
  phone?: string;
  destination?: string | null;
  purpose?: string | null;
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
