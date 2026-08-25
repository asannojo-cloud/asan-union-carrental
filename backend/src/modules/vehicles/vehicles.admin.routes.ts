import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { AppError } from "../../middleware/errorHandler";
import { listAllVehicles } from "./vehicles.service";

export const adminVehiclesRouter = Router();

const WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const vehicleSchema = z.object({
  vehicleName: z.string().min(1, "차량명을 입력해주세요.").max(50),
  availableWeekdays: z.array(z.enum(WEEKDAY_CODES)).min(1, "이용 가능 요일을 하나 이상 선택해주세요."),
  active: z.boolean().optional(),
});

adminVehiclesRouter.get("/", async (req, res) => {
  const vehicles = await listAllVehicles();
  res.json(vehicles);
});

// PRD 48절 — 향후 차량 추가에 대비해 하드코딩하지 않고 관리자 화면에서 확장 가능하도록 한다.
adminVehiclesRouter.post("/", async (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
  }
  const { vehicleName, availableWeekdays, active } = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO vehicles (vehicle_name, available_weekdays, active) VALUES ($1, $2, $3)
     RETURNING id, vehicle_name, available_weekdays, active`,
    [vehicleName, availableWeekdays, active ?? true]
  );
  res.status(201).json(rows[0]);
});

adminVehiclesRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError(400, "잘못된 차량 ID입니다.");

  const parsed = vehicleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
  }
  const { vehicleName, availableWeekdays, active } = parsed.data;

  const { rows } = await pool.query(
    `UPDATE vehicles SET
       vehicle_name = COALESCE($1, vehicle_name),
       available_weekdays = COALESCE($2, available_weekdays),
       active = COALESCE($3, active),
       updated_at = now()
     WHERE id = $4
     RETURNING id, vehicle_name, available_weekdays, active`,
    [vehicleName ?? null, availableWeekdays ?? null, active ?? null, id]
  );
  if (rows.length === 0) throw new AppError(404, "차량을 찾을 수 없습니다.");
  res.json(rows[0]);
});
