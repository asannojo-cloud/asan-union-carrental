import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import type { ReservationSummary } from "../shared/types";
import { formatDateKorean, STATUS_LABELS } from "../shared/formatters";

type Phase = "search" | "list" | "detail";

export default function ReservationLookupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("search");
  const [groups, setGroups] = useState<ReservationSummary[][]>([]);
  const [selected, setSelected] = useState<ReservationSummary[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", phone: "", destination: "", purpose: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<ReservationSummary[][]>("/reservations/lookup", {
        name: name.trim(),
        phone: phone.trim(),
      });
      setGroups(data);
      if (data.length === 1) {
        openGroup(data[0]);
      } else {
        setPhase("list");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "조회 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function openGroup(group: ReservationSummary[]) {
    setSelected(group);
    const first = group[0];
    setForm({
      name: first.name,
      department: first.department,
      phone: first.phone,
      destination: first.destination ?? "",
      purpose: first.purpose ?? "",
    });
    setEditing(false);
    setError(null);
    setPhase("detail");
  }

  function backToSearch() {
    setPhase("search");
    setGroups([]);
    setSelected(null);
    setError(null);
  }

  async function handleSaveEdit() {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.patch<ReservationSummary[]>(`/reservations/${selected[0].reservationNumber}`, {
        verifyPhone: phone.trim(),
        name: form.name,
        department: form.department,
        phone: form.phone,
        destination: form.destination,
        purpose: form.purpose,
      });
      setSelected(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!selected) return;
    if (!window.confirm("정말로 이 예약을 취소하시겠습니까?")) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.patch<ReservationSummary[]>(`/reservations/${selected[0].reservationNumber}/cancel`, {
        verifyPhone: phone.trim(),
      });
      setSelected(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "취소 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function periodLabelOf(group: ReservationSummary[]) {
    const first = group[0];
    const last = group[group.length - 1];
    return group.length === 1
      ? formatDateKorean(first.rentalDate)
      : `${formatDateKorean(first.rentalDate)} ~ ${formatDateKorean(last.rentalDate)} (${group.length}일)`;
  }

  if (phase === "search") {
    return (
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">예약확인</h2>
        <p className="text-sm text-slate-500 mb-4">예약 시 입력하신 이름과 전화번호를 입력하면 예약 내용을 확인·수정·취소할 수 있습니다.</p>
        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              inputMode="tel"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-900 text-white py-3 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "조회 중..." : "예약 조회"}
          </button>
        </form>
        <Link to="/" className="block text-center text-sm text-slate-400 mt-4 underline">
          캘린더로 돌아가기
        </Link>
      </div>
    );
  }

  if (phase === "list") {
    return (
      <div>
        <button onClick={backToSearch} className="text-sm text-slate-400 mb-3">‹ 다시 조회</button>
        <h2 className="text-lg font-bold text-slate-900 mb-4">예약확인 — {groups.length}건 조회됨</h2>
        <div className="space-y-2">
          {groups.map((group, i) => (
            <button
              key={i}
              onClick={() => openGroup(group)}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-300"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900 text-sm">{group[0].vehicleName ?? group[0].vehicleId}</p>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100">{STATUS_LABELS[group[0].status]}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{periodLabelOf(group)}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // phase === "detail"
  if (!selected) return null;
  const first = selected[0];
  const periodLabel = periodLabelOf(selected);

  return (
    <div>
      <button onClick={() => (groups.length > 1 ? setPhase("list") : backToSearch())} className="text-sm text-slate-400 mb-3">
        ‹ {groups.length > 1 ? "목록으로" : "다시 조회"}
      </button>
      <h2 className="text-lg font-bold text-slate-900 mb-4">예약확인</h2>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-500">{first.reservationNumber}</p>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100">{STATUS_LABELS[first.status]}</span>
        </div>

        <dl className="text-sm divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mb-4">
          <Row label="차량" value={first.vehicleName ?? String(first.vehicleId)} />
          <Row label="대여기간" value={periodLabel} />
          {editing ? (
            <>
              <EditRow label="이름"><input className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></EditRow>
              <EditRow label="실과"><input className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></EditRow>
              <EditRow label="전화번호"><input className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></EditRow>
              <EditRow label="방문지역"><input className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></EditRow>
              <EditRow label="대여목적"><textarea className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></EditRow>
            </>
          ) : (
            <>
              <Row label="이름" value={first.name} />
              <Row label="실과" value={first.department} />
              <Row label="전화번호" value={first.phone} />
              <Row label="방문지역" value={first.destination || "-"} />
              <Row label="대여목적" value={first.purpose || "-"} />
            </>
          )}
        </dl>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {first.status === "CANCELLED" ? (
          <p className="text-sm text-slate-400 text-center py-2">취소된 예약입니다.</p>
        ) : editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={submitting}
              className="flex-1 rounded-lg bg-slate-100 text-slate-700 py-2.5 text-sm font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-900 text-white py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {first.status === "PENDING" && (
              <button
                onClick={() => setEditing(true)}
                disabled={submitting}
                className="flex-1 rounded-lg bg-slate-100 text-slate-700 py-2.5 text-sm font-medium"
              >
                예약 수정
              </button>
            )}
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="flex-1 rounded-lg bg-pink-400 hover:bg-pink-500 text-white py-2.5 text-sm font-medium disabled:opacity-50"
            >
              예약 취소
            </button>
          </div>
        )}
        {first.status === "CONFIRMED" && !editing && (
          <p className="text-xs text-slate-400 mt-2">이미 확정된 예약은 내용 수정이 어렵습니다. 변경이 필요하면 문의해주세요.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5">
      <span className="text-slate-400 text-xs block mb-1">{label}</span>
      {children}
    </div>
  );
}
