import { Pool, types } from "pg";
import { env } from "../config/env";

// PostgreSQL DATE 타입(OID 1082)을 JS Date 객체로 자동 변환하면 서버 타임존에 따라
// 날짜가 하루 밀리는 문제가 생긴다 (PRD 29절 — KST 기준 날짜 처리). "YYYY-MM-DD" 문자열
// 그대로 사용해 타임존 변환으로 인한 날짜 오차를 원천 차단한다.
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("[db] 예기치 않은 유휴 클라이언트 오류", err);
});
