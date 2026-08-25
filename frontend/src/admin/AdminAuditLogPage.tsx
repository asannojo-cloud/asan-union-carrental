import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";
import type { AuditLog, AuditAction } from "../shared/types";
import { formatDateTimeKST } from "../shared/formatters";

const ACTION_LABELS: Record<AuditAction, string> = {
  VIEW: "열람",
  CREATE: "생성",
  UPDATE: "수정",
  CONFIRM: "확정",
  CANCEL: "취소",
  DELETE: "완전삭제",
};

const ACTION_COLOR: Record<AuditAction, string> = {
  VIEW: "bg-slate-100 text-slate-600",
  CREATE: "bg-brand-50 text-brand-700",
  UPDATE: "bg-amber-50 text-amber-700",
  CONFIRM: "bg-sky-50 text-sky-700",
  CANCEL: "bg-pink-50 text-pink-700",
  DELETE: "bg-red-50 text-red-700",
};

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUsername, setAdminUsername] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function search() {
    setLoading(true);
    const q = new URLSearchParams();
    if (adminUsername) q.set("adminUsername", adminUsername);
    if (action) q.set("action", action);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    try {
      const data = await api.get<AuditLog[]>(`/admin/audit-logs?${q.toString()}`);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">감사로그</h2>
      <p className="text-sm text-slate-500 mb-5">
        관리자가 예약을 열람·생성·수정·확정·취소·완전삭제할 때마다 자동으로 기록됩니다. 완전삭제된 예약도
        이 기록에서 내용을 확인할 수 있습니다. (최근 500건)
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            placeholder="관리자 아이디"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
          />
          <select value={action} onChange={(e) => setAction(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">전체 동작</option>
            {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <button onClick={search} className="mt-3 text-sm bg-slate-800 text-white rounded-lg px-4 py-1.5">검색</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="px-3 py-2">일시</th>
              <th className="px-3 py-2">관리자</th>
              <th className="px-3 py-2">동작</th>
              <th className="px-3 py-2">예약번호</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">기록이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDateTimeKST(r.created_at)}</td>
                  <td className="px-3 py-2">{r.admin_username}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLOR[r.action]}`}>
                      {ACTION_LABELS[r.action]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.reservation_id ? (
                      r.action === "DELETE" ? (
                        <span className="text-slate-400">{r.reservation_number} (삭제됨)</span>
                      ) : (
                        <Link to={`/admin/reservations/${r.reservation_id}`} className="text-brand-600 underline">
                          {r.reservation_number}
                        </Link>
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
