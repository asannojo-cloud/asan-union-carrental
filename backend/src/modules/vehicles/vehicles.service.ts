import { pool } from "../../db/pool";
import type { WeekdayCode } from "../../utils/kstDate";

export interface Vehicle {
  id: number;
  vehicle_name: string;
  available_weekdays: WeekdayCode[];
  active: boolean;
}

export async function listActiveVehicles(): Promise<Vehicle[]> {
  const { rows } = await pool.query(
    `SELECT id, vehicle_name, available_weekdays, active FROM vehicles WHERE active = true ORDER BY id`
  );
  return rows;
}

export async function listAllVehicles(): Promise<Vehicle[]> {
  const { rows } = await pool.query(
    `SELECT id, vehicle_name, available_weekdays, active FROM vehicles ORDER BY id`
  );
  return rows;
}

export async function getVehicleById(id: number): Promise<Vehicle | null> {
  const { rows } = await pool.query(
    `SELECT id, vehicle_name, available_weekdays, active FROM vehicles WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
