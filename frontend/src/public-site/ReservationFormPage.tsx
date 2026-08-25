import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import type { Vehicle, ReservationSummary, CalendarEntry } from "../shared/types";
import { formatDateKorean } from "../shared/formatters";
import { addDays, dateRange } from "../shared/dateGrid";
import { PRICE_PER_DAY, MAX_RENTAL_DAYS as MAX_DAYS } from "../shared/pricing";
import UsageGuide from "./UsageGuide";
import AccountCopyBox from "../shared/AccountCopyBox";

const PHONE_RE = /^[0-9-]{9,14}$/;
const WEEKDAY_CODE_BY_INDEX = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export default function ReservationFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const vehicleId = Number(params.get("vehicleId"));
  const startDate = params.get("date") ?? "";
  const initialDays = Math.min(MAX_DAYS, Math.max(1, Number(params.get("days")) || 1));

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [days, setDays] = useState(initialDays);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const endDate = useMemo(() => addDays(startDate, days - 1), [startDate, days]);
  const selectedDates = useMemo(() => dateRange(startDate, endDate), [startDate, endDate]);
  const totalPrice = days * PRICE_PER_DAY;

  useEffect(() => {
    api
      .get<Vehicle[]>("/vehicles")
      .then((list) => setVehicle(list.find((v) => v.id === vehicleId) ?? null))
      .catch(() => setVehicle(null));
  }, [vehicleId]);

  // 대여 일수를 늘렸을 때, 늘어난 기간 중 이용 불가/이미 예약된 날짜가 있는지 미리 확인해 안내한다.
  // (최종 검증은 서버에서 다시 하므로 이건 사용자 편의를 위한 사전 확인일 뿐이다.)
  useEffect(() => {
    if (!vehicle || days === 1) {
      setRangeWarning(null);
      return;
    }
    const months = new Set(selectedDates.map((d) => d.slice(0, 7)));
    Promise.all(
      [...months].map((ym) => {
        const [y, m] = ym.split("-").map(Number);
        return api.get<CalendarEntry[]>(`/reservations/calendar?year=${y}&month=${m}`);
      })
    )
      .then((results) => {
        const entries = results.flat();
        for (const d of selectedDates) {
          const weekday = WEEKDAY_CODE_BY_INDEX[new Date(d + "T00:00:00Z").getUTCDay()];
          if (!vehicle.available_weekdays.includes(weekday)) {
            setRangeWarning(`${formatDateKorean(d)}은(는) ${vehicle.vehicle_name} 이용 가능 요일이 아닙니다.`);
            return;
          }
          const taken = entries.find((e) => e.vehicleId === vehicle.id && e.rentalDate === d);
          if (taken) {
            setRangeWarning(`${formatDateKorean(d)}은(는) 이미 예약이 있습니다.`);
            return;
          }
        }
        setRangeWarning(null);
      })
      .catch(() => setRangeWarning(null));
  }, [vehicle, days, selectedDates]);

  const phoneValid = PHONE_RE.test(phone.trim());
  const canSubmit = name.trim() && department.trim() && phoneValid && agreed && !submitting && !rangeWarning;

  if (!vehicleId || !startDate) {
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
      const reservations = await api.post<ReservationSummary[]>("/reservations", {
        vehicleId,
        startDate,
        endDate,
        name: name.trim(),
        department: department.trim(),
        phone: phone.trim(),
        destination: destination.trim() || undefined,
        purpose: purpose.trim() || undefined,
      });
      navigate("/reserve/complete", { state: { reservations, vehicleName: vehicle?.vehicle_name } });
    } catch (err) {
      setConfirming(false);
      setError(err instanceof ApiError ? err.message : "예약 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const periodLabel =
    days === 1 ? formatDateKorean(startDate) : `${formatDateKorean(startDate)} ~ ${formatDateKorean(endDate)} (${days}일)`;

  if (confirming) {
    return (
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">예약신청 확인</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-4">입력하신 정보가 정확한지 확인해주세요.</p>
          <dl className="text-sm divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mb-5">
            <Row label="대여기간" value={periodLabel} />
            <Row label="차량" value={vehicle?.vehicle_name ?? ""} />
            <Row label="이용요금" value={`${totalPrice.toLocaleString()}원`} />
            <Row label="이름" value={name} />
            <Row label="실과" value={department} />
            <Row label="전화번호" value={phone} />
            <Row label="방문지역" value={destination || "-"} />
            <Row label="대여목적" value={purpose || "-"} />
          </dl>
          <AccountCopyBox className="mb-5" />
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
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">시작일</p>
            <p className="font-medium text-slate-900">{formatDateKorean(startDate)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">차량</p>
            <p className="font-medium text-slate-900">{vehicle?.vehicle_name ?? "불러오는 중..."}</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">대여 일수</label>
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setDays((d) => Math.max(1, d - 1))}
            className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-bold disabled:opacity-40"
            disabled={days <= 1}
          >
            −
          </button>
          <span className="text-sm font-medium text-slate-900 min-w-[3rem] text-center">{days}일</span>
          <button
            type="button"
            onClick={() => setDays((d) => Math.min(MAX_DAYS, d + 1))}
            className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-bold disabled:opacity-40"
            disabled={days >= MAX_DAYS}
          >
            +
          </button>
          <span className="text-xs text-slate-500">최대 {MAX_DAYS}일까지 신청 가능</span>
        </div>
        <p className="text-sm text-slate-700">
          {periodLabel} · <span className="font-medium text-brand-700">{totalPrice.toLocaleString()}원</span>
        </p>
        {rangeWarning && <p className="text-xs text-red-500 mt-2">{rangeWarning}</p>}
      </div>

      <div className="mb-4">
        <UsageGuide agreed={agreed} onAgreedChange={setAgreed} />
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
