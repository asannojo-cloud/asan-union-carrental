/** 차량별 강조 색상: 하모니카는 민트, 아아카는 핑크 (그 외 향후 추가 차량은 기본 슬레이트). */
export interface VehicleTheme {
  card: string; // 카드/행 배경+테두리
  badge: string; // 차량명 배지
  dot: string; // 범례용 점 색상
}

export function vehicleTheme(vehicleName: string): VehicleTheme {
  if (vehicleName === "하모니카") {
    return {
      card: "bg-emerald-50 border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  if (vehicleName === "아아카") {
    return {
      card: "bg-pink-50 border-pink-200",
      badge: "bg-pink-100 text-pink-700",
      dot: "bg-pink-500",
    };
  }
  return {
    card: "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  };
}
