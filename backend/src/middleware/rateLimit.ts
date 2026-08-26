import rateLimit from "express-rate-limit";

// 로그인 엔드포인트에 대한 IP 단위 요청 제한 (계정 잠금과는 별개의 보호막)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요." },
});

// 본인 예약 조회(예약번호+전화번호)는 전화번호를 무작위로 대입해보는 시도를 막기 위해
// 로그인만큼 엄격하게 제한한다.
export const lookupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요." },
});

// 공개 API에 대한 완만한 제한. 예약현황 폴링(짧은 주기 자동 새로고침)이 정상적으로 잦으므로
// 넉넉하게 설정한다. 로그인된 관리자는 정상적인 관리 업무가 많으므로 제외한다.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.session?.auth?.role === "admin",
});
