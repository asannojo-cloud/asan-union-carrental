import { pool } from "./pool";
import { encrypt, encryptNullable, isEncrypted } from "../utils/crypto";

/**
 * 일회성 마이그레이션: ENCRYPTION_KEY 도입 이전에 평문으로 저장된 reservations.name/phone/
 * destination/purpose 값을 암호화한다. 이미 암호화된 값("v1:" 접두사)은 건너뛰므로 여러 번
 * 실행해도 안전하다(idempotent).
 */
async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, name, phone, destination, purpose FROM reservations`
    );

    let migrated = 0;
    for (const row of rows) {
      if (isEncrypted(row.name)) continue; // 이미 암호화된 행은 건너뜀

      await client.query(
        `UPDATE reservations SET name = $1, phone = $2, destination = $3, purpose = $4 WHERE id = $5`,
        [
          encrypt(row.name),
          encrypt(row.phone),
          encryptNullable(row.destination),
          encryptNullable(row.purpose),
          row.id,
        ]
      );
      migrated++;
    }

    console.log(`[encrypt-existing-data] 총 ${rows.length}건 중 ${migrated}건 암호화 완료 (나머지는 이미 암호화됨).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("[encrypt-existing-data] 실패:", err);
  process.exit(1);
});
