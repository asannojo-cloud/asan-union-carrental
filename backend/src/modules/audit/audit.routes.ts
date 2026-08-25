import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { listAuditLogs } from "./audit.service";

export const adminAuditRouter = Router();

const querySchema = z.object({
  reservationId: z.coerce.number().int().optional(),
  adminUsername: z.string().optional(),
  action: z.enum(["VIEW", "CREATE", "UPDATE", "CONFIRM", "CANCEL", "DELETE"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// 관리자 접근/변경 감사로그 전체 조회 (PRD 개인정보 접근통제 보완 요구사항).
adminAuditRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, "검색조건을 확인해주세요.");
  const rows = await listAuditLogs(parsed.data);
  res.json(rows);
});
