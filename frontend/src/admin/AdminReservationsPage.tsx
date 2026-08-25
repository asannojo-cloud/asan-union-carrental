import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";
import type { AdminReservation, Vehicle } from "../shared/types";
import { STATUS_LABELS } from "../shared/formatters";

export default function AdminReservationsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rows, setRows] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    api.get<Vehicle[]>("/admin/vehicles").then(setVehicles).catch(() => {});
  }, []);

  async function search() {
    setLoading(true);
    const q = new URLSearchParams();
    if (date) q.set("date", date);
    if (vehicleId) q.set("vehicleId", vehicleId);
    if (status) q.set("status", status);
    if (name) q.set("name", name);
    if (department) q.set("department", department);
    try {
      const data = await api.get<AdminReservation[]>(`/admin/reservations?${q.toString()}`);
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">예약 관리</h2>
        <Link to="/admin/reservations/new" className="text-sm bg-brand-900 text-white rounded-lg px-4 py-2">
          + 예약 등록
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">전체 차량</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.vehicle_name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">전체 상태</option>
            <option value="PENDING">예약신청</option>
            <option value="CONFIRMED">예약확정</option>
            <option value="CANCELLED">예약취소</option>
          </select>
          <input placeholder="예약자명" value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          <input placeholder="실과" value={department} onChange={(e) => setDepartment(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <button onClick={search} className="mt-3 text-sm bg-slate-800 text-white rounded-lg px-4 py-1.5">검색</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="px-3 py-2">예약번호</th>
              <th className="px-3 py-2">이용일</th>
              <th className="px-3 py-2">차량</th>
              <th className="px-3 py-2">예약자</th>
              <th className="px-3 py-2">실과</th>
              <th className="px-3 py-2">전화번호</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">신청일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-6 text-slate-400">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6 text-slate-400">검색 결과가 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link to={`/admin/reservations/${r.id}`} className="text-brand-600 underline">
                      {r.reservation_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.rental_date}</td>
                  <td className="px-3 py-2">{r.vehicle_name}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.department}</td>
                  <td className="px-3 py-2">{r.phone}</td>
                  <td className="px-3 py-2">{STATUS_LABELS[r.status]}</td>
                  <td className="px-3 py-2 text-slate-400">{r.created_at.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
