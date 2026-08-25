import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  // express.json()이 잘못된 JSON 본문을 받으면 SyntaxError(status 400)를 던진다.
  const maybeHttpError = err as { status?: number; statusCode?: number; type?: string };
  if (maybeHttpError?.status === 400 || maybeHttpError?.statusCode === 400 || maybeHttpError?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
  }

  console.error("[unhandled error]", err);
  // PRD 39절 — 예약 생성 실패 시 사용자에게 성공 메시지를 표시하면 안 되며, 서버 오류는 안내문으로 처리한다.
  return res.status(500).json({ error: "예약 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "요청한 리소스를 찾을 수 없습니다." });
}
