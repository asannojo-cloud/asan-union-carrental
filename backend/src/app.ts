// 반드시 express보다 먼저 import해야 한다 (async 라우트 핸들러의 예외를 errorHandler로 전달).
import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from "fs";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db/pool";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter, loginRateLimiter } from "./middleware/rateLimit";
import { adminGuard } from "./middleware/guards";

import { adminAuthRouter } from "./modules/auth/admin.routes";
import { publicVehiclesRouter } from "./modules/vehicles/vehicles.public.routes";
import { adminVehiclesRouter } from "./modules/vehicles/vehicles.admin.routes";
import { publicReservationsRouter } from "./modules/reservations/reservations.public.routes";
import { adminReservationsRouter } from "./modules/reservations/reservations.admin.routes";
import { adminDashboardRouter } from "./modules/dashboard/dashboard.routes";

const PgSession = connectPgSimple(session);

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());

  // 로컬 개발(프론트 :5190 / 백엔드 :4200, 서로 다른 오리진)에서만 CORS가 필요하다.
  // 운영 환경은 백엔드가 프론트 정적 빌드를 함께 서빙해 동일 출처이므로 CORS 자체를 켜지 않는다.
  if (!env.isProduction) {
    app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  }
  app.use(express.json({ limit: "1mb" }));

  app.use(
    session({
      store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
      name: "asanunioncar.sid",
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8, // 8시간
      },
    })
  );

  app.use("/api", apiRateLimiter);

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // ── 공개 API (로그인 불필요, PRD 3, 47절 — 개인정보는 절대 포함하지 않음) ──────────
  app.use("/api/vehicles", publicVehiclesRouter);
  app.use("/api/reservations", publicReservationsRouter);

  // ── 관리자 API (세션 인증 필요 — PRD 46절, 프론트 URL 숨김이 아닌 서버 측 검사) ──────
  app.use("/api/admin/auth/login", loginRateLimiter);
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/admin/vehicles", adminGuard, adminVehiclesRouter);
  app.use("/api/admin/reservations", adminGuard, adminReservationsRouter);
  app.use("/api/admin/dashboard", adminGuard, adminDashboardRouter);

  app.use("/api", notFoundHandler);

  // 운영 배포: 프론트엔드 정적 빌드(frontend/dist)를 같은 서버에서 함께 서빙한다.
  if (fs.existsSync(env.frontendDistDir)) {
    app.use(express.static(env.frontendDistDir, { index: false }));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(env.frontendDistDir, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
