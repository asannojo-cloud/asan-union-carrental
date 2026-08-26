import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { lookupRateLimiter } from "../../middleware/rateLimit";
import {
  createReservation,
  getCalendarStatus,
  lookupOwnReservation,
  updateOwnReservation,
  cancelOwnReservation,
} from "./reservations.service";

export const publicReservationsRouter = Router();

const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// PRD 24, 25절 — 일반 사용자에게는 차량명/예약상태만 노출하고 개인정보는 절대 반환하지 않는다.
publicReservationsRouter.get("/calendar", async (req, res) => {
  const parsed = calendarQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, "year, month 값을 확인해주세요.");
  const rows = await getCalendarStatus(parsed.data.year, parsed.data.month);
  res.json(
    rows.map((r) => ({
      vehicleId: r.vehicle_id,
      rentalDate: r.rental_date,
      status: r.status,
    }))
  );
});

// 개인정보는 신청 본인 확인용으로만 되돌려주고, 다른 사용자를 조회하는 API는 별도로 없음(PRD 25절).
function toSummary(reservation: any) {
  return {
    reservationNumber: reservation.reservation_number,
    vehicleId: reservation.vehicle_id,
    vehicleName: reservation.vehicle_name,
    rentalDate: reservation.rental_date,
    name: reservation.name,
    department: reservation.department,
    phone: reservation.phone,
    destination: reservation.destination,
    purpose: reservation.purpose,
    status: reservation.status,
  };
}

const createSchema = z
  .object({
    vehicleId: z.coerce.number().int(),
    startDate: z.string(),
    endDate: z.string().optional(),
    name: z.string().min(1).max(50),
    department: z.string().min(1).max(50),
    phone: z.string().min(1).max(20),
    destination: z.string().max(100).optional().nullable(),
    purpose: z.string().max(300).optional().nullable(),
  })
  .transform((data) => ({ ...data, endDate: data.endDate ?? data.startDate }));

// 여러 날짜(기간)를 한 번에 신청할 수 있다 — endDate 생략 시 startDate와 같은 하루짜리 예약.
publicReservationsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "필수 입력항목을 확인해주세요.");
  }

  const reservations = await createReservation(parsed.data, { createdBy: "user" });
  res.status(201).json(reservations.map(toSummary));
});

const lookupSchema = z.object({
  reservationNumber: z.string().min(1),
  phone: z.string().min(1),
});

// 로그인이 없는 서비스에서 "예약번호 + 전화번호"로 본인 확인 후 예약을 조회한다.
publicReservationsRouter.post("/lookup", lookupRateLimiter, async (req, res) => {
  const parsed = lookupSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "예약번호와 전화번호를 입력해주세요.");
  const reservations = await lookupOwnReservation(parsed.data.reservationNumber, parsed.data.phone);
  res.json(reservations.map(toSummary));
});

const selfUpdateSchema = z.object({
  verifyPhone: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  department: z.string().min(1).max(50).optional(),
  phone: z.string().min(1).max(20).optional(),
  destination: z.string().max(100).optional().nullable(),
  purpose: z.string().max(300).optional().nullable(),
});

// 본인이 자신의 예약(신청 상태일 때만)을 직접 수정한다. 이용일/차량 변경은 지원하지 않는다.
publicReservationsRouter.patch("/:reservationNumber", lookupRateLimiter, async (req, res) => {
  const parsed = selfUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
  }
  const { verifyPhone, ...patch } = parsed.data;
  const results = await updateOwnReservation(req.params.reservationNumber, verifyPhone, patch);
  res.json(results.map(toSummary));
});

const selfCancelSchema = z.object({ verifyPhone: z.string().min(1) });

// 본인이 자신의 예약을 취소한다 (여러 날짜 묶음이면 전체 취소).
publicReservationsRouter.patch("/:reservationNumber/cancel", lookupRateLimiter, async (req, res) => {
  const parsed = selfCancelSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "본인확인 정보를 확인해주세요.");
  const results = await cancelOwnReservation(req.params.reservationNumber, parsed.data.verifyPhone);
  res.json(results.map(toSummary));
});
