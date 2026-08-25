import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../shared/api";
import type { Vehicle, CalendarEntry, AdminReservation, WeekdayCode } from "../shared/types";
import { buildMonthGrid, shiftMonth } from "../shared/dateGrid";
import { STATUS_LABELS } from "../shared/formatters";
import { vehicleTheme } from "../shared/vehicleColors";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_CODE_BY_INDEX: WeekdayCode[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function todayKST() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return parts;
}

export default function AdminCalendarPage() {
  const today = todayKST();
  const [y, m] = today.split("-").map(Number);
  const [year, setYear] = useState(y);
  const [month, setMonth] = useState(m);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayReservations, setDayReservations] = useState<AdminReservation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Vehicle[]>("/admin/vehicles").then(setVehicles).catch(() => {});
  }, []);

  const loadCalendar = useCallback(() => {
    api.get<CalendarEntry[]>(`/reservations/calendar?year=${year}&month=${month}`).then(setEntries).catch(() => {});
  }, [year, month]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!selectedDate) return;
    api.get<AdminReservation[]>(`/admin/reservations?date=${selectedDate}`).then(setDayReservations).catch(() => {});
  }, [selectedDate]);

  const weeks = buildMonthGrid(year, month);

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setSelectedDate(null);
  }

  function statusOf(vehicle: Vehicle, dateStr: string) {
    const weekday = WEEKDAY_CODE_BY_INDEX[new Date(dateStr + "T00:00:00Z").getUTCDay()];
    if (!vehicle.available_weekdays.includes(weekday)) return "이용불가";
    const entry = entries.find((e) => e.vehicleId === vehicle.id && e.rentalDate === dateStr);
    return entry ? STATUS_LABELS[entry.status] : "예약가능";
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-5">예약 캘린더</h2>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => goMonth(-1)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">‹ 이전 달</button>
          <p className="font-bold text-slate-900">{year}년 {month}월</p>
          <button onClick={() => goMonth(1)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">다음 달 ›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
          {WEEKDAY_HEADERS.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const day = Number(dateStr.slice(-2));
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`rounded-lg p-1 flex flex-col items-center gap-0.5 border text-left ${isSelected ? "border-brand-500 ring-1 ring-brand-500" : "border-transparent"}`}
              >
                <span className="text-xs text-slate-700">{day}</span>
                {vehicles.map((v) => {
                  const theme = vehicleTheme(v.vehicle_name);
                  return (
                    <span key={v.id} className={`text-[8px] rounded px-1 truncate w-full flex items-center gap-0.5`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
                      <span className="text-slate-500">{v.vehicle_name[0]} {statusOf(v, dateStr)}</span>
                    </span>
                  );
                })}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-4">
          <p className="font-bold text-slate-900 mb-3">{selectedDate}</p>
          <div className="space-y-2">
            {vehicles.map((v) => {
              const res = dayReservations.find((r) => r.vehicle_id === v.id && r.status !== "CANCELLED");
              const theme = vehicleTheme(v.vehicle_name);
              return (
                <div key={v.id} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${theme.card}`}>
                  <div>
                    <p className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full mb-1 ${theme.badge}`}>
                      🚗 {v.vehicle_name}
                    </p>
                    {res ? (
                      <p className="text-xs text-slate-500">{res.name} · {res.department} · {STATUS_LABELS[res.status]}</p>
                    ) : (
                      <p className="text-xs text-slate-400">{statusOf(v, selectedDate)}</p>
                    )}
                  </div>
                  {res ? (
                    <Link to={`/admin/reservations/${res.id}`} className="text-brand-600 underline text-sm">상세보기</Link>
                  ) : statusOf(v, selectedDate) === "예약가능" ? (
                    <button
                      onClick={() => navigate(`/admin/reservations/new?vehicleId=${v.id}&date=${selectedDate}`)}
                      className="text-sm bg-brand-900 text-white rounded-lg px-3 py-1.5"
                    >
                      등록
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
