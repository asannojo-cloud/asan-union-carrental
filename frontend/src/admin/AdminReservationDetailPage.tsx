import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import type { AdminReservation, Vehicle } from "../shared/types";
import { STATUS_LABELS, formatDateTimeKST } from "../shared/formatters";
import { vehicleTheme } from "../shared/vehicleColors";

export default function AdminReservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<AdminReservation | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<AdminReservation>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.get<AdminReservation>(`/admin/reservations/${id}`);
    setReservation(data);
    setForm(data);
  }

  useEffect(() => {
    load().catch(() => {});
    api.get<Vehicle[]>("/admin/vehicles").then(setVehicles).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!reservation) return <p className="text-slate-400 text-sm">불러오는 중...</p>;

  async function runAction(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    await runAction(() => api.patch(`/admin/reservations/${id}/confirm`));
  }

  async function handleCancel() {
    if (!window.confirm("해당 예약을 취소하시겠습니까?")) return;
    await runAction(() => api.patch(`/admin/reservations/${id}/cancel`));
  }

  async function handleSaveEdit() {
    await runAction(async () => {
      await api.patch(`/admin/reservations/${id}`, {
        vehicleId: form.vehicle_id,
        rentalDate: form.rental_date,
        name: form.name,
        department: form.department,
        phone: form.phone,
        destination: form.destination,
        purpose: form.purpose,
        status: form.status,
      });
      setEditing(false);
    });
  }

  async function handleDelete() {
    if (!window.confirm("이 예약을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    if (!window.confirm("정말로 삭제하시겠습니까? 다시 한번 확인해주세요.")) return;
    await runAction(async () => {
      await api.delete(`/admin/reservations/${id}`);
      navigate("/admin/reservations", { replace: true });
    });
  }

  return (
    <div className="max-w-xl">
      <Link to="/admin/reservations" className="text-sm text-slate-400 mb-3 inline-block">‹ 목록으로</Link>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">예약 상세</h2>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-slate-100">{STATUS_LABELS[reservation.status]}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <Field label="예약번호"><p className="text-sm text-slate-800">{reservation.reservation_number}</p></Field>

        <Field label="차량">
          {editing ? (
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: Number(e.target.value) })}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
            >
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_name}</option>)}
            </select>
          ) : (
            <p
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${vehicleTheme(reservation.vehicle_name).badge}`}
            >
              🚗 {reservation.vehicle_name}
            </p>
          )}
        </Field>

        <Field label="이용일">
          {editing ? (
            <input type="date" value={form.rental_date} onChange={(e) => setForm({ ...form, rental_date: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          ) : (
            <p className="text-sm text-slate-800">{reservation.rental_date}</p>
          )}
        </Field>

        <Field label="예약자 이름">
          {editing ? <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" /> : <p className="text-sm text-slate-800">{reservation.name}</p>}
        </Field>
        <Field label="실과">
          {editing ? <input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" /> : <p className="text-sm text-slate-800">{reservation.department}</p>}
        </Field>
        <Field label="전화번호">
          {editing ? <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" /> : <p className="text-sm text-slate-800">{reservation.phone}</p>}
        </Field>
        <Field label="방문지역">
          {editing ? <input value={form.destination ?? ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" /> : <p className="text-sm text-slate-800">{reservation.destination || "-"}</p>}
        </Field>
        <Field label="대여목적">
          {editing ? <textarea value={form.purpose ?? ""} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-full" /> : <p className="text-sm text-slate-800">{reservation.purpose || "-"}</p>}
        </Field>

        <Field label="신청일시"><p className="text-sm text-slate-500">{formatDateTimeKST(reservation.created_at)}</p></Field>
        <Field label="현재 상태">
          {editing ? (
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AdminReservation["status"] })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="PENDING">예약신청</option>
              <option value="CONFIRMED">예약확정</option>
              <option value="CANCELLED">예약취소</option>
            </select>
          ) : (
            <p className="text-sm text-slate-800">{STATUS_LABELS[reservation.status]}</p>
          )}
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {editing ? (
            <>
              <button disabled={busy} onClick={handleSaveEdit} className="bg-brand-900 text-white text-sm rounded-lg px-4 py-2">저장</button>
              <button disabled={busy} onClick={() => { setEditing(false); setForm(reservation); }} className="bg-slate-100 text-slate-600 text-sm rounded-lg px-4 py-2">취소</button>
            </>
          ) : (
            <>
              {reservation.status === "PENDING" && (
                <button disabled={busy} onClick={handleConfirm} className="bg-sky-400 hover:bg-sky-500 text-white text-sm rounded-lg px-4 py-2">예약 확정</button>
              )}
              {(reservation.status === "PENDING" || reservation.status === "CONFIRMED") && (
                <button disabled={busy} onClick={handleCancel} className="bg-status-pending text-white text-sm rounded-lg px-4 py-2">예약 취소</button>
              )}
              <button disabled={busy} onClick={() => setEditing(true)} className="bg-slate-100 text-slate-700 text-sm rounded-lg px-4 py-2">수정</button>
              <button disabled={busy} onClick={handleDelete} className="bg-white text-red-600 border border-red-200 text-sm rounded-lg px-4 py-2 ml-auto">완전삭제</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  );
}
