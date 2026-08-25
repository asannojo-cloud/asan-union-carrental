/**
 * 날짜/시간 표시 유틸. 서비스 기준 시간대는 KST(Asia/Seoul) 고정이다 (PRD 29절).
 *
 * rental_date("YYYY-MM-DD")는 서버 DB에서 날짜 문자열 그대로 내려오므로 여기서도
 * Date 객체로 변환하지 않고 문자열 그대로 계산해 타임존으로 인한 날짜 밀림을 방지한다.
 * created_at 등 타임스탬프(ISO, UTC)는 표시할 때만 Intl로 KST 변환한다.
 */

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayLabelOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_LABELS[dt.getUTCDay()];
}

export function formatDateKorean(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${weekdayLabelOf(dateStr)})`;
}

export function formatDateTimeKST(isoString: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function todayKST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "예약가능",
  PENDING: "예약신청",
  CONFIRMED: "예약확정",
  CANCELLED: "예약취소",
};

export const STATUS_COLOR_CLASS: Record<string, string> = {
  AVAILABLE: "bg-status-available/10 text-status-available border-status-available/30",
  PENDING: "bg-status-pending/10 text-status-pending border-status-pending/30",
  CONFIRMED: "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/30",
  CANCELLED: "bg-status-cancelled/10 text-status-cancelled border-status-cancelled/30",
};

export function maskPhone(phone: string): string {
  // 관리자 목록 화면 등에서 필요 시 사용 (현재 정책상 관리자는 전체 번호를 볼 수 있으므로 기본 미사용).
  return phone.replace(/(\d{3})-?(\d{2,4})-?(\d{4})/, "$1-****-$3");
}
