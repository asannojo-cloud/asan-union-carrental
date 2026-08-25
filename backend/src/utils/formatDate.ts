/** 에러 메시지 등에 쓰는 "YYYY-MM-DD" → "M월 D일" 표시용 변환 (날짜 문자열만 다뤄 타임존 영향 없음). */
export function formatDateKorean(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}월 ${d}일`;
}
