import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import type { Vehicle } from "../shared/types";

export default function AdminReservationCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | "">(params.get("vehicleId") ? Number(params.get("vehicleId")) : "");
  const [rentalDate, setRentalDate] = useState(params.get("date") ?? "");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [allowPastDate, setAllowPastDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Vehicle[]>("/admin/vehicles").then((list) => {
      setVehicles(list);
      if (!params.get("vehicleId")) {
        const active = list.find((v) => v.active);
        if (active) setVehicleId(active.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = vehicleId !== "" && rentalDate && name.trim() && department.trim() && phone.trim() && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const reservation = await api.post<{ id: number }>("/admin/reservations", {
        vehicleId,
        rentalDate,
        name: name.trim(),
        department: department.trim(),
        phone: phone.trim(),
        destination: destination.trim() || undefined,
        purpose: purpose.trim() || undefined,
        allowPastDate,
      });
      navigate(`/admin/reservations/${reservation.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold text-slate-900 mb-1">예약 등록</h2>
      <p className="text-sm text-slate-500 mb-5">전화·방문 접수 등 관리자가 직접 등록하는 예약입니다. 기본적으로 예약확정 상태로 등록됩니다.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">차량 *</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">이용일 *</label>
          <input type="date" value={rentalDate} onChange={(e) => setRentalDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">이름 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">실과 *</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">전화번호 *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="010-1234-5678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">방문지역 (선택)</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대여목적 (선택)</label>
          <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={allowPastDate} onChange={(e) => setAllowPastDate(e.target.checked)} />
          지난 날짜 예약 허용 (특별한 사유가 있는 경우에만 사용)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={!canSubmit} className="w-full bg-brand-900 text-white rounded-lg py-3 text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400">
          {submitting ? "등록 중..." : "예약 등록"}
        </button>
      </form>
    </div>
  );
}
