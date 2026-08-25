import { createApp } from "./app";
import { env } from "./config/env";

// 요청 처리 흐름 밖에서 발생하는 처리되지 않은 오류로 서버 프로세스 전체가 조용히 죽는 것을
// 막기 위한 최후의 방어선. 로그만 남기고 프로세스는 계속 살려둔다.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const app = createApp();

app.listen(env.port, () => {
  console.log(`[server] 아산시공무원노동조합 차량 렌트사업 백엔드 실행 중 — http://localhost:${env.port}`);
});
