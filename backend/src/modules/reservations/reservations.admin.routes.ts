import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import {
  createReservation,
  listReservationsAdmin,
  getReservationByIdAdmin,
  getCalendarStatusAdmin,
  getBookingGroup,
  confirmReservation,
  cancelReservation,
  confirmBookingGroup,
  cancelBookingGroup,
  deleteReservation,
  updateReservationAdmin,
} from "./reservations.service";
import { logAudit, listAuditLogsForReservation } from "../audit/audit.service";

export const adminReservationsRouter = Router();

const listQuerySchema = z.object({
  date: z.string().optional(),
  vehicleId: z.coerce.number().int().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  name: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

adminReservationsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, "검색조건을 확인해주세요.");
  const rows = await listReservationsAdmin(parsed.data);
  res.json(rows);
});

const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// 관리자 캘린더용 — 예약이 있는 날짜만 예약자 이름/실과까지 함께 내려준다.
// 리터럴 경로이므로 "/:id"보다 먼저 등록해야 "calendar"가 id로 잘못 파싱되지 않는다.
adminReservationsRouter.get("/calendar", async (req, res) => {
  const parsed = calendarQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, "year, month 값을 확인해주세요.");
  const rows = await getCalendarStatusAdmin(parsed.data.year, parsed.data.month);
  res.json(rows);
});

// PRD 접근통제 보완 — 예약 상세(전화번호 등 개인정보 전체)를 열람할 때마다 누가 언제
// 열람했는지 감사로그에 남긴다.
adminReservationsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const reservation = await getReservationByIdAdmin(id);
  if (!reservation) throw new AppError(404, "예약을 찾을 수 없습니다.");
  await logAudit({
    adminUsername: req.session.auth!.username,
    action: "VIEW",
    reservationId: reservation.id,
    reservationNumber: reservation.reservation_number,
  });
  res.json(reservation);
});

// 이 예약(및 같은 묶음)에 대한 열람/변경/확정/취소/삭제 이력.
adminReservationsRouter.get("/:id/audit-logs", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const rows = await listAuditLogsForReservation(id);
  res.json(rows);
});

// 같은 요청으로 함께 신청된 여러 날짜 예약(묶음) 조회/일괄 확정/일괄 취소.
adminReservationsRouter.get("/group/:groupId", async (req, res) => {
  const rows = await getBookingGroup(req.params.groupId);
  res.json(rows);
});

adminReservationsRouter.patch("/group/:groupId/confirm", async (req, res) => {
  const rows = await confirmBookingGroup(req.params.groupId, req.session.auth!.username);
  res.json(rows);
});

adminReservationsRouter.patch("/group/:groupId/cancel", async (req, res) => {
  const rows = await cancelBookingGroup(req.params.groupId, req.session.auth!.username);
  res.json(rows);
});

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
    allowPastDate: z.boolean().optional(),
  })
  .transform((data) => ({ ...data, endDate: data.endDate ?? data.startDate }));

// PRD 20, 21절 — 관리자 직접예약 (전화/방문 접수 등). 기본적으로 CONFIRMED 상태로 등록한다.
// 여러 날짜(기간)를 한 번에 등록할 수도 있다.
adminReservationsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "필수 입력항목을 확인해주세요.");
  }
  const { allowPastDate, ...input } = parsed.data;
  const reservations = await createReservation(input, {
    createdBy: req.session.auth!.username,
    forceStatus: "CONFIRMED",
    allowPastDate,
  });
  res.status(201).json(reservations);
});

adminReservationsRouter.patch("/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const reservation = await confirmReservation(id, req.session.auth!.username);
  res.json(reservation);
});

adminReservationsRouter.patch("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const reservation = await cancelReservation(id, req.session.auth!.username);
  res.json(reservation);
});

const updateSchema = z.object({
  vehicleId: z.coerce.number().int().optional(),
  rentalDate: z.string().optional(),
  name: z.string().min(1).max(50).optional(),
  department: z.string().min(1).max(50).optional(),
  phone: z.string().min(1).max(20).optional(),
  destination: z.string().max(100).optional().nullable(),
  purpose: z.string().max(300).optional().nullable(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});

// PRD 23절 — 예약 수정. 이용일/차량 변경 시 서비스 계층에서 재검증한다.
adminReservationsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
  }
  const reservation = await updateReservationAdmin(id, parsed.data, req.session.auth!.username);
  res.json(reservation);
});

// PRD 41절 — 완전삭제는 관리자만 가능한 별도 기능. 실수 등록 정리용이며 일반 취소와는 다르다.
// 삭제 전 내용은 감사로그에 스냅샷으로 남아 삭제 이후에도 조회 가능하다 (deleteReservation 참고).
adminReservationsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  await deleteReservation(id, req.session.auth!.username);
  res.json({ ok: true });
});
