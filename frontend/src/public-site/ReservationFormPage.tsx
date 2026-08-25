import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import type { Vehicle, ReservationSummary } from "../shared/types";
import { formatDateKorean } from "../shared/formatters";

const PHONE_RE = /^[0-9-]{9,14}$/;

export default function ReservationFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const vehicleId = Number(params.get("vehicleId"));
  const date = params.get("date") ?? "";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api
      .get<Vehicle[]>("/vehicles")
      .then((list) => setVehicle(list.find((v) => v.id === vehicleId) ?? null))
      .catch(() => setVehicle(null));
  }, [vehicleId]);

  const phoneValid = PHONE_RE.test(phone.trim());
  const canSubmit = name.trim() && department.trim() && phoneValid && !submitting;

  if (!vehicleId || !date) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">
        잘못된 접근입니다.{" "}
        <Link to="/" className="text-brand-600 underline">
          캘린더로 돌아가기
        </Link>
      </div>
    );
  }

  function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setConfirming(true); // PRD 10절 — 신청 전 확인 단계로 전환
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const reservation = await api.post<ReservationSummary>("/reservations", {
        vehicleId,
        rentalDate: date,
        name: name.trim(),
        department: department.trim(),
        phone: phone.trim(),
        destination: destination.trim() || undefined,
        purpose: purpose.trim() || undefined,
      });
      navigate("/reserve/complete", { state: { reservation, vehicleName: vehicle?.vehicle_name } });
    } catch (err) {
      setConfirming(false);
      setError(err instanceof ApiError ? err.message : "예약 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">예약신청 확인</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-4">입력하신 정보가 정확한지 확인해주세요.</p>
          <dl className="text-sm divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mb-5">
            <Row label="이용일" value={formatDateKorean(date)} />
            <Row label="차량" value={vehicle?.vehicle_name ?? ""} />
            <Row label="이름" value={name} />
            <Row label="실과" value={department} />
            <Row label="전화번호" value={phone} />
            <Row label="방문지역" value={destination || "-"} />
            <Row label="대여목적" value={purpose || "-"} />
          </dl>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg bg-slate-100 text-slate-700 py-3 text-sm font-medium"
              disabled={submitting}
            >
              다시 입력
            </button>
            <button
              onClick={handleConfirmSubmit}
              className="flex-1 rounded-lg bg-brand-900 text-white py-3 text-sm font-medium disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "처리 중..." : "예약신청 확정"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-4">예약신청</h2>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1">이용일</p>
            <p className="font-medium text-slate-900">{formatDateKorean(date)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">차량</p>
            <p className="font-medium text-slate-900">{vehicle?.vehicle_name ?? "불러오는 중..."}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleReviewSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            실과 <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="예: 총무과, 기획예산과"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            inputMode="tel"
          />
          {phone && !phoneValid && <p className="text-xs text-red-500 mt-1">올바른 전화번호를 입력해주세요.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">방문지역 (선택)</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="예: 서울, 대전, 천안, 아산"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대여목적 (선택)</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-brand-900 text-white py-3 text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400"
        >
          예약신청
        </button>
      </form>
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
