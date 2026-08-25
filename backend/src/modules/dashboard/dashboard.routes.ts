import { Router } from "express";
import { pool } from "../../db/pool";
import { todayKST } from "../../utils/kstDate";

export const adminDashboardRouter = Router();

// PRD 15, 51절 — 관리자 대시보드 통계 (오늘의 예약, 상태별 건수, 차량별 현황).
adminDashboardRouter.get("/", async (req, res) => {
  const today = todayKST();

  const { rows: todayReservations } = await pool.query(
    `SELECT r.id, r.vehicle_id, v.vehicle_name, r.status
     FROM reservations r JOIN vehicles v ON v.id = r.vehicle_id
     WHERE r.rental_date = $1 AND r.status <> 'CANCELLED'
     ORDER BY v.id`,
    [today]
  );

  const { rows: statusCounts } = await pool.query(
    `SELECT status, count(*)::int AS count FROM reservations GROUP BY status`
  );
  const countByStatus = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0 } as Record<string, number>;
  for (const row of statusCounts) countByStatus[row.status] = row.count;

  const { rows: byVehicle } = await pool.query(
    `SELECT v.id AS vehicle_id, v.vehicle_name,
            count(r.id) FILTER (WHERE r.status <> 'CANCELLED')::int AS active_count,
            count(r.id) FILTER (WHERE r.status = 'PENDING')::int AS pending_count,
            count(r.id) FILTER (WHERE r.status = 'CONFIRMED')::int AS confirmed_count
     FROM vehicles v
     LEFT JOIN reservations r ON r.vehicle_id = v.id
     WHERE v.active = true
     GROUP BY v.id, v.vehicle_name
     ORDER BY v.id`
  );

  res.json({
    today,
    todayReservations,
    pendingCount: countByStatus.PENDING,
    confirmedCount: countByStatus.CONFIRMED,
    cancelledCount: countByStatus.CANCELLED,
    byVehicle,
  });
});
