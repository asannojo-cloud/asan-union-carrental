import { Request, Response, NextFunction } from "express";

/**
 * 관리자 전용 API 보호. 일반 사용자는 로그인 개념이 없으므로(PRD 3, 46, 47절) 이 앱의
 * 인증 가드는 관리자용 한 종류뿐이다. 프론트엔드 URL을 숨기는 것만으로는 보호가 되지 않으므로
 * 모든 관리자 API 라우터에 이 가드를 적용한다.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  if (req.session.auth?.role !== "admin") {
    return res.status(401).json({ error: "관리자 로그인이 필요합니다." });
  }
  next();
}
