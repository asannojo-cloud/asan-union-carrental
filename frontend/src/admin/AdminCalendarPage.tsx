import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../shared/api";
import type { Vehicle, WeekdayCode } from "../shared/types";
import { buildMonthGrid, shiftMonth } from "../shared/dateGrid";
import { vehicleTheme } from "../shared/vehicleColors";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_CODE_BY_INDEX: WeekdayCode[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface AdminCalendarEntry {
  id: number;
  vehicle_id: number;
  rental_date: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  name: string;
  department: string;
}

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
  const [entries, setEntries] = useState<AdminCalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Vehicle[]>("/admin/vehicles").then(setVehicles).catch(() => {});
  }, []);

  const loadCalendar = useCallback(() => {
    api.get<AdminCalendarEntry[]>(`/admin/reservations/calendar?year=${year}&month=${month}`).then(setEntries).catch(() => {});
  }, [year, month]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const weeks = buildMonthGrid(year, month);

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setSelectedDate(null);
  }

  function isVehicleAvailable(vehicle: Vehicle, dateStr: string) {
    const weekday = WEEKDAY_CODE_BY_INDEX[new Date(dateStr + "T00:00:00Z").getUTCDay()];
    return vehicle.available_weekdays.includes(weekday);
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
            const dayEntries = entries.filter((e) => e.rental_date === dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`rounded-lg p-1 min-h-[52px] flex flex-col items-start gap-0.5 border text-left ${isSelected ? "border-brand-500 ring-1 ring-brand-500" : "border-transparent"}`}
              >
                <span className="text-xs text-slate-700">{day}</span>
                {/* 예약이 있는 날짜만 신청자 실과·이름을 보여준다 — 예약 없는 날짜는 비워둔다. */}
                {dayEntries.map((entry) => {
                  const theme = vehicleTheme(vehicles.find((v) => v.id === entry.vehicle_id)?.vehicle_name ?? "");
                  return (
                    <Link
                      key={entry.id}
                      to={`/admin/reservations/${entry.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[8px] leading-tight rounded px-1 truncate w-full ${theme.badge} hover:underline`}
                      title={`${entry.department} ${entry.name}`}
                    >
                      {entry.department} {entry.name}
                    </Link>
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
              const res = entries.find((e) => e.vehicle_id === v.id && e.rental_date === selectedDate);
              const theme = vehicleTheme(v.vehicle_name);
              const available = isVehicleAvailable(v, selectedDate);
              return (
                <div key={v.id} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${theme.card}`}>
                  <div>
                    <p className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full mb-1 ${theme.badge}`}>
                      🚗 {v.vehicle_name}
                    </p>
                    {res && <p className="text-xs text-slate-600">{res.department} {res.name}</p>}
                  </div>
                  {res ? (
                    <Link to={`/admin/reservations/${res.id}`} className="text-brand-600 underline text-sm">상세보기</Link>
                  ) : available ? (
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
