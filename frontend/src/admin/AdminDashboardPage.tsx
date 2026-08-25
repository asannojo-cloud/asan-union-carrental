import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";
import { STATUS_LABELS } from "../shared/formatters";

interface DashboardData {
  today: string;
  todayReservations: { id: number; vehicle_id: number; vehicle_name: string; status: string }[];
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  byVehicle: {
    vehicle_id: number;
    vehicle_name: string;
    active_count: number;
    pending_count: number;
    confirmed_count: number;
  }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/admin/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data) return <p className="text-slate-400 text-sm">불러오는 중...</p>;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-5">대시보드</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="예약신청" value={data.pendingCount} color="text-status-pending" />
        <StatCard label="예약확정" value={data.confirmedCount} color="text-status-confirmed" />
        <StatCard label="예약취소" value={data.cancelledCount} color="text-status-cancelled" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <p className="font-bold text-slate-900 mb-3">오늘의 예약 ({data.today})</p>
        {data.todayReservations.length === 0 ? (
          <p className="text-sm text-slate-400">오늘 예약이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {data.todayReservations.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{r.vehicle_name}</span>
                <Link to={`/admin/reservations/${r.id}`} className="text-brand-600 underline">
                  {STATUS_LABELS[r.status]}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="font-bold text-slate-900 mb-3">차량별 예약현황</p>
        <div className="space-y-3">
          {data.byVehicle.map((v) => (
            <div key={v.vehicle_id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{v.vehicle_name}</span>
              <span className="text-slate-500">
                신청 {v.pending_count} · 확정 {v.confirmed_count} · 전체 {v.active_count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
