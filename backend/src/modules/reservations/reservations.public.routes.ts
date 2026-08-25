import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { createReservation, getCalendarStatus } from "./reservations.service";

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

const createSchema = z.object({
  vehicleId: z.coerce.number().int(),
  rentalDate: z.string(),
  name: z.string().min(1).max(50),
  department: z.string().min(1).max(50),
  phone: z.string().min(1).max(20),
  destination: z.string().max(100).optional().nullable(),
  purpose: z.string().max(300).optional().nullable(),
});

publicReservationsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "필수 입력항목을 확인해주세요.");
  }

  const reservation = await createReservation(parsed.data, { createdBy: "user" });

  // PRD 25절 — 응답에도 개인정보는 신청 본인 확인용으로만 되돌려주고 다른 사용자 조회 API는 별도로 없음.
  res.status(201).json({
    reservationNumber: reservation.reservation_number,
    vehicleId: reservation.vehicle_id,
    rentalDate: reservation.rental_date,
    name: reservation.name,
    department: reservation.department,
    phone: reservation.phone,
    destination: reservation.destination,
    purpose: reservation.purpose,
    status: reservation.status,
  });
});
