import bcrypt from "bcrypt";
import { pool } from "./pool";

/**
 * 초기 데이터: 관리자 계정 1개 + 차량 2대 (PRD 27, 28절).
 * 관리자 계정: admin / Admin!2026 — 운영 배포 전 반드시 변경할 것.
 */
async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingAdmin = await client.query("SELECT id FROM admin_users WHERE username = $1", ["admin"]);
    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash("Admin!2026", 12);
      await client.query(
        "INSERT INTO admin_users (username, password_hash, display_name) VALUES ($1, $2, $3)",
        ["admin", passwordHash, "관리자"]
      );
      console.log("[seed] 관리자 계정 생성: admin / Admin!2026 (운영 전 반드시 변경하세요)");
    } else {
      console.log("[seed] 관리자 계정 이미 존재 — 건너뜀");
    }

    const { rows: existingVehicles } = await client.query("SELECT count(*)::int AS count FROM vehicles");
    if (existingVehicles[0].count === 0) {
      await client.query(
        `INSERT INTO vehicles (vehicle_name, available_weekdays, active) VALUES
           ($1, $2, true),
           ($3, $4, true)`,
        [
          "하모니카",
          ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
          "아아카",
          ["SAT", "SUN"],
        ]
      );
      console.log("[seed] 차량 2대(하모니카, 아아카) 삽입 완료");
    } else {
      console.log(`[seed] vehicles 테이블에 이미 ${existingVehicles[0].count}건이 있어 건너뜁니다.`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("[seed] 실패:", err);
  process.exit(1);
});
