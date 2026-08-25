/** 월간 캘린더 그리드 계산. Date 객체의 UTC 필드만 사용해 달력 날짜 자체를 다루므로 타임존 영향이 없다. */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** 해당 연/월의 달력 그리드(일요일 시작, 6주 x 7일)를 생성한다. 다른 달의 날짜는 null. */
export function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDay.getUTCDay(); // 0=일
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** "YYYY-MM-DD"에 days일을 더한 날짜 문자열을 반환한다 (순수 날짜 계산, 타임존 영향 없음). */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** start~end(포함) 사이 날짜 문자열 목록. */
export function dateRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  let cur = startDateStr;
  while (cur <= endDateStr) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}
