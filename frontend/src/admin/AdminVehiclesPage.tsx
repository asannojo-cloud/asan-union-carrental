import { useEffect, useState } from "react";
import { api, ApiError } from "../shared/api";
import type { Vehicle, WeekdayCode } from "../shared/types";

const WEEKDAYS: { code: WeekdayCode; label: string }[] = [
  { code: "MON", label: "월" },
  { code: "TUE", label: "화" },
  { code: "WED", label: "수" },
  { code: "THU", label: "목" },
  { code: "FRI", label: "금" },
  { code: "SAT", label: "토" },
  { code: "SUN", label: "일" },
];

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  async function load() {
    try {
      const data = await api.get<Vehicle[]>("/admin/vehicles");
      setVehicles(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "차량 목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleDay(vehicle: Vehicle, day: WeekdayCode) {
    const has = vehicle.available_weekdays.includes(day);
    const nextDays = has
      ? vehicle.available_weekdays.filter((d) => d !== day)
      : [...vehicle.available_weekdays, day];

    if (nextDays.length === 0) {
      setError("이용 가능 요일을 하나 이상 선택해주세요.");
      return;
    }

    setError(null);
    setSavingId(vehicle.id);
    setSavedId(null);
    try {
      const updated = await api.patch<Vehicle>(`/admin/vehicles/${vehicle.id}`, {
        availableWeekdays: nextDays,
      });
      setVehicles((prev) => (prev ? prev.map((v) => (v.id === vehicle.id ? updated : v)) : prev));
      setSavedId(vehicle.id);
      setTimeout(() => setSavedId((cur) => (cur === vehicle.id ? null : cur)), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold text-slate-900 mb-1">차량 관리</h2>
      <p className="text-sm text-slate-500 mb-5">요일을 클릭해서 각 차량의 예약 가능 요일을 바로 변경할 수 있습니다.</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {vehicles === null ? (
        <p className="text-sm text-slate-400">불러오는 중...</p>
      ) : (
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-slate-900">{vehicle.vehicle_name}</p>
                {savingId === vehicle.id && <span className="text-xs text-slate-400">저장 중...</span>}
                {savedId === vehicle.id && <span className="text-xs text-status-confirmed">저장됨</span>}
              </div>
              <div className="flex gap-2">
                {WEEKDAYS.map(({ code, label }) => {
                  const active = vehicle.available_weekdays.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={savingId === vehicle.id}
                      onClick={() => toggleDay(vehicle, code)}
                      className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
                        active
                          ? "bg-brand-900 text-white border-brand-900"
                          : "bg-white text-slate-400 border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
