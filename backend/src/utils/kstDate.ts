/**
 * 대한민국 표준시(KST, Asia/Seoul, UTC+9 고정) 기준 날짜 처리 유틸.
 * PRD 29절 — 서버가 UTC로 동작하더라도 예약 날짜 계산은 항상 KST 기준이어야 하며,
 * 시간대 차이로 날짜가 하루 밀리는 오류가 없어야 한다.
 *
 * 예약 날짜(rental_date)는 DB에 DATE 타입 "YYYY-MM-DD" 문자열로만 저장/취급하고
 * (db/pool.ts의 타입 파서 참고) JS Date 객체로 왕복 변환하지 않는 것이 원칙이다.
 * 오늘 날짜 판정, 요일 판정 등 "지금 몇 시인지"가 필요한 곳에서만 아래 유틸을 사용한다.
 */

const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

/** 서버 시각(어느 타임존이든)을 KST 기준 "YYYY-MM-DD"로 변환한다. */
export function todayKST(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" 형식이며 실제로 존재하는 달력 날짜인지 확인한다 (예: 2026-02-30은 거부). */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * "YYYY-MM-DD" 날짜 문자열의 요일 코드를 계산한다.
 * 달력 날짜 자체의 요일 계산이므로 UTC 기준 Date 연산을 써도 타임존 오차가 없다
 * (시각이 아니라 순수 날짜 값만 다루기 때문).
 */
export function weekdayOf(dateStr: string): WeekdayCode {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_CODES[dt.getUTCDay()];
}

/** 오늘(KST)보다 이전 날짜인지 확인한다. */
export function isPastDateKST(dateStr: string): boolean {
  return dateStr < todayKST();
}

/** 예약번호 등에 쓰는 "YYYYMMDD" 형태 (KST 기준 오늘). */
export function todayKSTCompact(): string {
  return todayKST().replace(/-/g, "");
}

/** start~end(둘 다 포함) 사이의 "YYYY-MM-DD" 날짜 목록을 순서대로 반환한다. 순수 날짜 계산이라 타임존 영향이 없다. */
export function dateRange(startDateStr: string, endDateStr: string): string[] {
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  const dates: string[] = [];
  for (let t = start; t <= end; t += 86400000) {
    const dt = new Date(t);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
  }
  return dates;
}
