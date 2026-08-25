import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import {
  createReservation,
  listReservationsAdmin,
  getReservationByIdAdmin,
  confirmReservation,
  cancelReservation,
  deleteReservation,
  updateReservationAdmin,
} from "./reservations.service";

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

adminReservationsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const reservation = await getReservationByIdAdmin(id);
  if (!reservation) throw new AppError(404, "예약을 찾을 수 없습니다.");
  res.json(reservation);
});

const createSchema = z.object({
  vehicleId: z.coerce.number().int(),
  rentalDate: z.string(),
  name: z.string().min(1).max(50),
  department: z.string().min(1).max(50),
  phone: z.string().min(1).max(20),
  destination: z.string().max(100).optional().nullable(),
  purpose: z.string().max(300).optional().nullable(),
  allowPastDate: z.boolean().optional(),
});

// PRD 20, 21절 — 관리자 직접예약 (전화/방문 접수 등). 기본적으로 CONFIRMED 상태로 등록한다.
adminReservationsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "필수 입력항목을 확인해주세요.");
  }
  const { allowPastDate, ...input } = parsed.data;
  const reservation = await createReservation(input, {
    createdBy: req.session.auth!.username,
    forceStatus: "CONFIRMED",
    allowPastDate,
  });
  res.status(201).json(reservation);
});

adminReservationsRouter.patch("/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const reservation = await confirmReservation(id);
  res.json(reservation);
});

adminReservationsRouter.patch("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  const reservation = await cancelReservation(id);
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
  const reservation = await updateReservationAdmin(id, parsed.data);
  res.json(reservation);
});

// PRD 41절 — 완전삭제는 관리자만 가능한 별도 기능. 실수 등록 정리용이며 일반 취소와는 다르다.
adminReservationsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 예약 ID입니다.");
  await deleteReservation(id);
  res.json({ ok: true });
});
