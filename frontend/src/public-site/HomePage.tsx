import { useEffect, useState, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../shared/api";
import type { Vehicle, CalendarEntry, WeekdayCode } from "../shared/types";
import { buildMonthGrid, shiftMonth, dateRange } from "../shared/dateGrid";
import { todayKST, formatDateKorean } from "../shared/formatters";
import { PRICE_PER_DAY } from "../shared/pricing";

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
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<Vehicle[]>("/vehicles")
      .then((list) => {
        setVehicles(list);
        // 처음 접속 시 첫 번째 차량(하모니카)을 기본 선택해 바로 달력을 확인할 수 있게 한다.
        setSelectedVehicleId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch(() => setVehicles([]));
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

  // 드래그 중 마우스 버튼을 달력 밖에서 놓는 경우까지 대비한 전역 리스너.
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, rangeStart, rangeEnd, selectedVehicle]);

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
  }

  function resetSelection() {
    setIsDragging(false);
    setRangeStart(null);
    setRangeEnd(null);
    setRangeError(null);
  }

  // 캘린더에서 시작일을 누른 채로 끌어서(드래그) 기간을 블록처럼 선택한다. 마우스/터치 모두 지원.
  function findDateAt(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY);
    const dateEl = el instanceof Element ? el.closest<HTMLElement>("[data-date]") : null;
    return dateEl?.dataset.date ?? null;
  }

  function handlePointerDownCell(dateStr: string, reservable: boolean) {
    if (!reservable) return;
    setIsDragging(true);
    setRangeStart(dateStr);
    setRangeEnd(dateStr);
    setRangeError(null);
  }

  function handleGridPointerMove(e: ReactPointerEvent) {
    if (!isDragging) return;
    const d = findDateAt(e.clientX, e.clientY);
    if (d) setRangeEnd(d);
  }

  function finishDrag() {
    if (!isDragging || !rangeStart) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    if (!selectedVehicle) return;

    const end = rangeEnd ?? rangeStart;
    const lo = rangeStart < end ? rangeStart : end;
    const hi = rangeStart < end ? end : rangeStart;
    const days = dateRange(lo, hi);

    const blocked = days.find((d) => statusOf(selectedVehicle, d) !== "AVAILABLE");
    if (blocked) {
      setRangeError(`${formatDateKorean(blocked)}은(는) 예약할 수 없어 해당 기간을 선택할 수 없습니다. 다시 선택해주세요.`);
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    setRangeStart(lo);
    setRangeEnd(hi);
  }

  function isInRange(dateStr: string) {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    const lo = rangeStart < end ? rangeStart : end;
    const hi = rangeStart < end ? end : rangeStart;
    return dateStr >= lo && dateStr <= hi;
  }

  const selectedDays = rangeStart ? dateRange(rangeStart, rangeEnd ?? rangeStart).length : 0;

  function goToReserve() {
    if (!selectedVehicle || !rangeStart) return;
    navigate(`/reserve?vehicleId=${selectedVehicle.id}&date=${rangeStart}&days=${selectedDays}`);
  }

  return (
    <div>
      {/* 이용요금 · 입금 · 대여기간 · 이용대상 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-xs text-slate-700 space-y-2.5">
        <p>
          차량선택 후, 날짜를 클릭하면 신청자 정보 입력 후 <strong>확정</strong> 클릭 후 3일 이내 입금하시면
          예약이 확정됩니다.
          <br />
          (예약자명으로 입금 부탁드립니다)
        </p>
        <div>
          <p className="font-medium text-slate-900">💰 이용요금</p>
          <p>· 1일: 5만원</p>
          <p>※ 1박 2일의 경우 5만원이 아닌 2일 대여이기 때문에 10만원입니다.</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">📅 대여 기간 안내</p>
          <p>예) 1.2~4 대여: 1일에서 2일 넘어가는 자정 12시부터 4일에서 5일 넘어가는 자정 12시까지</p>
        </div>
        <p className="font-medium text-slate-900">
          👤 조합원 외 대여 불가하며, 대여 시 반드시 조합원이 탑승하셔야 합니다.
        </p>
      </div>

      {/* 차량 선택 (PRD 35절 — 누른 차량이 아래 달력에 표시되고, 날짜를 누르면 예약이 진행된다) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {vehicles.map((v) => {
          const active = v.id === selectedVehicleId;
          // 하모니카는 원래 색상(민트), 아아카는 핑크로 차량별로 다른 색을 쓴다.
          const isHarmonica = v.vehicle_name === "하모니카";
          const baseClass = isHarmonica
            ? active
              ? "bg-emerald-100 border-brand-500 ring-1 ring-brand-500"
              : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/60"
            : active
              ? "bg-pink-100 border-brand-500 ring-1 ring-brand-500"
              : "bg-pink-50 border-pink-100 hover:bg-pink-100/60";
          return (
            <button
              key={v.id}
              onClick={() => {
                setSelectedVehicleId(v.id);
                resetSelection();
              }}
              className={`text-left rounded-xl border p-3 transition ${baseClass}`}
            >
              <p className="font-bold text-slate-900 text-sm">🚗 {v.vehicle_name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {v.available_weekdays.length >= 7 ? "평일 · 주말 이용 가능" : "주말 이용 가능"}
              </p>
            </button>
          );
        })}
      </div>

      {/* 캘린더 — 위에서 선택한 차량의 예약현황만 표시한다 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
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
        {selectedVehicle && (
          <p className="text-center text-xs text-brand-600 font-medium mb-2">
            🚗 {selectedVehicle.vehicle_name} 예약현황 — 날짜를 누른 채로 끌어서(드래그) 기간을 선택하세요
          </p>
        )}

        <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-1 select-none touch-none"
          onPointerMove={handleGridPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          {weeks.flat().map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const day = Number(dateStr.slice(-2));
            const isToday = dateStr === today;
            const s = selectedVehicle ? statusOf(selectedVehicle, dateStr) : "PAST";
            const reservable = selectedVehicle !== null && s === "AVAILABLE";
            const inRange = isInRange(dateStr);
            return (
              <button
                key={dateStr}
                data-date={dateStr}
                onPointerDown={() => handlePointerDownCell(dateStr, reservable)}
                disabled={!reservable}
                className={`rounded-lg py-1.5 flex flex-col items-center gap-1 border-2 transition ${
                  inRange ? "border-brand-500 bg-brand-50" : isToday ? "border-brand-200" : "border-transparent"
                } ${reservable ? "cursor-pointer hover:ring-1 hover:ring-brand-400" : "cursor-not-allowed"}`}
              >
                <span className={`text-xs ${inRange ? "text-brand-700 font-bold" : "text-slate-700"}`}>{day}</span>
                <span className={`text-[9px] leading-tight rounded px-1 py-0.5 ${CELL_STYLE[s]}`}>{CELL_LABEL[s]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 기간 선택 요약 및 예약 진행 */}
      {rangeStart && (
        <div className="bg-white rounded-2xl border border-brand-200 p-4 mt-4">
          <p className="text-sm font-medium text-slate-900 mb-1">
            선택한 기간: {formatDateKorean(rangeStart)}
            {rangeEnd && rangeEnd !== rangeStart && ` ~ ${formatDateKorean(rangeEnd)}`}
            {rangeEnd ? ` (${selectedDays}일)` : " (종료일을 선택해주세요)"}
          </p>
          {rangeEnd && (
            <p className="text-sm text-brand-700 font-medium mb-3">
              예상 이용요금: {(selectedDays * PRICE_PER_DAY).toLocaleString()}원
            </p>
          )}
          {rangeError && <p className="text-xs text-red-500 mb-2">{rangeError}</p>}
          <div className="flex gap-2">
            <button onClick={resetSelection} className="flex-1 rounded-lg bg-slate-100 text-slate-700 py-2.5 text-sm font-medium">
              다시 선택
            </button>
            <button
              onClick={goToReserve}
              disabled={!rangeEnd}
              className="flex-1 rounded-lg bg-brand-900 text-white py-2.5 text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400"
            >
              이 기간으로 예약하기
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
