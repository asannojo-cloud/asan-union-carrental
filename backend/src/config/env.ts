import path from "path";
import dotenv from "dotenv";

dotenv.config();

// backend 패키지 루트 (src/config/env.ts 기준 두 단계 위 — dist/config/env.js에서도 동일하게 backend/를 가리킴).
const backendRoot = path.resolve(__dirname, "..", "..");

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`환경변수 ${name} 가 설정되지 않았습니다. backend/.env 파일을 확인하세요 (.env.example 참고).`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "4200", 10),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5190",

  loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS ?? "5", 10),
  loginLockMinutes: parseInt(process.env.LOGIN_LOCK_MINUTES ?? "15", 10),

  // 운영 배포 시 백엔드가 프론트엔드 정적 빌드도 함께 서빙할 수 있다.
  frontendDistDir: path.resolve(backendRoot, "..", "frontend", "dist"),
};
