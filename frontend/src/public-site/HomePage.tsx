import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../shared/api";
import type { Vehicle, CalendarEntry, WeekdayCode } from "../shared/types";
import { buildMonthGrid, shiftMonth } from "../shared/dateGrid";
import { todayKST, formatDateKorean, STATUS_LABELS } from "../shared/formatters";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_CODE_BY_INDEX: WeekdayCode[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type CellStatus = "AVAILABLE" | "PENDING" | "CONFIRMED" | "CANCELLED" | "UNAVAILABLE_DAY" | "PAST";

const CELL_STYLE: Record<CellStatus, string> = {
  AVAILABLE: "bg-status-available/10 text-status-available",
  PENDING: "bg-status-pending/10 text-status-pending",
  CONFIRMED: "bg-status-confirmed/10 text-status-confirmed",
  CANCELLED: "bg-slate-100 text-slate-400",
  UNAVAILABLE_DAY: "bg-slate-100 text-slate-400",
  PAST: "bg-slate-100 text-slate-300",
};

const CELL_LABEL: Record<CellStatus, string> = {
  AVAILABLE: "예약가능",
  PENDING: "예약신청",
  CONFIRMED: "예약확정",
  CANCELLED: "예약가능",
  UNAVAILABLE_DAY: "이용불가",
  PAST: "-",
};

export default function HomePage() {
  const today = todayKST();
  const [y, m] = today.split("-").map(Number);
  const [year, setYear] = useState(y);
  const [month, setMonth] = useState(m);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Vehicle[]>("/vehicles").then(setVehicles).catch(() => setVehicles([]));
  }, []);

  const loadCalendar = useCallback(() => {
    api
      .get<CalendarEntry[]>(`/reservations/calendar?year=${year}&month=${month}`)
      .then(setEntries)
      .catch(() => {});
  }, [year, month]);

  useEffect(() => {
    loadCalendar();
    // PRD 32절 — 별도 새로고침 없이 최신 예약현황을 반영하기 위한 짧은 주기 폴링.
    const timer = setInterval(loadCalendar, 8000);
    return () => clearInterval(timer);
  }, [loadCalendar]);

  function statusOf(vehicle: Vehicle, dateStr: string): CellStatus {
    if (dateStr < today) return "PAST";
    const weekday = WEEKDAY_CODE_BY_INDEX[new Date(dateStr + "T00:00:00Z").getUTCDay()];
    if (!vehicle.available_weekdays.includes(weekday)) return "UNAVAILABLE_DAY";
    const entry = entries.find((e) => e.vehicleId === vehicle.id && e.rentalDate === dateStr);
    return (entry?.status as CellStatus) ?? "AVAILABLE";
  }

  const weeks = buildMonthGrid(year, month);

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setSelectedDate(null);
  }

  return (
    <div>
      <p className="text-sm text-slate-600 mb-4">
        원하는 날짜의 차량 예약현황을 확인하고 간편하게 예약하세요. 별도의 회원가입이나 로그인 없이 바로
        신청할 수 있습니다.
      </p>

      {/* 차량 안내 (PRD 35절) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-emerald-50 rounded-xl border border-emerald-100 p-3">
            <p className="font-bold text-slate-900 text-sm">🚗 {v.vehicle_name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {v.available_weekdays.length >= 7 ? "평일 · 주말 이용 가능" : "주말 이용 가능"}
            </p>
          </div>
        ))}
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => goMonth(-1)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            ‹ 이전 달
          </button>
          <p className="font-bold text-slate-900">
            {year}년 {month}월
          </p>
          <button onClick={() => goMonth(1)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            다음 달 ›
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const day = Number(dateStr.slice(-2));
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === today;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`rounded-lg p-1 flex flex-col items-center gap-0.5 border transition ${
                  isSelected ? "border-brand-500 ring-1 ring-brand-500" : "border-transparent"
                } ${isToday ? "bg-brand-50" : ""}`}
              >
                <span className="text-xs text-slate-700">{day}</span>
                <div className="flex flex-col gap-0.5 w-full">
                  {vehicles.map((v) => {
                    const s = statusOf(v, dateStr);
                    return (
                      <span
                        key={v.id}
                        className={`text-[8px] leading-tight rounded px-0.5 truncate ${CELL_STYLE[s]}`}
                        title={`${v.vehicle_name}: ${CELL_LABEL[s]}`}
                      >
                        {v.vehicle_name[0]} {CELL_LABEL[s]}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 상태 범례 (PRD 33절 — 텍스트와 색상 함께) */}
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-status-available inline-block" /> 예약가능
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-status-pending inline-block" /> 예약신청
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-status-confirmed inline-block" /> 예약확정
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> 이용불가
        </span>
      </div>

      {/* 선택한 날짜 상세 (PRD 8절 예약신청 진입점) */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-4">
          <p className="font-bold text-slate-900 mb-3">{formatDateKorean(selectedDate)}</p>
          <div className="space-y-2">
            {vehicles.map((v) => {
              const s = statusOf(v, selectedDate);
              const reservable = s === "AVAILABLE";
              return (
                <div key={v.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{v.vehicle_name}</p>
                    <p className={`text-xs mt-0.5 ${CELL_STYLE[s]} inline-block px-2 py-0.5 rounded-full`}>
                      {STATUS_LABELS[s] ?? CELL_LABEL[s]}
                    </p>
                  </div>
                  <button
                    disabled={!reservable}
                    onClick={() => navigate(`/reserve?vehicleId=${v.id}&date=${selectedDate}`)}
                    className="text-sm font-medium bg-brand-900 text-white rounded-lg px-4 py-2 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    예약신청
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-4 text-xs text-slate-500 space-y-1">
        <p>· 예약신청 후 관리자 확인을 거쳐 예약이 확정됩니다.</p>
        <p>· 예약신청 상태에서도 다른 사용자의 중복예약은 제한됩니다.</p>
        <p>· 예약 관련 문의는 아산시공무원노동조합으로 문의해주세요.</p>
      </div>
    </div>
  );
}
