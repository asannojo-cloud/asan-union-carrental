import { useLocation, Link, Navigate } from "react-router-dom";
import type { ReservationSummary } from "../shared/types";
import { formatDateKorean, STATUS_LABELS } from "../shared/formatters";

interface LocationState {
  reservation: ReservationSummary;
  vehicleName?: string;
}

export default function ReservationCompletePage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  if (!state?.reservation) {
    return <Navigate to="/" replace />;
  }

  const { reservation, vehicleName } = state;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-status-pending/10 text-status-pending flex items-center justify-center mx-auto mb-4 text-2xl">
        ✓
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">예약신청이 완료되었습니다.</h2>
      <p className="text-sm text-slate-500 mb-6">관리자 확인 후 예약이 확정됩니다.</p>

      <dl className="text-left text-sm divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mb-4">
        <Row label="차량명" value={vehicleName ?? String(reservation.vehicleId)} />
        <Row label="이용일" value={formatDateKorean(reservation.rentalDate)} />
        <Row label="예약자명" value={reservation.name} />
        <Row label="실과" value={reservation.department} />
        <Row label="전화번호" value={reservation.phone} />
        <Row label="방문지역" value={reservation.destination || "-"} />
        <Row label="대여목적" value={reservation.purpose || "-"} />
        <Row label="예약상태" value={STATUS_LABELS[reservation.status]} highlight />
        <Row label="예약번호" value={reservation.reservationNumber} />
      </dl>

      <p className="text-xs text-slate-400 mb-6">예약확정 여부는 관리자 확인 후 반영됩니다.</p>

      <Link to="/" className="inline-block w-full rounded-lg bg-brand-900 text-white py-3 text-sm font-medium">
        캘린더로 돌아가기
      </Link>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? "font-medium text-status-pending" : "text-slate-800"}>{value}</span>
    </div>
  );
}
